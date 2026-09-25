# ArkReview Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub                                      │
│  Developer opens PR ──► Webhook POST → ArkReview GitHub App         │
│  Review comment ◄────── GitHub API   ← ArkReview posts review       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS webhook
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Fastify API (apps/api)                           │
│                                                                      │
│  POST /webhooks/github                                               │
│          │                                                           │
│          ▼                                                           │
│  ┌───────────────────────────────────────────────────┐              │
│  │              Review Pipeline                       │              │
│  │                                                    │              │
│  │  1. Diff Parse                                     │              │
│  │     └── Extract changed files, hunks, context     │              │
│  │                                                    │              │
│  │  2. Context Retrieval                              │              │
│  │     └── pgvector semantic search                  │              │
│  │         Related files, historical decisions        │              │
│  │                                                    │              │
│  │  3. Claude Analysis (Anthropic / Azure Foundry)    │              │
│  │     └── N+1 queries, error handling, security      │              │
│  │         Breaking changes, architecture debt        │              │
│  │         Severity scoring (0-100)                   │              │
│  │                                                    │              │
│  │  4. Voice Synthesis (AssemblyAI TTS)               │              │
│  │     └── 60-90s narration of PR implications        │              │
│  │         Audio URL stored in voice_walkthroughs     │              │
│  │                                                    │              │
│  │  5. GitHub Post                                    │              │
│  │     └── Structured comment with severity table     │              │
│  │         Link to voice walkthrough audio            │              │
│  └───────────────────────────────────────────────────┘              │
│                                                                      │
│  Routes:                                                             │
│  /api/auth      — JWT register/login/me                              │
│  /api/repos     — Repository CRUD                                    │
│  /api/repos/*/prs — PR list, detail, review trigger                  │
│  /api/repos/*/prs/*/approve — Post GitHub review                     │
│  /api/analytics — Team and repo analytics                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            │                                       │
            ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────────────┐
│   Neon Postgres     │               │    Next.js 15 (apps/web)     │
│   + pgvector        │               │                              │
│                     │               │  /dashboard                  │
│  users              │               │    └── Repo cards            │
│  installations      │               │                              │
│  repositories       │               │  /dashboard/[owner]/[repo]   │
│  repository_configs │               │    └── PR list table         │
│  pull_requests      │               │        Severity badges       │
│  reviews            │               │        Voice icons           │
│  review_issues      │               │                              │
│  voice_walkthroughs │               │  /review/[owner]/[repo]/[pr] │
│  codebase_embeddings│               │    └── ReviewSummaryHeader   │
│  review_history     │               │        VoicePlayer           │
│  pr_comments        │               │        IssueGroupAccordion   │
│  pipeline_runs      │               │        ReviewActionBar       │
│                     │               │                              │
│  vector(1536) index │               │  /settings/[owner]/[repo]    │
│  ivfflat cosine ops │               │    └── ConfigPanel           │
│                     │               │                              │
└─────────────────────┘               │  /analytics                  │
                                      │    └── Team analytics        │
                                      └─────────────────────────────┘
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| github_user_id | BIGINT | |
| login | TEXT | Username |
| email | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt |
| avatar_url | TEXT | |
| installation_id | UUID FK | |
| created_at | TIMESTAMPTZ | |
| last_seen_at | TIMESTAMPTZ | |

### repositories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| installation_id | UUID FK | |
| github_repo_id | BIGINT UNIQUE | |
| owner | TEXT | |
| name | TEXT | |
| full_name | TEXT | owner/name |
| default_branch | TEXT | |
| index_status | TEXT | pending/indexing/ready/failed |
| index_progress_pct | INT | 0-100 |
| files_indexed | INT | |
| last_indexed_at | TIMESTAMPTZ | |

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| pr_id | UUID FK | |
| repo_id | UUID FK | |
| severity_score | INT | 0-100 |
| severity_label | TEXT | Critical/High/Low/Info |
| critical_count | INT | |
| high_count | INT | |
| architectural_summary | TEXT | Claude summary |
| review_status | TEXT | pending/in_progress/completed/failed |

### review_issues
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| review_id | UUID FK | |
| issue_type | TEXT | n_plus_one/security/etc |
| severity | TEXT | Critical/High/Low/Info |
| file_path | TEXT | |
| line_start | INT | |
| description | TEXT | |
| evidence | TEXT | Code snippet |
| recommended_fix | TEXT | |

### codebase_embeddings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| repo_id | UUID FK | |
| file_path | TEXT | |
| chunk_index | INT | |
| chunk_text | TEXT | |
| embedding | vector(1536) | pgvector |
| file_language | TEXT | |

## API Endpoints Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /webhooks/github | None | GitHub App webhook |
| GET | /webhooks/github/setup | None | OAuth callback |
| POST | /api/auth/register | None | Create account |
| POST | /api/auth/login | None | Sign in |
| GET | /api/auth/me | JWT | Current user |
| POST | /api/auth/logout | JWT | Sign out |
| GET | /api/repos | JWT | List repos |
| POST | /api/repos | JWT | Add repo |
| GET | /api/repos/:owner/:repo | JWT | Repo detail |
| DELETE | /api/repos/:owner/:repo | JWT | Uninstall |
| GET | /api/repos/:owner/:repo/prs | JWT | List PRs |
| POST | /api/repos/:owner/:repo/prs | JWT | Create PR |
| GET | /api/repos/:owner/:repo/prs/:n | JWT | PR detail |
| POST | /api/repos/:owner/:repo/prs/:n/review | JWT | Trigger review |
| GET | /api/repos/:owner/:repo/prs/:n/issues | JWT | Flagged issues |
| POST | /api/repos/:owner/:repo/prs/:n/approve | JWT | Approve PR |
| POST | /api/repos/:owner/:repo/prs/:n/request-changes | JWT | Request changes |
| GET | /api/repos/:owner/:repo/prs/:n/voice | JWT | Voice walkthrough |
| GET | /api/repos/:owner/:repo/config | JWT | Repo config |
| PUT | /api/repos/:owner/:repo/config | JWT | Update config |
| GET | /api/repos/:owner/:repo/analytics | JWT | Repo analytics |
| GET | /api/repos/:owner/:repo/history | JWT | Review history |
| GET | /api/analytics/team | JWT | Team analytics |
| GET | /health | None | Health check |

## Frontend Route Map

| Route | Component | Description |
|-------|-----------|-------------|
| / | LandingPage | Marketing, install CTA |
| /auth/login | LoginPage | Email/password sign in |
| /auth/register | RegisterPage | Create account |
| /dashboard | DashboardPage | All repositories grid |
| /dashboard/[owner]/[repo] | RepoDashboardPage | PR table, severity sort |
| /review/[owner]/[repo]/[prNumber] | ReviewPage | Full review + voice |
| /settings/[owner]/[repo] | SettingsPage | Repo configuration |
| /analytics | AnalyticsPage | Team-wide analytics |
