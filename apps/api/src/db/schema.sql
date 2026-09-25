-- ArkReview Database Schema
-- Run this once to initialize the database

-- Enable pgvector extension for codebase embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_user_id BIGINT UNIQUE,
  login TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  installation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Installations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_installation_id BIGINT UNIQUE NOT NULL,
  github_account_login TEXT NOT NULL,
  github_account_type TEXT NOT NULL DEFAULT 'User',
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from users to installations
ALTER TABLE users ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES installations(id);

-- ─── Repositories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  github_repo_id BIGINT UNIQUE NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  index_status TEXT NOT NULL DEFAULT 'pending' CHECK (index_status IN ('pending', 'indexing', 'ready', 'failed')),
  index_progress_pct INTEGER DEFAULT 0,
  files_indexed INTEGER DEFAULT 0,
  last_indexed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Repository Configs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repository_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
  strictness_level TEXT NOT NULL DEFAULT 'medium' CHECK (strictness_level IN ('low', 'medium', 'high', 'strict')),
  focus_areas TEXT[] DEFAULT ARRAY['security', 'performance', 'architecture'],
  ignored_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_approve_threshold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pull Requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_pr_number INTEGER NOT NULL,
  github_pr_id BIGINT,
  title TEXT NOT NULL,
  author_login TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  head_branch TEXT NOT NULL,
  head_sha TEXT,
  pr_state TEXT NOT NULL DEFAULT 'open' CHECK (pr_state IN ('open', 'closed', 'merged')),
  lines_added INTEGER DEFAULT 0,
  lines_deleted INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, github_pr_number)
);

-- ─── Reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  pipeline_run_id TEXT,
  severity_score INTEGER DEFAULT 0,
  severity_label TEXT NOT NULL DEFAULT 'Info' CHECK (severity_label IN ('Critical', 'High', 'Low', 'Info')),
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  architectural_summary TEXT,
  github_comment_id BIGINT,
  github_review_id BIGINT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Review Issues ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Low', 'Info')),
  file_path TEXT NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  description TEXT NOT NULL,
  evidence TEXT,
  recommended_fix TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Voice Walkthroughs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_walkthroughs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE UNIQUE,
  audio_url TEXT,
  duration_seconds INTEGER,
  transcript_json JSONB,
  assemblyai_request_id TEXT,
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Codebase Embeddings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codebase_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER DEFAULT 0,
  file_language TEXT,
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, file_path, chunk_index)
);

-- ─── Review History ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id),
  action TEXT NOT NULL,
  actor_login TEXT,
  review_body TEXT,
  github_review_id BIGINT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PR Comments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pr_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  github_comment_id BIGINT UNIQUE,
  author_login TEXT NOT NULL,
  body TEXT NOT NULL,
  is_question BOOLEAN DEFAULT FALSE,
  arkreview_response TEXT,
  arkreview_response_comment_id BIGINT,
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pipeline Runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_json JSONB,
  metadata_json JSONB
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_repositories_installation ON repositories(installation_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo ON pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_state ON pull_requests(pr_state);
CREATE INDEX IF NOT EXISTS idx_reviews_pr ON reviews(pr_id);
CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews(repo_id);
CREATE INDEX IF NOT EXISTS idx_review_issues_review ON review_issues(review_id);
CREATE INDEX IF NOT EXISTS idx_review_issues_severity ON review_issues(severity);
CREATE INDEX IF NOT EXISTS idx_codebase_embeddings_repo ON codebase_embeddings(repo_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pr ON pipeline_runs(pr_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_codebase_embeddings_vector
  ON codebase_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
