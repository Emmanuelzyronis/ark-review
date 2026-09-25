import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import dotenv from 'dotenv'

dotenv.config()

import authRoutes from './routes/auth.js'
import repoRoutes from './routes/repos.js'
import prRoutes from './routes/prs.js'
import webhookRoutes from './routes/webhooks.js'

const PORT = parseInt(process.env.PORT || '3001', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'info',
  },
})

async function bootstrap() {
  // Plugins
  await fastify.register(cors, {
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'ark-review-dev-secret-min-32-chars-long',
    sign: { expiresIn: process.env.JWT_EXPIRY || '7d' },
  })

  await fastify.register(multipart)

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))

  // Routes
  await fastify.register(authRoutes)
  await fastify.register(repoRoutes)
  await fastify.register(prRoutes)
  await fastify.register(webhookRoutes)

  // Team analytics (cross-repo)
  fastify.get('/api/analytics/team', { preHandler: [async (req, reply) => {
    try { await req.jwtVerify() } catch { reply.code(401).send({ error: 'Unauthorized' }) }
  }]}, async (request, reply) => {
    try {
      const user = request.user as { id: string }
      const result = await db.query(
        `SELECT
          COUNT(DISTINCT rv.id) as total_reviews,
          AVG(rv.critical_count + rv.high_count + rv.low_count) as avg_issues_per_pr,
          COUNT(DISTINCT pr.repo_id) as active_repos
         FROM reviews rv
         JOIN pull_requests pr ON rv.pr_id = pr.id
         JOIN repositories r ON pr.repo_id = r.id
         JOIN installations i ON r.installation_id = i.id
         JOIN users u ON u.installation_id = i.id
         WHERE u.id = $1`,
        [user.id]
      )
      return reply.send({ analytics: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch team analytics' })
    }
  })

  // Index repo (trigger embeddings)
  fastify.post('/api/repos/:installationId/index', { preHandler: [async (req, reply) => {
    try { await req.jwtVerify() } catch { reply.code(401).send({ error: 'Unauthorized' }) }
  }]}, async (request, reply) => {
    const { installationId } = request.params as { installationId: string }
    try {
      await db.query(
        `UPDATE repositories SET index_status = 'indexing', index_progress_pct = 0, updated_at = NOW()
         WHERE installation_id = $1`,
        [installationId]
      )
      // Simulate progress update (in production: queue a worker job)
      setTimeout(async () => {
        await db.query(
          `UPDATE repositories SET index_status = 'ready', index_progress_pct = 100,
           files_indexed = 42, last_indexed_at = NOW(), updated_at = NOW()
           WHERE installation_id = $1`,
          [installationId]
        ).catch(() => {})
      }, 5000)

      return reply.send({ message: 'Indexing started', installation_id: installationId })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to start indexing' })
    }
  })

  // Index status
  fastify.get('/api/repos/:installationId/index/status', { preHandler: [async (req, reply) => {
    try { await req.jwtVerify() } catch { reply.code(401).send({ error: 'Unauthorized' }) }
  }]}, async (request, reply) => {
    const { installationId } = request.params as { installationId: string }
    try {
      const result = await db.query(
        `SELECT index_status, index_progress_pct, files_indexed, last_indexed_at
         FROM repositories WHERE installation_id = $1 AND is_active = TRUE LIMIT 1`,
        [installationId]
      )
      return reply.send({ status: result.rows[0] || { index_status: 'pending', index_progress_pct: 0 } })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch index status' })
    }
  })

  // Start server
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  fastify.log.info(`ArkReview API running on port ${PORT}`)
}

// Import db for inline routes
import { db } from './db/client.js'

bootstrap().catch(err => {
  console.error('Fatal error starting server:', err)
  process.exit(1)
})
