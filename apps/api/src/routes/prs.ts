import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { authenticate } from './auth.js'
import { analyzeCodeDiff } from '../services/ai.service.js'
import { z } from 'zod'

const prCreateSchema = z.object({
  github_pr_number: z.number(),
  github_pr_id: z.number().optional(),
  title: z.string(),
  author_login: z.string(),
  base_branch: z.string().default('main'),
  head_branch: z.string(),
  head_sha: z.string().optional(),
  pr_state: z.enum(['open', 'closed', 'merged']).default('open'),
  lines_added: z.number().default(0),
  lines_deleted: z.number().default(0),
  files_changed: z.number().default(0),
  diff: z.string().optional(),
})

const reviewActionSchema = z.object({
  review_body: z.string().optional(),
})

export default async function prRoutes(fastify: FastifyInstance) {
  // GET /api/repos/:owner/:repo/prs
  fastify.get('/api/repos/:owner/:repo/prs', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    const { sort = 'severity', order = 'desc', state = 'open' } = request.query as {
      sort?: string; order?: string; state?: string
    }

    try {
      const repoResult = await db.query(
        'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
        [owner, repo]
      )
      if (repoResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      const repoId = repoResult.rows[0].id

      const sortCol = sort === 'severity' ? 'rv.severity_score' :
                      sort === 'age' ? 'pr.opened_at' : 'pr.updated_at'
      const orderDir = order === 'asc' ? 'ASC' : 'DESC'
      const stateFilter = state === 'all' ? '' : `AND pr.pr_state = '${state}'`

      const result = await db.query(
        `SELECT pr.*,
          rv.id as review_id,
          rv.severity_score,
          rv.severity_label,
          rv.critical_count,
          rv.high_count,
          rv.low_count,
          rv.info_count,
          rv.review_status,
          rv.architectural_summary,
          vw.generation_status as voice_status,
          vw.audio_url,
          vw.duration_seconds
         FROM pull_requests pr
         LEFT JOIN LATERAL (
           SELECT * FROM reviews WHERE pr_id = pr.id ORDER BY created_at DESC LIMIT 1
         ) rv ON TRUE
         LEFT JOIN voice_walkthroughs vw ON vw.review_id = rv.id
         WHERE pr.repo_id = $1 ${stateFilter}
         ORDER BY ${sortCol} ${orderDir} NULLS LAST`,
        [repoId]
      )

      return reply.send({ prs: result.rows })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch PRs' })
    }
  })

  // POST /api/repos/:owner/:repo/prs — create PR record (for demo/webhook simulation)
  fastify.post('/api/repos/:owner/:repo/prs', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo } = request.params as { owner: string; repo: string }
    try {
      const body = prCreateSchema.parse(request.body)
      const repoResult = await db.query(
        'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
        [owner, repo]
      )
      if (repoResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Repository not found' })
      }
      const repoId = repoResult.rows[0].id

      const result = await db.query(
        `INSERT INTO pull_requests (repo_id, github_pr_number, github_pr_id, title, author_login, base_branch, head_branch, head_sha, pr_state, lines_added, lines_deleted, files_changed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (repo_id, github_pr_number) DO UPDATE SET
           title = EXCLUDED.title, updated_at = NOW()
         RETURNING *`,
        [repoId, body.github_pr_number, body.github_pr_id || 0, body.title, body.author_login,
         body.base_branch, body.head_branch, body.head_sha || '', body.pr_state,
         body.lines_added, body.lines_deleted, body.files_changed]
      )

      const pr = result.rows[0]

      // Trigger review pipeline if diff provided
      if (body.diff) {
        triggerReview(fastify, pr.id, repoId, body.diff, body.title, '').catch(err =>
          fastify.log.error(err, 'Background review failed')
        )
      }

      return reply.code(201).send({ pr })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation failed', details: err.errors })
      }
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to create PR' })
    }
  })

  // GET /api/repos/:owner/:repo/prs/:prNumber
  fastify.get('/api/repos/:owner/:repo/prs/:prNumber', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    try {
      const result = await db.query(
        `SELECT pr.*,
          rv.id as review_id,
          rv.severity_score, rv.severity_label,
          rv.critical_count, rv.high_count, rv.low_count, rv.info_count,
          rv.review_status, rv.architectural_summary,
          vw.audio_url, vw.duration_seconds, vw.generation_status as voice_status,
          vw.transcript_json
         FROM pull_requests pr
         JOIN repositories r ON pr.repo_id = r.id
         LEFT JOIN LATERAL (
           SELECT * FROM reviews WHERE pr_id = pr.id ORDER BY created_at DESC LIMIT 1
         ) rv ON TRUE
         LEFT JOIN voice_walkthroughs vw ON vw.review_id = rv.id
         WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3`,
        [owner, repo, parseInt(prNumber)]
      )
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'PR not found' })
      }
      return reply.send({ pr: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch PR' })
    }
  })

  // GET /api/repos/:owner/:repo/prs/:prNumber/issues
  fastify.get('/api/repos/:owner/:repo/prs/:prNumber/issues', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    const { severity, type: issueType } = request.query as { severity?: string; type?: string }
    try {
      let query = `
        SELECT ri.* FROM review_issues ri
        JOIN reviews rv ON ri.review_id = rv.id
        JOIN pull_requests pr ON rv.pr_id = pr.id
        JOIN repositories r ON pr.repo_id = r.id
        WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3`
      const params: unknown[] = [owner, repo, parseInt(prNumber)]

      if (severity) {
        query += ` AND ri.severity = $${params.length + 1}`
        params.push(severity)
      }
      if (issueType) {
        query += ` AND ri.issue_type = $${params.length + 1}`
        params.push(issueType)
      }
      query += ' ORDER BY CASE ri.severity WHEN \'Critical\' THEN 1 WHEN \'High\' THEN 2 WHEN \'Low\' THEN 3 ELSE 4 END, ri.created_at'

      const result = await db.query(query, params)
      return reply.send({ issues: result.rows })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch issues' })
    }
  })

  // POST /api/repos/:owner/:repo/prs/:prNumber/review — re-trigger review
  fastify.post('/api/repos/:owner/:repo/prs/:prNumber/review', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    const { diff = '', description = '' } = request.body as { diff?: string; description?: string }
    try {
      const prResult = await db.query(
        `SELECT pr.id, pr.repo_id, pr.title FROM pull_requests pr
         JOIN repositories r ON pr.repo_id = r.id
         WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3`,
        [owner, repo, parseInt(prNumber)]
      )
      if (prResult.rows.length === 0) {
        return reply.code(404).send({ error: 'PR not found' })
      }
      const pr = prResult.rows[0]

      // Start pipeline in background
      triggerReview(fastify, pr.id, pr.repo_id, diff, pr.title, description).catch(err =>
        fastify.log.error(err, 'Review pipeline failed')
      )

      return reply.send({ message: 'Review pipeline triggered', pr_id: pr.id })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to trigger review' })
    }
  })

  // POST /api/repos/:owner/:repo/prs/:prNumber/approve
  fastify.post('/api/repos/:owner/:repo/prs/:prNumber/approve', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    try {
      const body = reviewActionSchema.parse(request.body)
      const user = request.user as { id: string; login: string }

      const prResult = await db.query(
        `SELECT pr.id, pr.repo_id, rv.id as review_id, rv.architectural_summary
         FROM pull_requests pr
         JOIN repositories r ON pr.repo_id = r.id
         LEFT JOIN LATERAL (SELECT * FROM reviews WHERE pr_id = pr.id ORDER BY created_at DESC LIMIT 1) rv ON TRUE
         WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3`,
        [owner, repo, parseInt(prNumber)]
      )
      if (prResult.rows.length === 0) {
        return reply.code(404).send({ error: 'PR not found' })
      }

      const pr = prResult.rows[0]
      const reviewBody = body.review_body || pr.architectural_summary || 'LGTM — ArkReview approved.'

      // Record the review action
      await db.query(
        `INSERT INTO review_history (repo_id, pr_id, review_id, action, actor_login, review_body)
         VALUES ($1, $2, $3, 'approved', $4, $5)`,
        [pr.repo_id, pr.id, pr.review_id, user.login, reviewBody]
      )

      return reply.send({
        message: `PR #${prNumber} approved`,
        review_body: reviewBody,
        action: 'approved',
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to approve PR' })
    }
  })

  // POST /api/repos/:owner/:repo/prs/:prNumber/request-changes
  fastify.post('/api/repos/:owner/:repo/prs/:prNumber/request-changes', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    try {
      const body = reviewActionSchema.parse(request.body)
      const user = request.user as { id: string; login: string }

      const prResult = await db.query(
        `SELECT pr.id, pr.repo_id, rv.id as review_id, rv.architectural_summary,
          (SELECT STRING_AGG('- ' || severity || ': ' || description, E'\n') FROM review_issues WHERE review_id = rv.id AND severity IN ('Critical', 'High')) as issues_summary
         FROM pull_requests pr
         JOIN repositories r ON pr.repo_id = r.id
         LEFT JOIN LATERAL (SELECT * FROM reviews WHERE pr_id = pr.id ORDER BY created_at DESC LIMIT 1) rv ON TRUE
         WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3`,
        [owner, repo, parseInt(prNumber)]
      )
      if (prResult.rows.length === 0) {
        return reply.code(404).send({ error: 'PR not found' })
      }

      const pr = prResult.rows[0]
      const defaultBody = `ArkReview has flagged the following issues that need to be addressed:\n\n${pr.issues_summary || 'See review for details.'}`
      const reviewBody = body.review_body || defaultBody

      await db.query(
        `INSERT INTO review_history (repo_id, pr_id, review_id, action, actor_login, review_body)
         VALUES ($1, $2, $3, 'changes_requested', $4, $5)`,
        [pr.repo_id, pr.id, pr.review_id, user.login, reviewBody]
      )

      return reply.send({
        message: `Changes requested on PR #${prNumber}`,
        review_body: reviewBody,
        action: 'changes_requested',
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to request changes' })
    }
  })

  // GET /api/repos/:owner/:repo/prs/:prNumber/voice
  fastify.get('/api/repos/:owner/:repo/prs/:prNumber/voice', { preHandler: [authenticate] }, async (request, reply) => {
    const { owner, repo, prNumber } = request.params as { owner: string; repo: string; prNumber: string }
    try {
      const result = await db.query(
        `SELECT vw.* FROM voice_walkthroughs vw
         JOIN reviews rv ON vw.review_id = rv.id
         JOIN pull_requests pr ON rv.pr_id = pr.id
         JOIN repositories r ON pr.repo_id = r.id
         WHERE r.owner = $1 AND r.name = $2 AND pr.github_pr_number = $3
         ORDER BY rv.created_at DESC LIMIT 1`,
        [owner, repo, parseInt(prNumber)]
      )
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Voice walkthrough not found' })
      }
      return reply.send({ voice: result.rows[0] })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch voice walkthrough' })
    }
  })
}

