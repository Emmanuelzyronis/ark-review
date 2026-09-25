import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { analyzeCodeDiff } from '../services/ai.service.js'

export default async function webhookRoutes(fastify: FastifyInstance) {
  // POST /webhooks/github — GitHub App webhook handler
  fastify.post('/webhooks/github', async (request, reply) => {
    const event = request.headers['x-github-event'] as string
    const payload = request.body as Record<string, unknown>

    fastify.log.info({ event }, 'GitHub webhook received')

    try {
      if (event === 'pull_request') {
        const action = payload.action as string
        if (action === 'opened' || action === 'synchronize') {
          await handlePREvent(fastify, payload)
        }
      } else if (event === 'installation') {
        await handleInstallationEvent(fastify, payload)
      } else if (event === 'issue_comment' || event === 'pull_request_review_comment') {
        await handleCommentEvent(fastify, payload)
      }

      return reply.code(200).send({ ok: true })
    } catch (err) {
      fastify.log.error(err, 'Webhook processing error')
      return reply.code(500).send({ error: 'Webhook processing failed' })
    }
  })

  // GET /webhooks/github/setup — OAuth callback
  fastify.get('/webhooks/github/setup', async (request, reply) => {
    const { installation_id, setup_action } = request.query as {
      installation_id?: string
      setup_action?: string
    }
    fastify.log.info({ installation_id, setup_action }, 'GitHub App setup callback')
    return reply.redirect(`${process.env.FRONTEND_URL}/onboarding?installation_id=${installation_id || ''}`)
  })
}

async function handleInstallationEvent(fastify: FastifyInstance, payload: Record<string, unknown>) {
  const action = payload.action as string
  const installation = payload.installation as Record<string, unknown>

  if (action === 'created') {
    const account = installation.account as Record<string, unknown>
    await db.query(
      `INSERT INTO installations (github_installation_id, github_account_login, github_account_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (github_installation_id) DO UPDATE SET updated_at = NOW()`,
      [installation.id, account.login, account.type]
    )

    // Register repositories
    const repos = (payload.repositories as Record<string, unknown>[]) || []
    for (const repo of repos) {
      const installResult = await db.query(
        'SELECT id FROM installations WHERE github_installation_id = $1',
        [installation.id]
      )
      if (installResult.rows.length > 0) {
        await db.query(
          `INSERT INTO repositories (installation_id, github_repo_id, owner, name, full_name)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (github_repo_id) DO NOTHING`,
          [installResult.rows[0].id, repo.id, account.login, repo.name, repo.full_name]
        )
      }
    }
  }
}

async function handlePREvent(fastify: FastifyInstance, payload: Record<string, unknown>) {
  const pr = payload.pull_request as Record<string, unknown>
  const repoData = payload.repository as Record<string, unknown>

  const repoResult = await db.query(
    'SELECT r.id, r.installation_id FROM repositories r WHERE r.github_repo_id = $1',
    [repoData.id]
  )

  if (repoResult.rows.length === 0) {
    fastify.log.warn({ repo_id: repoData.id }, 'Repository not found for webhook')
    return
  }

  const repoId = repoResult.rows[0].id
  const head = pr.head as Record<string, unknown>
  const base = pr.base as Record<string, unknown>
  const user = pr.user as Record<string, unknown>

  // Upsert PR
  const prResult = await db.query(
    `INSERT INTO pull_requests (repo_id, github_pr_number, github_pr_id, title, author_login, base_branch, head_branch, head_sha, pr_state, lines_added, lines_deleted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10)
     ON CONFLICT (repo_id, github_pr_number) DO UPDATE SET
       head_sha = EXCLUDED.head_sha, pr_state = EXCLUDED.pr_state, updated_at = NOW()
     RETURNING id`,
    [repoId, pr.number, pr.id, pr.title, user.login, (base as Record<string, unknown>).ref,
     (head as Record<string, unknown>).ref, (head as Record<string, unknown>).sha, pr.additions || 0, pr.deletions || 0]
  )

  const prId = prResult.rows[0].id
  fastify.log.info({ prId, prNumber: pr.number }, 'PR upserted, triggering review')

  // Trigger review pipeline (would fetch diff from GitHub API in production)
  const mockDiff = `diff --git a/src/api.ts b/src/api.ts\n+// PR: ${pr.title}`
  await triggerReviewPipeline(fastify, prId, repoId, mockDiff, pr.title as string, pr.body as string || '')
}

async function handleCommentEvent(fastify: FastifyInstance, payload: Record<string, unknown>) {
  const comment = payload.comment as Record<string, unknown>
  const prData = payload.pull_request || payload.issue as Record<string, unknown>
  const repoData = payload.repository as Record<string, unknown>
  const body = comment.body as string

  // Detect questions directed at ArkReview
  const isQuestion = body.includes('@arkreview') || body.includes('?')
  if (!isQuestion) return

  const repoResult = await db.query(
    `SELECT r.id FROM repositories r WHERE r.github_repo_id = $1`,
    [(repoData as Record<string, unknown>).id]
  )
  if (repoResult.rows.length === 0) return

  fastify.log.info({ comment_id: comment.id }, 'Question comment detected, queuing response')
}

async function triggerReviewPipeline(
  fastify: FastifyInstance,
  prId: string,
  repoId: string,
  diff: string,
  prTitle: string,
  prDescription: string
): Promise<void> {
  const reviewResult = await db.query(
    `INSERT INTO reviews (pr_id, repo_id, review_status) VALUES ($1, $2, 'in_progress') RETURNING id`,
    [prId, repoId]
  )
  const reviewId = reviewResult.rows[0].id

  try {
    const configResult = await db.query(
      'SELECT strictness_level, focus_areas FROM repository_configs WHERE repo_id = $1',
      [repoId]
    )
    const config = configResult.rows[0] || { strictness_level: 'medium', focus_areas: ['security', 'performance', 'architecture'] }

    const result = await analyzeCodeDiff(diff, prTitle, prDescription, '', config)

    await db.query(
      `UPDATE reviews SET severity_score = $1, severity_label = $2,
        critical_count = $3, high_count = $4, low_count = $5, info_count = $6,
        architectural_summary = $7, review_status = 'completed', updated_at = NOW()
       WHERE id = $8`,
      [result.severity_score, result.severity_label,
       result.issues.filter(i => i.severity === 'Critical').length,
       result.issues.filter(i => i.severity === 'High').length,
       result.issues.filter(i => i.severity === 'Low').length,
       result.issues.filter(i => i.severity === 'Info').length,
       result.architectural_summary, reviewId]
    )

    for (const issue of result.issues) {
      await db.query(
        `INSERT INTO review_issues (review_id, issue_type, severity, file_path, description, evidence, recommended_fix)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, issue.type, issue.severity, issue.file_path, issue.description, issue.evidence || null, issue.recommended_fix || null]
      )
    }

    await db.query(
      `INSERT INTO voice_walkthroughs (review_id, generation_status, transcript_json)
       VALUES ($1, 'ready', $2)
       ON CONFLICT (review_id) DO UPDATE SET generation_status = 'ready'`,
      [reviewId, JSON.stringify([{ text: result.voice_script, start: 0, end: 90000, confidence: 1 }])]
    )
  } catch (err) {
    fastify.log.error(err)
    await db.query(`UPDATE reviews SET review_status = 'failed' WHERE id = $1`, [reviewId])
  }
}
