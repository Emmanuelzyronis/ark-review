'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, GitPullRequest, Activity, AlertTriangle, Zap } from 'lucide-react'
import { reposApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SeverityBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils'

interface Repo {
  id: string
  owner: string
  name: string
  full_name: string
  index_status: string
  index_progress_pct: number
  last_indexed_at: string | null
  open_pr_count: string
  total_reviews: string
}

function AddRepoModal({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await reposApi.create({ owner, name })
      setOpen(false)
      setOwner('')
      setName('')
      onAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
    setOwner('')
    setName('')
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add repository
      </Button>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-repo-title"
        >
          <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 w-full max-w-md">
            <h2 id="add-repo-title" className="text-lg font-semibold text-ark-text-primary mb-4">
              Connect Repository
            </h2>
            {error && (
              <div
                className="bg-red-900/30 border border-red-700/50 rounded-ark-md px-4 py-3 text-sm text-red-300 mb-4"
                role="alert"
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repo-owner" className="text-sm font-medium text-ark-text-secondary block mb-1.5">
                  Owner
                </label>
                <input
                  id="repo-owner"
                  className="h-10 w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 text-sm text-ark-text-primary focus:outline-none focus:ring-2 focus:ring-ark-primary"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  placeholder="your-org-or-username"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="repo-name" className="text-sm font-medium text-ark-text-secondary block mb-1.5">
                  Repository name
                </label>
                <input
                  id="repo-name"
                  className="h-10 w-full rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 text-sm text-ark-text-primary focus:outline-none focus:ring-2 focus:ring-ark-primary"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="my-project"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={loading}>
                  Connect repository
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepos = () => {
    setLoading(true)
    setError(null)
    reposApi.list()
      .then(r => setRepos(r.repos as Repo[]))
      .catch(() => {
        setError('Unable to load repositories. Check your connection and try again.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRepos() }, [])

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ark-text-primary">Dashboard</h1>
          <p className="text-ark-text-secondary text-sm mt-1">All repositories under active review</p>
        </div>
        <AddRepoModal onAdd={fetchRepos} />
      </div>

      {/* Error state */}
      {error && (
        <div
          className="bg-red-900/20 border border-red-700/40 rounded-ark-xl p-6 mb-6 flex items-start gap-3"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-sm font-medium text-red-300">{error}</div>
            <button
              onClick={fetchRepos}
              className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Repos grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading repositories">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-6 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : repos.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="h-16 w-16 rounded-ark-xl bg-ark-bg-secondary border border-ark-border flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-ark-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-ark-text-primary mb-2">No repositories connected</h2>
          <p className="text-ark-text-secondary text-sm mb-6 max-w-sm mx-auto">
            Connect a GitHub repository and ArkReview will index your codebase and start reviewing every PR — with voice walkthroughs — in under 60 seconds.
          </p>
          <AddRepoModal onAdd={fetchRepos} />
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Connected repositories">
          {repos.map(repo => (
            <li key={repo.id}>
              <Link href={`/dashboard/${repo.owner}/${repo.name}`}>
                <Card className="hover:border-ark-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="text-xs text-ark-text-muted">{repo.owner}</div>
                        <div className="font-semibold text-ark-text-primary truncate">{repo.name}</div>
                      </div>
                      <div
                        className={`h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0 ${
                          repo.index_status === 'ready' ? 'bg-green-400' :
                          repo.index_status === 'indexing' ? 'bg-amber-400 pulse-soft' :
                          'bg-slate-400'
                        }`}
                        aria-label={`Index status: ${repo.index_status}`}
                        title={`Index: ${repo.index_status}`}
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-ark-text-muted mt-4">
                      <span className="flex items-center gap-1">
                        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
                        {repo.open_pr_count || 0} open PRs
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                        {repo.total_reviews || 0} reviews
                      </span>
                    </div>

                    {repo.index_status === 'indexing' && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-ark-bg-tertiary rounded-full overflow-hidden" role="progressbar" aria-valuenow={repo.index_progress_pct || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Indexing progress">
                          <div
                            className="h-full bg-ark-primary rounded-full transition-all"
                            style={{ width: `${repo.index_progress_pct || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-ark-text-muted mt-1">
                          Indexing… {repo.index_progress_pct || 0}%
                        </div>
                      </div>
                    )}

                    {repo.last_indexed_at && (
                      <div className="text-xs text-ark-text-muted mt-3">
                        Indexed {formatRelativeTime(repo.last_indexed_at)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
