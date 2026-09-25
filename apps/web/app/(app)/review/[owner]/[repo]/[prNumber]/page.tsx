'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { prsApi } from '@/lib/api'
import { SeverityBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VoicePlayer } from '@/components/voice-player'
import { IssueGroupAccordion } from '@/components/issue-flag-card'
import { ReviewPanelSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, GitPullRequest, CheckCircle, XCircle, RefreshCw, Volume2 } from 'lucide-react'

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

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [owner, repo, prNumber])

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

  if (!pr) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-24">
        <div className="text-ark-text-primary font-medium">PR not found</div>
        <Link href={`/dashboard/${owner}/${repo}`} className="text-ark-primary text-sm hover:text-ark-primary-hover mt-2 inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to repository
        </Link>
      </div>
    )
  }

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ark-text-primary">
            Flagged Issues ({issues.length})
          </h2>
        </div>
        <IssueGroupAccordion issues={issues} />
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
        <div className="flex items-center gap-3">
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
            <>
              <Button
                variant="danger"
                onClick={handleRequestChanges}
                loading={submitting}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Request Changes
              </Button>
              <Button
                variant="secondary"
                onClick={handleApprove}
                loading={submitting}
                className="gap-2 border-green-700/50 text-green-300 hover:bg-green-900/20"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          <div className="flex-1" />
          <span className="text-xs text-ark-text-muted">
            {reviewBody.length} chars
          </span>
        </div>
      </div>
    </div>
  )
}
