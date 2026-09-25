import * as React from 'react'
import { cn, getSeverityBg } from '@/lib/utils'

interface BadgeProps {
  severity: 'Critical' | 'High' | 'Low' | 'Info'
  className?: string
}

export function SeverityBadge({ severity, className }: BadgeProps) {
  const icons = {
    Critical: '🔴',
    High: '🟡',
    Low: '🔵',
    Info: '⚪',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        getSeverityBg(severity),
        className
      )}
      aria-label={`Severity: ${severity}`}
    >
      <span aria-hidden="true">{icons[severity]}</span>
      {severity}
    </span>
  )
}

interface GenericBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ className, variant = 'default', children, ...props }: GenericBadgeProps) {
  const variants = {
    default: 'bg-ark-bg-tertiary text-ark-text-secondary border border-ark-border',
    success: 'bg-green-900/40 text-green-300 border border-green-700/50',
    warning: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
    error: 'bg-red-900/40 text-red-300 border border-red-700/50',
    info: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
