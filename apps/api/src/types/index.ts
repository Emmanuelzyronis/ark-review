import { FastifyRequest, FastifyReply } from 'fastify'

export interface JWTPayload {
  id: string
  email: string
  login: string
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload
}

export type Handler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>
