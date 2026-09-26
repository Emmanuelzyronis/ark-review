'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { prsApi } from '@/lib/api'
import { SeverityBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VoicePlayer } from '@/components/voice-player'
import { IssueGroupAccordion } from '@/components/issue-flag-card'
import { ReviewPanelSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, GitPullRequest, CheckCircle, XCircle, RefreshCw, Volume2, AlertTriangle, Copy } from 'lucide-react'

interface PR {
  github_pr_number: number
  title: string
  author_login: string
  base_branch: string
  head_branch: string
  lines_added: number
  lines_deleted: number
  files_changed: number
  opened_at: string
  severity_label?: string
  severity_score?: number
  critical_count?: number
  high_count?: number
  low_count?: number
  architectural_summary?: string
  review_status?: string
  audio_url?: string
  duration_seconds?: number
  voice_status?: string
  transcript_json?: Array<{ text: string }>
}

interface ReviewIssue {
  id: string
  issue_type: string
  severity: 'Critical' | 'High' | 'Low' | 'Info'
  file_path: string
  line_start?: number
  line_end?: number
  description: string
  evidence?: string
  recommended_fix?: string
  is_resolved?: boolean
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; prNumber: string }>
}) {
  const { owner, repo, prNumber } = use(params)
  const [pr, setPR] = useState<PR | null>(null)
  const [issues, setIssues] = useState<ReviewIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewBody, setReviewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<'approved' | 'changes_requested' | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Low' | 'Info'>('all')

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [prRes, issuesRes] = await Promise.all([
        prsApi.get(owner, repo, parseInt(prNumber)),
        prsApi.getIssues(owner, repo, parseInt(prNumber)),
      ])
      const prData = prRes.pr as PR
      setPR(prData)
      setIssues(issuesRes.issues as ReviewIssue[])
      setReviewBody(prData.architectural_summary || '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load this review. Check your connection and try again.'
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [owner, repo, prNumber])

  const copyFindings = async () => {
    const md = issues.map(i => {
      const header = `## [${i.severity}] ${i.description}`
      const file = `**File:** \`${i.file_path}${i.line_start ? ` L${i.line_start}${i.line_end && i.line_end !== i.line_start ? `-${i.line_end}` : ''}` : ''}\``
      const evidence = i.evidence ? `\n**Evidence:**\n\`\`\`\n${i.evidence}\n\`\`\`` : ''
      const fix = i.recommended_fix ? `\n**Fix:** ${i.recommended_fix}` : ''
      return [header, file, evidence, fix].filter(Boolean).join('\n')
    }).join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(md)
      showToast('Findings copied as markdown')
    } catch {
      showToast('Copy failed — check clipboard permissions')
    }
  }

  const triggerReview = async () => {
    setTriggering(true)
    try {
      await prsApi.triggerReview(owner, repo, parseInt(prNumber))
      showToast('Review pipeline triggered. This may take up to 60 seconds...')
      setTimeout(fetchData, 5000)
    } catch {
      showToast('Failed to trigger review')
    } finally {
      setTriggering(false)
    }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await prsApi.approve(owner, repo, parseInt(prNumber), reviewBody)
      setSubmitted('approved')
      showToast('PR approved and review posted successfully')
    } catch {
      showToast('Failed to post approval')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestChanges = async () => {
    setSubmitting(true)
    try {
      await prsApi.requestChanges(owner, repo, parseInt(prNumber), reviewBody)
      setSubmitted('changes_requested')
      showToast('Changes requested and review posted successfully')
    } catch {
      showToast('Failed to post review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ReviewPanelSkeleton />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Link
          href={`/dashboard/${owner}/${repo}`}
          className="inline-flex items-center gap-1.5 text-sm text-ark-text-muted hover:text-ark-text-secondary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {owner}/{repo}
        </Link>
        <div className="bg-red-900/20 border border-red-700/40 rounded-ark-xl p-8 flex items-start gap-4" role="alert">
          <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-base font-semibold text-red-300 mb-1">Failed to load review</div>
            <div className="text-sm text-red-400/80 mb-4">{fetchError}</div>
            <Button size="sm" variant="secondary" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!pr) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-24">
        <div className="h-16 w-16 rounded-ark-xl bg-ark-bg-secondary border border-ark-border flex items-center justify-center mx-auto mb-4">
          <GitPullRequest className="h-8 w-8 text-ark-text-muted" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-ark-text-primary mb-2">Pull request not found</h2>
        <p className="text-ark-text-secondary text-sm mb-6 max-w-sm mx-auto">
          This PR may have been deleted or the review hasn't been triggered yet.
        </p>
        <Link
          href={`/dashboard/${owner}/${repo}`}
          className="inline-flex items-center gap-1.5 text-sm text-ark-primary hover:text-ark-primary-hover transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to {owner}/{repo}
        </Link>
      </div>
    )
  }

  const severityLevels = ['all', 'Critical', 'High', 'Low', 'Info'] as const
  const severityColors: Record<string, string> = {
    all: 'text-ark-text-secondary hover:bg-ark-bg-tertiary',
    Critical: 'text-red-300 hover:bg-red-900/20',
    High: 'text-amber-300 hover:bg-amber-900/20',
    Low: 'text-blue-300 hover:bg-blue-900/20',
    Info: 'text-ark-text-muted hover:bg-ark-bg-tertiary',
  }
  const severityActiveColors: Record<string, string> = {
    all: 'bg-ark-bg-tertiary text-ark-text-primary border-ark-primary/50',
    Critical: 'bg-red-900/30 text-red-300 border-red-700/50',
    High: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    Low: 'bg-blue-900/30 text-blue-300 border-blue-700/50',
    Info: 'bg-ark-bg-tertiary text-ark-text-secondary border-ark-border',
  }
  const filteredIssues = severityFilter === 'all' ? issues : issues.filter(i => i.severity === severityFilter)
  const issueCounts: Record<string, number> = { all: issues.length }
  for (const i of issues) issueCounts[i.severity] = (issueCounts[i.severity] || 0) + 1

  const transcript = pr.transcript_json
    ? pr.transcript_json.map(w => w.text).join(' ')
    : null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-ark-bg-secondary border border-ark-border rounded-ark-lg px-4 py-3 text-sm text-ark-text-primary shadow-ark-lg z-50 animate-slide-up max-w-sm">
          {toastMsg}
        </div>
      )}

      {/* Back nav */}
      <Link
        href={`/dashboard/${owner}/${repo}`}
        className="inline-flex items-center gap-1.5 text-sm text-ark-text-muted hover:text-ark-text-secondary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {owner}/{repo}
      </Link>

      {/* Review summary header */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GitPullRequest className="h-5 w-5 text-ark-text-muted flex-shrink-0" />
              <span className="text-sm text-ark-text-muted font-mono">#{pr.github_pr_number}</span>
              {pr.severity_label && (
                <SeverityBadge severity={pr.severity_label as 'Critical' | 'High' | 'Low' | 'Info'} />
              )}
            </div>
            <h1 className="text-xl font-bold text-ark-text-primary">{pr.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-ark-text-muted flex-wrap">
              <span>by <strong className="text-ark-text-secondary">{pr.author_login}</strong></span>
              <span className="font-mono text-xs">{pr.base_branch} ← {pr.head_branch}</span>
              {pr.lines_added > 0 && <span className="text-green-400">+{pr.lines_added}</span>}
              {pr.lines_deleted > 0 && <span className="text-red-400">-{pr.lines_deleted}</span>}
              {pr.files_changed > 0 && <span>{pr.files_changed} files</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={triggerReview}
              loading={triggering}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-run review
            </Button>
          </div>
        </div>

        {/* Issue counts */}
        {pr.severity_score !== undefined && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-ark-border flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-2 bg-ark-border rounded-full w-32 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (pr.severity_score || 0) >= 75 ? 'bg-red-500' :
                    (pr.severity_score || 0) >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${pr.severity_score || 0}%` }}
                />
              </div>
              <span className="text-xs text-ark-text-muted">Severity {pr.severity_score}/100</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {(pr.critical_count || 0) > 0 && <span className="text-red-400">{pr.critical_count} critical</span>}
              {(pr.high_count || 0) > 0 && <span className="text-amber-400">{pr.high_count} high</span>}
              {(pr.low_count || 0) > 0 && <span className="text-blue-400">{pr.low_count} low</span>}
            </div>
          </div>
        )}

        {/* Architectural summary */}
        {pr.architectural_summary && (
          <div className="mt-4 pt-4 border-t border-ark-border">
            <div className="text-xs font-semibold text-ark-text-muted uppercase tracking-wider mb-2">Architectural Summary</div>
            <p className="text-sm text-ark-text-secondary leading-relaxed">{pr.architectural_summary}</p>
          </div>
        )}
      </div>

      {/* Voice walkthrough */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="h-4 w-4 text-ark-accent" />
          <h2 className="text-sm font-semibold text-ark-text-primary">Voice Walkthrough</h2>
        </div>
        <VoicePlayer
          audioUrl={pr.audio_url}
          transcript={transcript}
          duration={pr.duration_seconds}
          status={pr.voice_status}
        />
      </div>

      {/* Issues */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-ark-text-primary">
            Flagged Issues ({issues.length})
          </h2>
          {issues.length > 0 && (
            <button
              onClick={copyFindings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-ark-sm text-xs text-ark-text-muted hover:bg-ark-bg-secondary hover:text-ark-text-secondary transition-colors border border-transparent hover:border-ark-border"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy findings
            </button>
          )}
        </div>

        {issues.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {severityLevels.map(level => {
              const count = issueCounts[level]
              if (level !== 'all' && !count) return null
              const isActive = severityFilter === level
              return (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive ? severityActiveColors[level] : `border-transparent ${severityColors[level]}`
                  }`}
                >
                  {level === 'all' ? 'All' : level}
                  {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              )
            })}
          </div>
        )}

        <IssueGroupAccordion issues={filteredIssues} />
      </div>

      {/* Review action bar */}
      <div className="sticky bottom-0 bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-4 shadow-ark-lg">
        <div className="text-xs font-semibold text-ark-text-muted uppercase tracking-wider mb-2">Post Review to GitHub</div>
        <textarea
          className="w-full h-24 rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 py-2 text-sm text-ark-text-primary placeholder:text-ark-text-muted focus:outline-none focus:ring-2 focus:ring-ark-primary resize-none mb-3"
          value={reviewBody}
          onChange={e => setReviewBody(e.target.value)}
          placeholder="Edit the review body before submitting..."
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {submitted === 'approved' ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Approved and posted
            </div>
          ) : submitted === 'changes_requested' ? (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <XCircle className="h-4 w-4" />
              Changes requested and posted
            </div>
          ) : (
            <div className="flex gap-2 flex-1">
              <Button
                variant="danger"
                onClick={handleRequestChanges}
                loading={submitting}
                className="gap-2 flex-1 sm:flex-none"
              >
                <XCircle className="h-4 w-4" />
                Request Changes
              </Button>
              <Button
                variant="secondary"
                onClick={handleApprove}
                loading={submitting}
                className="gap-2 flex-1 sm:flex-none border-green-700/50 text-green-300 hover:bg-green-900/20"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
          <div className="hidden sm:flex flex-1" />
          <span className="text-xs text-ark-text-muted self-end sm:self-auto">
            {reviewBody.length} chars
          </span>
        </div>
      </div>
    </div>
  )
}
