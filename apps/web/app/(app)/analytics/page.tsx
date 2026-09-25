'use client'

import { useEffect, useState } from 'react'
import { analyticsApi, reposApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, GitPullRequest, Activity, TrendingUp } from 'lucide-react'
import { AnalyticsSkeleton } from '@/components/ui/skeleton'

interface TeamAnalytics {
  total_reviews: string
  avg_issues_per_pr: string
  active_repos: string
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.team()
      .then(r => setAnalytics(r.analytics as TeamAnalytics))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = analytics ? [
    { label: 'Total Reviews', value: analytics.total_reviews || '0', icon: Activity, color: 'text-ark-primary' },
    { label: 'Avg Issues / PR', value: parseFloat(analytics.avg_issues_per_pr || '0').toFixed(1), icon: BarChart3, color: 'text-amber-400' },
    { label: 'Active Repos', value: analytics.active_repos || '0', icon: GitPullRequest, color: 'text-green-400' },
  ] : []

  if (loading) return <div className="p-6 max-w-6xl mx-auto"><AnalyticsSkeleton /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ark-text-primary">Team Analytics</h1>
        <p className="text-sm text-ark-text-secondary mt-1">Cross-repository quality metrics</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-ark-text-muted">{stat.label}</div>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-ark-text-primary">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-ark-primary" />
            <h2 className="font-semibold text-ark-text-primary">Issue Trends</h2>
          </div>
          <div className="h-48 flex items-center justify-center text-ark-text-muted text-sm">
            Connect more repositories and run reviews to see trend data here.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-ark-text-primary mb-4">Common Issue Types</h2>
          <div className="space-y-3">
            {[
              { type: 'N+1 Query', pct: 34 },
              { type: 'Missing Error Handling', pct: 28 },
              { type: 'Security', pct: 18 },
              { type: 'Breaking Change', pct: 12 },
              { type: 'Architecture', pct: 8 },
            ].map(item => (
              <div key={item.type} className="flex items-center gap-3">
                <div className="w-40 text-sm text-ark-text-secondary">{item.type}</div>
                <div className="flex-1 h-2 bg-ark-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ark-primary rounded-full"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs text-ark-text-muted">{item.pct}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
