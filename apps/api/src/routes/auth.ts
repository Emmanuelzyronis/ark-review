import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { db } from '../db/client.js'
import { z } from 'zod'

const registerSchema = z.object({
  login: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/api/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body)

      // Check if email already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [body.email])
      if (existing.rows.length > 0) {
        return reply.code(409).send({ error: 'Email already registered' })
      }

      const password_hash = await bcrypt.hash(body.password, 12)

      const result = await db.query(
        `INSERT INTO users (login, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, login, email, avatar_url, created_at`,
        [body.login, body.email, password_hash]
      )

      const user = result.rows[0]
      const token = fastify.jwt.sign({ id: user.id, email: user.email, login: user.login })

      return reply.code(201).send({ token, user })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation failed', details: err.errors })
      }
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Registration failed' })
    }
  })

  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body)

      const result = await db.query(
        'SELECT id, login, email, password_hash, avatar_url, created_at FROM users WHERE email = $1',
        [body.email]
      )

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const user = result.rows[0]

      if (!user.password_hash) {
        return reply.code(401).send({ error: 'Please sign in with GitHub' })
      }

      const valid = await bcrypt.compare(body.password, user.password_hash)
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Update last_seen
      await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id])

      const token = fastify.jwt.sign({ id: user.id, email: user.email, login: user.login })

      const { password_hash: _, ...safeUser } = user
      return reply.send({ token, user: safeUser })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation failed', details: err.errors })
      }
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Login failed' })
    }
  })

  // GET /api/auth/me
  fastify.get('/api/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as { id: string }
      const result = await db.query(
        'SELECT id, login, email, avatar_url, installation_id, created_at, last_seen_at FROM users WHERE id = $1',
        [payload.id]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.send({ user: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch user' })
    }
  })

  // POST /api/auth/logout
  fastify.post('/api/auth/logout', async (_request, reply) => {
    return reply.send({ message: 'Logged out' })
  })
}
