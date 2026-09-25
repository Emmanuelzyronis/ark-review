import { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db/client.js'
import { authenticate } from './auth.js'
import { z } from 'zod'

const configSchema = z.object({
  strictness_level: z.enum(['low', 'medium', 'high', 'strict']).optional(),
  focus_areas: z.array(z.string()).optional(),
  ignored_patterns: z.array(z.string()).optional(),
  auto_approve_threshold: z.number().min(0).max(100).optional(),
})

export default async function repoRoutes(fastify: FastifyInstance) {
  // GET /api/repos — list repos for authenticated user
  fastify.get('/api/repos', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const user = request.user as { id: string }
      const result = await db.query(
        `SELECT r.*,
          (SELECT COUNT(*) FROM pull_requests pr WHERE pr.repo_id = r.id AND pr.pr_state = 'open') as open_pr_count,
          (SELECT COUNT(*) FROM reviews rv WHERE rv.repo_id = r.id) as total_reviews
         FROM repositories r
         JOIN installations i ON r.installation_id = i.id
         JOIN users u ON u.installation_id = i.id
         WHERE u.id = $1 AND r.is_active = TRUE
         ORDER BY r.updated_at DESC`,
        [user.id]
      )
      return reply.send({ repos: result.rows })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch repositories' })
    }
  })

  // GET /api/repos/:owner/:repo
  fastify.get('/api/repos/:owner/:repo', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      const result = await db.query(
        `SELECT r.*, rc.strictness_level, rc.focus_areas, rc.ignored_patterns
         FROM repositories r
         LEFT JOIN repository_configs rc ON rc.repo_id = r.id
         WHERE r.owner = $1 AND r.name = $2 AND r.is_active = TRUE`,
        [owner, repo]
      )
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      return reply.send({ repo: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch repository' })
    }
  })

  // POST /api/repos — create/register a repository (for demo/testing)
  fastify.post('/api/repos', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const user = request.user as { id: string }
      const body = request.body as {
        owner: string
        name: string
        github_repo_id?: number
        default_branch?: string
      }

      // Get or create installation for this user
      let installResult = await db.query(
        'SELECT id FROM installations WHERE id IN (SELECT installation_id FROM users WHERE id = $1)',
        [user.id]
      )

      let installationId: string
      if (installResult.rows.length === 0) {
        // Create a demo installation
        const newInstall = await db.query(
          `INSERT INTO installations (github_installation_id, github_account_login, github_account_type)
           VALUES ($1, $2, 'User') RETURNING id`,
          [Date.now(), body.owner]
        )
        installationId = newInstall.rows[0].id
        await db.query('UPDATE users SET installation_id = $1 WHERE id = $2', [installationId, user.id])
      } else {
        installationId = installResult.rows[0].id
      }

      const repoId = body.github_repo_id || Math.floor(Math.random() * 1000000)

      const result = await db.query(
        `INSERT INTO repositories (installation_id, github_repo_id, owner, name, full_name, default_branch)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (github_repo_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [installationId, repoId, body.owner, body.name, `${body.owner}/${body.name}`, body.default_branch || 'main']
      )

      // Create default config
      await db.query(
        `INSERT INTO repository_configs (repo_id) VALUES ($1) ON CONFLICT (repo_id) DO NOTHING`,
        [result.rows[0].id]
      )

      return reply.code(201).send({ repo: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to create repository' })
    }
  })

  // DELETE /api/repos/:owner/:repo
  fastify.delete('/api/repos/:owner/:repo', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      await db.query(
        `UPDATE repositories SET is_active = FALSE WHERE owner = $1 AND name = $2`,
        [owner, repo]
      )
      return reply.send({ message: 'Repository uninstalled' })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to uninstall repository' })
    }
  })

  // GET /api/repos/:owner/:repo/config
  fastify.get('/api/repos/:owner/:repo/config', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      const result = await db.query(
        `SELECT rc.* FROM repository_configs rc
         JOIN repositories r ON rc.repo_id = r.id
         WHERE r.owner = $1 AND r.name = $2`,
        [owner, repo]
      )
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Config not found' })
      }
      return reply.send({ config: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch config' })
    }
  })

  // PUT /api/repos/:owner/:repo/config
  fastify.put('/api/repos/:owner/:repo/config', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      const body = configSchema.parse(request.body)
      const repoResult = await db.query(
        'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
        [owner, repo]
      )
      if (repoResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      const repoId = repoResult.rows[0].id

      const updates: string[] = []
      const values: unknown[] = []
      let paramIdx = 1

      if (body.strictness_level) {
        updates.push(`strictness_level = $${paramIdx++}`)
        values.push(body.strictness_level)
      }
      if (body.focus_areas) {
        updates.push(`focus_areas = $${paramIdx++}`)
        values.push(body.focus_areas)
      }
      if (body.ignored_patterns) {
        updates.push(`ignored_patterns = $${paramIdx++}`)
        values.push(body.ignored_patterns)
      }
      if (body.auto_approve_threshold !== undefined) {
        updates.push(`auto_approve_threshold = $${paramIdx++}`)
        values.push(body.auto_approve_threshold)
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No valid fields to update' })
      }

      updates.push(`updated_at = NOW()`)
      values.push(repoId)

      const result = await db.query(
        `UPDATE repository_configs SET ${updates.join(', ')} WHERE repo_id = $${paramIdx} RETURNING *`,
        values
      )
      return reply.send({ config: result.rows[0] })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation failed', details: err.errors })
      }
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to update config' })
    }
  })

  // GET /api/repos/:owner/:repo/analytics
  fastify.get('/api/repos/:owner/:repo/analytics', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      const repoResult = await db.query(
        'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
        [owner, repo]
      )
      if (repoResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      const repoId = repoResult.rows[0].id

      const [reviewStats, issueStats, authorStats] = await Promise.all([
        db.query(
          `SELECT
            COUNT(*) as total_reviews,
            AVG(EXTRACT(EPOCH FROM (rv.updated_at - rv.created_at))) as avg_review_time_seconds,
            AVG(rv.critical_count + rv.high_count + rv.low_count) as avg_issues_per_pr
           FROM reviews rv WHERE rv.repo_id = $1`,
          [repoId]
        ),
        db.query(
          `SELECT issue_type, COUNT(*) as count
           FROM review_issues ri
           JOIN reviews rv ON ri.review_id = rv.id
           WHERE rv.repo_id = $1
           GROUP BY issue_type
           ORDER BY count DESC LIMIT 5`,
          [repoId]
        ),
        db.query(
          `SELECT pr.author_login as login,
            COUNT(pr.id) as pr_count,
            AVG(rv.severity_score) as avg_severity_score
           FROM pull_requests pr
           JOIN reviews rv ON rv.pr_id = pr.id
           WHERE pr.repo_id = $1
           GROUP BY pr.author_login
           ORDER BY pr_count DESC LIMIT 10`,
          [repoId]
        ),
      ])

      return reply.send({
        analytics: {
          ...reviewStats.rows[0],
          top_issue_types: issueStats.rows,
          author_stats: authorStats.rows,
        }
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch analytics' })
    }
  })

  // GET /api/repos/:owner/:repo/history
  fastify.get('/api/repos/:owner/:repo/history', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    const { page = 1, per_page = 20 } = request.query as { page?: number; per_page?: number }
    try {
      const repoResult = await db.query(
        'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
        [owner, repo]
      )
      if (repoResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      const repoId = repoResult.rows[0].id
      const offset = (Number(page) - 1) * Number(per_page)

      const result = await db.query(
        `SELECT rh.*, pr.title as pr_title, pr.github_pr_number, rv.severity_label, rv.severity_score
         FROM review_history rh
         JOIN pull_requests pr ON rh.pr_id = pr.id
         LEFT JOIN reviews rv ON rh.review_id = rv.id
         WHERE rh.repo_id = $1
         ORDER BY rh.submitted_at DESC
         LIMIT $2 OFFSET $3`,
        [repoId, per_page, offset]
      )

      const countResult = await db.query(
        'SELECT COUNT(*) FROM review_history WHERE repo_id = $1',
        [repoId]
      )

      return reply.send({
        history: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: Number(page),
        per_page: Number(per_page),
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch history' })
    }
  })
}
