'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, GitPullRequest, BarChart3, History, Settings,
  ChevronLeft, ChevronRight, Zap, Github
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
]

interface SidebarProps {
  repos?: Array<{ owner: string; name: string; severity_label?: string }>
}

export function NavigationSidebar({ repos = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const severityDot = (label?: string) => {
    if (!label) return null
    const colors: Record<string, string> = {
      Critical: 'bg-red-400',
      High: 'bg-amber-400',
      Low: 'bg-blue-400',
      Info: 'bg-slate-400',
    }
    return <span className={cn('h-2 w-2 rounded-full flex-shrink-0', colors[label] || 'bg-slate-400')} />
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-ark-bg-secondary border-r border-ark-border transition-all duration-300 sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-ark-border">
        <div className="h-8 w-8 rounded-ark-sm bg-ark-primary flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-ark-text-primary text-sm">ArkReview</span>
            <div className="text-[10px] text-ark-text-muted">Voice AI Code Review</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-ark-md text-sm transition-colors duration-150',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-ark-primary-muted text-ark-primary font-medium'
                : 'text-ark-text-secondary hover:bg-ark-bg-tertiary hover:text-ark-text-primary'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && label}
          </Link>
        ))}

        {/* Repository list */}
        {!collapsed && repos.length > 0 && (
          <div className="pt-4">
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ark-text-muted">
              Repositories
            </div>
            {repos.map(repo => (
              <Link
                key={`${repo.owner}/${repo.name}`}
                href={`/dashboard/${repo.owner}/${repo.name}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-ark-md text-xs text-ark-text-secondary hover:bg-ark-bg-tertiary hover:text-ark-text-primary transition-colors"
              >
                {severityDot(repo.severity_label)}
                <span className="truncate">{repo.owner}/{repo.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-ark-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-ark-md text-ark-text-muted hover:bg-ark-bg-tertiary hover:text-ark-text-secondary transition-colors text-xs"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
