// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  github_user_id: number | null
  login: string
  email: string
  avatar_url: string | null
  installation_id: string | null
  created_at: string
  last_seen_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

// ─── Installations ───────────────────────────────────────────────────────────
export interface Installation {
  id: string
  github_installation_id: number
  github_account_login: string
  github_account_type: string
  created_at: string
  updated_at: string
}

// ─── Repositories ────────────────────────────────────────────────────────────
export type IndexStatus = 'pending' | 'indexing' | 'ready' | 'failed'
export type SeverityLabel = 'Critical' | 'High' | 'Low' | 'Info'

export interface Repository {
  id: string
  installation_id: string
  github_repo_id: number
  owner: string
  name: string
  full_name: string
  default_branch: string
  index_status: IndexStatus
  index_progress_pct: number
  files_indexed: number
  last_indexed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RepositoryConfig {
  id: string
  repo_id: string
  strictness_level: string
  focus_areas: string[]
  ignored_patterns: string[]
  auto_approve_threshold: number
  created_at: string
  updated_at: string
}

// ─── Pull Requests ───────────────────────────────────────────────────────────
export type PRState = 'open' | 'closed' | 'merged'

export interface PullRequest {
  id: string
  repo_id: string
  github_pr_number: number
  github_pr_id: number
  title: string
  author_login: string
  base_branch: string
  head_branch: string
  head_sha: string
  pr_state: PRState
  lines_added: number
  lines_deleted: number
  files_changed: number
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type IssueType = 'n_plus_one' | 'missing_error_handling' | 'security' | 'breaking_change' | 'architecture' | 'performance' | 'style'

export interface Review {
  id: string
  pr_id: string
  repo_id: string
  pipeline_run_id: string | null
  severity_score: number
  severity_label: SeverityLabel
  critical_count: number
  high_count: number
  low_count: number
  info_count: number
  architectural_summary: string | null
  github_comment_id: number | null
  github_review_id: number | null
  review_status: ReviewStatus
  created_at: string
  updated_at: string
}

export interface ReviewIssue {
  id: string
  review_id: string
  issue_type: IssueType
  severity: SeverityLabel
  file_path: string
  line_start: number | null
  line_end: number | null
  description: string
  evidence: string | null
  recommended_fix: string | null
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
}

// ─── Voice Walkthroughs ──────────────────────────────────────────────────────
export type VoiceStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface VoiceWalkthrough {
  id: string
  review_id: string
  audio_url: string | null
  duration_seconds: number | null
  transcript_json: TranscriptWord[] | null
  assemblyai_request_id: string | null
  generation_status: VoiceStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface TranscriptWord {
  text: string
  start: number
  end: number
  confidence: number
}

// ─── Pipeline ────────────────────────────────────────────────────────────────
export type PipelineStage = 'diff_parse' | 'context_retrieval' | 'ai_analysis' | 'voice_synthesis' | 'github_post'
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface PipelineRun {
  id: string
  pr_id: string
  repo_id: string
  stage: PipelineStage
  status: PipelineStatus
  started_at: string
  completed_at: string | null
  error_json: Record<string, unknown> | null
  metadata_json: Record<string, unknown> | null
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface RepoAnalytics {
  repo_id: string
  total_reviews: number
  avg_review_time_seconds: number
  avg_issues_per_pr: number
  critical_rate: number
  high_rate: number
  top_issue_types: { type: IssueType; count: number }[]
  author_stats: { login: string; pr_count: number; avg_severity_score: number }[]
  resolution_rate: number
}

// ─── API helpers ─────────────────────────────────────────────────────────────
export interface ApiError {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// ─── PR with Review (joined) ──────────────────────────────────────────────────
export interface PRWithReview extends PullRequest {
  latest_review: Review | null
  voice_walkthrough: VoiceWalkthrough | null
}