// Internal: run the review pipeline
async function triggerReview(
  fastify: FastifyInstance,
  prId: string,
  repoId: string,
  diff: string,
  prTitle: string,
  prDescription: string
): Promise<void> {
  // Create or update review record
  const reviewResult = await db.query(
    `INSERT INTO reviews (pr_id, repo_id, review_status)
     VALUES ($1, $2, 'in_progress')
     RETURNING id`,
    [prId, repoId]
  )
  const reviewId = reviewResult.rows[0].id

  try {
    // Get repo config
    const configResult = await db.query(
      'SELECT strictness_level, focus_areas FROM repository_configs WHERE repo_id = $1',
      [repoId]
    )
    const config = configResult.rows[0] || { strictness_level: 'medium', focus_areas: ['security', 'performance', 'architecture'] }

    // Run AI analysis
    const analysisResult = await analyzeCodeDiff(diff, prTitle, prDescription, '', config)

    // Save review
    await db.query(
      `UPDATE reviews SET
        severity_score = $1, severity_label = $2,
        critical_count = $3, high_count = $4, low_count = $5, info_count = $6,
        architectural_summary = $7, review_status = 'completed', updated_at = NOW()
       WHERE id = $8`,
      [
        analysisResult.severity_score,
        analysisResult.severity_label,
        analysisResult.issues.filter(i => i.severity === 'Critical').length,
        analysisResult.issues.filter(i => i.severity === 'High').length,
        analysisResult.issues.filter(i => i.severity === 'Low').length,
        analysisResult.issues.filter(i => i.severity === 'Info').length,
        analysisResult.architectural_summary,
        reviewId,
      ]
    )

    // Save issues
    for (const issue of analysisResult.issues) {
      await db.query(
        `INSERT INTO review_issues (review_id, issue_type, severity, file_path, line_start, line_end, description, evidence, recommended_fix)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [reviewId, issue.type, issue.severity, issue.file_path, issue.line_start || null,
         issue.line_end || null, issue.description, issue.evidence || null, issue.recommended_fix || null]
      )
    }

    // Create voice walkthrough record (placeholder — real TTS would use AssemblyAI)
    await db.query(
      `INSERT INTO voice_walkthroughs (review_id, generation_status, transcript_json)
       VALUES ($1, 'ready', $2)
       ON CONFLICT (review_id) DO UPDATE SET generation_status = 'ready', updated_at = NOW()`,
      [reviewId, JSON.stringify([{ text: analysisResult.voice_script, start: 0, end: 90000, confidence: 1 }])]
    )

  } catch (err) {
    fastify.log.error(err, 'Review pipeline error')
    await db.query(
      `UPDATE reviews SET review_status = 'failed', updated_at = NOW() WHERE id = $1`,
      [reviewId]
    )
  }
}
