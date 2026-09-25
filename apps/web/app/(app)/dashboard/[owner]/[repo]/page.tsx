'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { prsApi, reposApi } from '@/lib/api'
import { SeverityBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PRListSkeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, cn } from '@/lib/utils'
import { GitPullRequest, Volume2, Settings, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'

interface PR {
  id: string
  github_pr_number: number
  title: string
  author_login: string
  pr_state: string
  lines_added: number
  lines_deleted: number
  files_changed: number
  opened_at: string
  severity_label?: string
  severity_score?: number
  critical_count?: number
  high_count?: number
  low_count?: number
  review_status?: string
  voice_status?: string
  audio_url?: string
}

interface Repo {
  owner: string
  name: string
  full_name: string
  index_status: string
  files_indexed: number
}

export default function RepoDashboardPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = use(params)
  const [prs, setPRs] = useState<PR[]>([])
  const [repoData, setRepoData] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'severity' | 'age'>('severity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [prTitle, setPrTitle] = useState('')
  const [prAuthor, setPrAuthor] = useState('')
  const [showAddPR, setShowAddPR] = useState(false)
  const [adding, setAdding] = useState(false)
  const [diff, setDiff] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prsRes, repoRes] = await Promise.all([
        prsApi.list(owner, repo, { sort: sortBy, order: sortOrder }),
        reposApi.get(owner, repo),
      ])
      setPRs(prsRes.prs as PR[])
      setRepoData(repoRes.repo as Repo)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [owner, repo, sortBy, sortOrder])

  const toggleSort = (col: 'severity' | 'age') => {
    if (sortBy === col) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }

  const addPR = async () => {
    if (!prTitle || !prAuthor) return
    setAdding(true)
    try {
      await prsApi.create(owner, repo, {
        github_pr_number: Math.floor(Math.random() * 9000) + 1000,
        title: prTitle,
        author_login: prAuthor,
        head_branch: `feature/${prTitle.toLowerCase().replace(/\s+/g, '-')}`,
        diff,
      })
      setShowAddPR(false)
      setPrTitle('')
      setPrAuthor('')
      setDiff('')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add PR')
    } finally {
      setAdding(false)
    }
  }

  const SortIcon = ({ col }: { col: 'severity' | 'age' }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortOrder === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-ark-text-muted mb-1">{owner}</div>
          <h1 className="text-2xl font-bold text-ark-text-primary">{repo}</h1>
          {repoData && (
            <div className="flex items-center gap-4 mt-2 text-xs text-ark-text-muted">
              <span className={cn(
                'flex items-center gap-1.5',
                repoData.index_status === 'ready' ? 'text-green-400' :
                repoData.index_status === 'indexing' ? 'text-amber-400' : 'text-ark-text-muted'
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', {
                  'bg-green-400': repoData.index_status === 'ready',
                  'bg-amber-400 pulse-soft': repoData.index_status === 'indexing',
                  'bg-slate-400': !['ready', 'indexing'].includes(repoData.index_status),
                })} />
                Index: {repoData.index_status} ({repoData.files_indexed || 0} files)
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-ark-md hover:bg-ark-bg-secondary text-ark-text-muted hover:text-ark-text-secondary transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href={`/settings/${owner}/${repo}`}>
            <Button variant="secondary" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowAddPR(true)} className="gap-2">
            <GitPullRequest className="h-4 w-4" />
            Simulate PR
          </Button>
        </div>
      </div>

      {/* Add PR modal */}
      {showAddPR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-ark-text-primary">Simulate Pull Request</h2>
            <div>
              <label className="text-sm font-medium text-ark-text-secondary block mb-1.5">PR Title</label>
              <input className="h-10 w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 text-sm text-ark-text-primary focus:outline-none focus:ring-2 focus:ring-ark-primary"
                value={prTitle} onChange={e => setPrTitle(e.target.value)} placeholder="feat: add user authentication" />
            </div>
            <div>
              <label className="text-sm font-medium text-ark-text-secondary block mb-1.5">Author</label>
              <input className="h-10 w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 text-sm text-ark-text-primary focus:outline-none focus:ring-2 focus:ring-ark-primary"
                value={prAuthor} onChange={e => setPrAuthor(e.target.value)} placeholder="developer" />
            </div>
            <div>
              <label className="text-sm font-medium text-ark-text-secondary block mb-1.5">Diff (optional — paste to trigger AI review)</label>
              <textarea className="w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 py-2 text-xs font-mono text-ark-text-primary focus:outline-none focus:ring-2 focus:ring-ark-primary h-28 resize-none"
                value={diff} onChange={e => setDiff(e.target.value)} placeholder="+ const result = await db.query('SELECT * FROM users')" />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAddPR(false)}>Cancel</Button>
              <Button className="flex-1" loading={adding} onClick={addPR}>Create PR + Review</Button>
            </div>
          </div>
        </div>
      )}

      {/* PR table */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-ark-border text-xs font-medium text-ark-text-muted uppercase tracking-wider">
          <span>Pull Request</span>
          <button className="flex items-center gap-1 hover:text-ark-text-secondary transition-colors" onClick={() => toggleSort('severity')}>
            Severity <SortIcon col="severity" />
          </button>
          <span>Issues</span>
          <button className="flex items-center gap-1 hover:text-ark-text-secondary transition-colors" onClick={() => toggleSort('age')}>
            Age <SortIcon col="age" />
          </button>
          <span>Voice</span>
        </div>

        {loading ? (
          <div className="p-4"><PRListSkeleton /></div>
        ) : prs.length === 0 ? (
          <div className="text-center py-16">
            <GitPullRequest className="h-10 w-10 text-ark-text-muted mx-auto mb-3" />
            <div className="text-ark-text-primary font-medium">No pull requests yet</div>
            <div className="text-sm text-ark-text-muted mt-1">Open a PR on GitHub or simulate one above</div>
          </div>
        ) : (
          <div className="divide-y divide-ark-border/50">
            {prs.map(pr => (
              <Link
                key={pr.id}
                href={`/review/${owner}/${repo}/${pr.github_pr_number}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-4 items-center hover:bg-ark-bg-tertiary/50 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ark-text-muted font-mono">#{pr.github_pr_number}</span>
                    <span className="text-sm font-medium text-ark-text-primary truncate group-hover:text-ark-primary transition-colors">
                      {pr.title}
                    </span>
                  </div>
                  <div className="text-xs text-ark-text-muted mt-0.5 flex items-center gap-2">
                    <span>by {pr.author_login}</span>
                    {pr.files_changed > 0 && <span>{pr.files_changed} files</span>}
                    {pr.lines_added > 0 && <span className="text-green-500">+{pr.lines_added}</span>}
                    {pr.lines_deleted > 0 && <span className="text-red-500">-{pr.lines_deleted}</span>}
                  </div>
                </div>
                <div>
                  {pr.severity_label ? (
                    <SeverityBadge severity={pr.severity_label as 'Critical' | 'High' | 'Low' | 'Info'} />
                  ) : (
                    <span className="text-xs text-ark-text-muted">
                      {pr.review_status === 'in_progress' ? 'Reviewing...' : 'Pending'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-center">
                  {pr.critical_count !== undefined ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      {(pr.critical_count || 0) > 0 && <span className="text-red-400">{pr.critical_count} crit</span>}
                      {(pr.high_count || 0) > 0 && <span className="text-amber-400">{pr.high_count} high</span>}
                      {(pr.critical_count || 0) === 0 && (pr.high_count || 0) === 0 && (
                        <span className="text-ark-text-muted">{(pr.low_count || 0)} low</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-ark-text-muted text-xs">—</span>
                  )}
                </div>
                <div className="text-xs text-ark-text-muted whitespace-nowrap">
                  {formatRelativeTime(pr.opened_at)}
                </div>
                <div aria-label={pr.voice_status === 'ready' ? 'Voice walkthrough ready' : 'Voice not yet generated'}>
                  <Volume2 className={`h-4 w-4 ${pr.voice_status === 'ready' ? 'text-ark-accent' : 'text-ark-border'}`} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
