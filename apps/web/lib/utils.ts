import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMinutes > 0) return `${diffMinutes}m ago`
  return 'just now'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Critical': return 'text-red-400'
    case 'High': return 'text-amber-400'
    case 'Low': return 'text-blue-400'
    case 'Info': return 'text-slate-400'
    default: return 'text-slate-400'
  }
}

export function getSeverityBg(severity: string): string {
  switch (severity) {
    case 'Critical': return 'bg-red-900/40 text-red-300 border border-red-700/50'
    case 'High': return 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
    case 'Low': return 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
    case 'Info': return 'bg-slate-800/60 text-slate-300 border border-slate-600/50'
    default: return 'bg-slate-800/60 text-slate-300 border border-slate-600/50'
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
