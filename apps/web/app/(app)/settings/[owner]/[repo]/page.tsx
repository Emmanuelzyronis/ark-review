'use client'

import { use, useEffect, useState } from 'react'
import { reposApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { CheckCircle, Settings } from 'lucide-react'

const FOCUS_AREAS = ['security', 'performance', 'architecture', 'style', 'testing']
const STRICTNESS = ['low', 'medium', 'high', 'strict'] as const

export default function SettingsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = use(params)
  const [config, setConfig] = useState({
    strictness_level: 'medium' as typeof STRICTNESS[number],
    focus_areas: ['security', 'performance', 'architecture'],
    ignored_patterns: [] as string[],
    auto_approve_threshold: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [patternInput, setPatternInput] = useState('')

  useEffect(() => {
    reposApi.getConfig(owner, repo)
      .then(r => {
        const c = r.config as typeof config
        setConfig(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [owner, repo])

  const save = async () => {
    setSaving(true)
    try {
      await reposApi.updateConfig(owner, repo, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggleFocus = (area: string) => {
    setConfig(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area],
    }))
  }

  const addPattern = () => {
    if (!patternInput.trim()) return
    setConfig(prev => ({ ...prev, ignored_patterns: [...prev.ignored_patterns, patternInput.trim()] }))
    setPatternInput('')
  }

  const removePattern = (p: string) => {
    setConfig(prev => ({ ...prev, ignored_patterns: prev.ignored_patterns.filter(x => x !== p) }))
  }

  if (loading) {
    return <div className="p-6 text-ark-text-muted">Loading settings...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-ark-text-muted" />
          <h1 className="text-xl font-bold text-ark-text-primary">Repository Settings</h1>
        </div>
        <p className="text-sm text-ark-text-muted">{owner}/{repo}</p>
      </div>

      {/* Strictness */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 space-y-4">
        <h2 className="font-semibold text-ark-text-primary">Review Strictness</h2>
        <div className="flex gap-2">
          {STRICTNESS.map(s => (
            <button
              key={s}
              onClick={() => setConfig(prev => ({ ...prev, strictness_level: s }))}
              className={`px-4 py-2 rounded-ark-md text-sm font-medium transition-colors capitalize ${
                config.strictness_level === s
                  ? 'bg-ark-primary text-white'
                  : 'bg-ark-bg-tertiary text-ark-text-secondary border border-ark-border hover:border-ark-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-xs text-ark-text-muted">
          {config.strictness_level === 'low' && 'Only critical and high severity issues are flagged.'}
          {config.strictness_level === 'medium' && 'All issues flagged, architectural issues prioritized.'}
          {config.strictness_level === 'high' && 'Comprehensive review including style and minor issues.'}
          {config.strictness_level === 'strict' && 'Maximum coverage. Every pattern deviation is flagged.'}
        </p>
      </div>

      {/* Focus areas */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 space-y-4">
        <h2 className="font-semibold text-ark-text-primary">Focus Areas</h2>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map(area => (
            <button
              key={area}
              onClick={() => toggleFocus(area)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                config.focus_areas.includes(area)
                  ? 'bg-ark-primary/20 text-ark-primary border border-ark-primary/40'
                  : 'bg-ark-bg-tertiary text-ark-text-muted border border-ark-border hover:border-ark-primary/30'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Ignored patterns */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 space-y-4">
        <h2 className="font-semibold text-ark-text-primary">Ignored File Patterns</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 h-9 rounded-ark-md border border-ark-border bg-ark-bg-tertiary px-3 text-sm text-ark-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-ark-primary"
            value={patternInput}
            onChange={e => setPatternInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPattern()}
            placeholder="*.test.ts, dist/**, node_modules/**"
          />
          <Button size="sm" variant="secondary" onClick={addPattern}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.ignored_patterns.map(p => (
            <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ark-bg-tertiary text-ark-text-secondary border border-ark-border rounded-full text-xs font-mono">
              {p}
              <button onClick={() => removePattern(p)} className="text-ark-text-muted hover:text-red-400 transition-colors">×</button>
            </span>
          ))}
          {config.ignored_patterns.length === 0 && (
            <span className="text-sm text-ark-text-muted">No ignored patterns — all files will be reviewed.</span>
          )}
        </div>
      </div>

      {/* Auto-approve threshold */}
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6 space-y-4">
        <h2 className="font-semibold text-ark-text-primary">Auto-Approve Threshold</h2>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            value={config.auto_approve_threshold}
            onChange={e => setConfig(prev => ({ ...prev, auto_approve_threshold: parseInt(e.target.value) }))}
            className="w-full accent-ark-primary"
          />
          <div className="flex justify-between text-xs text-ark-text-muted">
            <span>0 — Never auto-approve</span>
            <span className="text-ark-primary font-medium">{config.auto_approve_threshold}</span>
            <span>100 — Always approve</span>
          </div>
        </div>
        <p className="text-xs text-ark-text-muted">
          PRs with severity score below this threshold will be automatically approved.
          Set to 0 to disable auto-approval.
        </p>
      </div>

      <Button onClick={save} loading={saving} className="gap-2">
        {saved && <CheckCircle className="h-4 w-4" />}
        {saved ? 'Saved!' : 'Save settings'}
      </Button>
    </div>
  )
}
