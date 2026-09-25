'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Code2 } from 'lucide-react'
import { cn, getSeverityBg } from '@/lib/utils'
import { SeverityBadge } from '@/components/ui/badge'
import { prsApi } from '@/lib/api'

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

const issueTypeLabels: Record<string, string> = {
  n_plus_one: 'N+1 Query',
  missing_error_handling: 'Missing Error Handling',
  security: 'Security',
  breaking_change: 'Breaking Change',
  architecture: 'Architecture',
  performance: 'Performance',
  style: 'Style',
}

export function IssueFlagCard({
  issue,
  onResolved,
}: {
  issue: ReviewIssue
  onResolved?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(issue.severity === 'Critical' || issue.severity === 'High')
  const [resolved, setResolved] = useState(issue.is_resolved || false)

  const lineRange = issue.line_start
    ? issue.line_end && issue.line_end !== issue.line_start
      ? `L${issue.line_start}-${issue.line_end}`
      : `L${issue.line_start}`
    : null

  return (
    <div
      className={cn(
        'border rounded-ark-md transition-all duration-200',
        resolved ? 'opacity-60 border-ark-border' : 'border-ark-border',
        issue.severity === 'Critical' && !resolved && 'border-red-700/50 shadow-ark-glow-critical'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-ark-bg-tertiary/50 transition-colors rounded-ark-md"
      >
        <div className="mt-0.5">
          {expanded ? <ChevronDown className="h-4 w-4 text-ark-text-muted" /> : <ChevronRight className="h-4 w-4 text-ark-text-muted" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={issue.severity} />
            <span className="text-xs px-2 py-0.5 rounded bg-ark-bg-tertiary text-ark-text-muted font-medium">
              {issueTypeLabels[issue.issue_type] || issue.issue_type}
            </span>
          </div>
          <div className="text-sm font-medium text-ark-text-primary line-clamp-2">{issue.description}</div>
          <div className="text-xs text-ark-text-muted font-mono">
            {issue.file_path}{lineRange && ` · ${lineRange}`}
          </div>
        </div>
        {resolved && (
          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-ark-border/50">
          {issue.evidence && (
            <div>
              <div className="text-xs font-semibold text-ark-text-muted uppercase tracking-wider mb-1.5 mt-3">Evidence</div>
              <pre className="text-xs font-mono text-ark-text-secondary bg-ark-bg rounded-ark-sm p-3 overflow-x-auto border border-ark-border whitespace-pre-wrap">
                <code>{issue.evidence}</code>
              </pre>
            </div>
          )}
          {issue.recommended_fix && (
            <div>
              <div className="text-xs font-semibold text-ark-text-muted uppercase tracking-wider mb-1.5">Recommended Fix</div>
              <div className="text-sm text-ark-text-secondary leading-relaxed bg-ark-bg-tertiary/50 p-3 rounded-ark-sm border border-ark-border/50">
                {issue.recommended_fix}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <a
              href={`https://github.com/search?q=${encodeURIComponent(issue.file_path)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ark-primary hover:text-ark-primary-hover flex items-center gap-1"
            >
              <Code2 className="h-3.5 w-3.5" />
              View in GitHub
            </a>
            <button
              onClick={() => {
                setResolved(!resolved)
                if (onResolved && !resolved) onResolved(issue.id)
              }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-ark-sm transition-colors',
                resolved
                  ? 'bg-ark-bg-tertiary text-ark-text-muted hover:bg-ark-border'
                  : 'bg-green-900/40 text-green-300 hover:bg-green-900/60 border border-green-700/50'
              )}
            >
              {resolved ? 'Mark unresolved' : 'Mark resolved'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface IssueGroupAccordionProps {
  issues: ReviewIssue[]
  onResolved?: (id: string) => void
}

export function IssueGroupAccordion({ issues, onResolved }: IssueGroupAccordionProps) {
  // Group issues by file
  const grouped: Record<string, ReviewIssue[]> = {}
  for (const issue of issues) {
    if (!grouped[issue.file_path]) grouped[issue.file_path] = []
    grouped[issue.file_path].push(issue)
  }

  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set(Object.keys(grouped)))
  const toggleFile = (fp: string) => {
    setOpenFiles(prev => {
      const next = new Set(prev)
      if (next.has(fp)) next.delete(fp)
      else next.add(fp)
      return next
    })
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <div className="text-ark-text-primary font-medium">No issues flagged</div>
        <div className="text-sm text-ark-text-muted">This PR looks clean!</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([filePath, fileIssues]) => {
        const isOpen = openFiles.has(filePath)
        const criticalCount = fileIssues.filter(i => i.severity === 'Critical').length
        const highCount = fileIssues.filter(i => i.severity === 'High').length

        return (
          <div key={filePath} className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg overflow-hidden">
            <button
              onClick={() => toggleFile(filePath)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ark-bg-tertiary/50 transition-colors"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-ark-text-muted" /> : <ChevronRight className="h-4 w-4 text-ark-text-muted" />}
              <Code2 className="h-4 w-4 text-ark-text-muted" />
              <span className="flex-1 text-sm font-mono text-ark-text-secondary text-left">{filePath}</span>
              <div className="flex items-center gap-1.5">
                {criticalCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/50">
                    {criticalCount} critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                    {highCount} high
                  </span>
                )}
                <span className="text-xs text-ark-text-muted">{fileIssues.length} total</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-ark-border divide-y divide-ark-border/50">
                {fileIssues.map(issue => (
                  <div key={issue.id} className="bg-ark-bg-tertiary/20">
                    <IssueFlagCard issue={issue} onResolved={onResolved} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
