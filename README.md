# ArkReview

**Voice-driven AI code review that catches what Copilot creates — architectural walkthroughs, not just lint comments.**

---

## The Problem

PRs sit for 24-72 hours waiting for senior engineer attention. AI tools like Cursor and Copilot generate code 5x faster than teams can review it. METR's 2026 controlled study found experienced developers are 19% slower with AI coding assistants — the bottleneck is review, not generation. CodeRabbit posts shallow text comments; no tool offers voice-driven architectural walkthroughs or detection of the architectural debt that AI-generated code silently accumulates.

## Market Value

$8.5B AI developer tools market (2026) growing at 30%+ CAGR. Cursor crossed 500K active developers in July 2026. Voice-driven code review is a completely uncontested interface.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Fastify v5 + TypeScript |
| Frontend | Next.js 15 App Router + TypeScript + Tailwind v4 |
| Database | Neon Postgres + pgvector |
| AI Review | Claude (via Azure Foundry) |
| Voice TTS | AssemblyAI |
| Pipeline | LangGraph-style sequential pipeline |
| Monorepo | Turborepo |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Emmanuelzyronis/ark-review
cd ark-review
npm install --legacy-peer-deps

# 2. Set up environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your credentials

cp apps/web/.env.example apps/web/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001

# 3. Initialize database
cd apps/api && psql $DATABASE_URL -f src/db/schema.sql

# 4. Start backend
npm run dev   # from apps/api/

# 5. Start frontend (new terminal)
npm run dev   # from apps/web/
```

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Min 32 chars JWT signing secret |
| `JWT_EXPIRY` | Token expiry (default: `7d`) |
| `ANTHROPIC_API_KEY` | Anthropic / Azure Foundry API key |
| `ANTHROPIC_BASE_URL` | Azure Foundry base URL (optional) |
| `CLAUDE_MODEL` | Model name (default: `claude-sonnet-4-6`) |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App PEM private key |
| `GITHUB_APP_WEBHOOK_SECRET` | Webhook signature secret |
| `ASSEMBLYAI_API_KEY` | AssemblyAI TTS key |
| `PORT` | API port (default: `3001`) |
| `FRONTEND_URL` | Frontend URL for CORS |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:3001`) |

---

## Architecture Overview

```
GitHub PR open/update
        ↓
Fastify webhook handler (POST /webhooks/github)
        ↓
Review Pipeline:
  1. Diff Parse — extract changed files and hunks
  2. Context Retrieval — pgvector semantic search of indexed codebase
  3. Claude Analysis — architectural review, bug detection, severity scoring
  4. Voice Synthesis — AssemblyAI TTS generates 60-90s audio narration
  5. GitHub Post — structured comment + audio link posted to PR
        ↓
Next.js Dashboard — review detail, voice player, one-click approve/request-changes
```

---

## API Endpoints

- `POST /webhooks/github` — PR open/update webhook
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/auth/me` — Current user
- `GET /api/repos` — List repositories
- `POST /api/repos` — Add repository
- `GET /api/repos/:owner/:repo/prs` — List PRs
- `POST /api/repos/:owner/:repo/prs` — Create PR
- `GET /api/repos/:owner/:repo/prs/:prNumber` — PR detail
- `POST /api/repos/:owner/:repo/prs/:prNumber/review` — Trigger review
- `GET /api/repos/:owner/:repo/prs/:prNumber/issues` — Flagged issues
- `POST /api/repos/:owner/:repo/prs/:prNumber/approve` — Approve
- `POST /api/repos/:owner/:repo/prs/:prNumber/request-changes` — Request changes
- `GET /api/repos/:owner/:repo/config` — Repo config
- `PUT /api/repos/:owner/:repo/config` — Update config
- `GET /api/repos/:owner/:repo/analytics` — Analytics
- `GET /api/analytics/team` — Team analytics
- `GET /health` — Health check

---

## Frontend Pages

- `/` — Landing page
- `/auth/login` — Sign in
- `/auth/register` — Create account
- `/dashboard` — All repositories
- `/dashboard/:owner/:repo` — PR list with severity scores
- `/review/:owner/:repo/:prNumber` — Full review with voice player
- `/settings/:owner/:repo` — Repo configuration
- `/analytics` — Team analytics

---

## Hackathon

**AMD Developer Hackathon: ACT III**
https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii

ArkReview demonstrates a LangGraph + Claude + pgvector pipeline running on AMD AI Cloud, delivering measurable latency (PR reviewed in under 60 seconds). Voice code review has never existed as a product — the demo is immediately understandable by every developer in the audience.

---

## Database Tables

- `users` — Registered users
- `installations` — GitHub App installations
- `repositories` — Connected repositories
- `repository_configs` — Per-repo review settings
- `pull_requests` — PR records
- `reviews` — AI review results
- `review_issues` — Individual flagged issues
- `voice_walkthroughs` — Generated audio metadata
- `codebase_embeddings` — pgvector index (1536-dim)
- `review_history` — Approve/request-changes history
- `pr_comments` — Comment Q&A threads
- `pipeline_runs` — Pipeline execution logs
