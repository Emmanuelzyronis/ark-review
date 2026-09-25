'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3,
  ChevronLeft, ChevronRight, Zap, X
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
]

interface SidebarProps {
  repos?: Array<{ owner: string; name: string; severity_label?: string }>
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function NavigationSidebar({ repos = [], mobileOpen = false, onMobileClose }: SidebarProps) {
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
    const colorMap: Record<string, string> = {
      Critical: 'Critical severity',
      High: 'High severity',
      Low: 'Low severity',
      Info: 'Info',
    }
    return (
      <span
        className={cn('h-2 w-2 rounded-full flex-shrink-0', colors[label] || 'bg-slate-400')}
        aria-label={colorMap[label] || label}
        title={colorMap[label] || label}
      />
    )
  }

  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => (
    <aside
      className={cn(
        'flex flex-col h-full bg-ark-bg-secondary border-r border-ark-border transition-all duration-300',
        isMobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Site navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-ark-border">
        <div className="h-8 w-8 rounded-ark-sm bg-ark-primary flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        {(!collapsed || isMobile) && (
          <div>
            <span className="font-bold text-ark-text-primary text-sm">ArkReview</span>
            <div className="text-[10px] text-ark-text-muted">Voice AI Code Review</div>
          </div>
        )}
        {isMobile && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-ark-sm hover:bg-ark-bg-tertiary text-ark-text-muted hover:text-ark-text-secondary transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Main">
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
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {(!collapsed || isMobile) && label}
          </Link>
        ))}

        {/* Repository list */}
        {(!collapsed || isMobile) && repos.length > 0 && (
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

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <div className="px-2 py-3 border-t border-ark-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-ark-md text-ark-text-muted hover:bg-ark-bg-tertiary hover:text-ark-text-secondary transition-colors text-xs"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" aria-hidden="true" />
              : (
                <>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Collapse</span>
                </>
              )}
          </button>
        </div>
      )}
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — in-flow */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarInner />
      </div>

      {/* Mobile sidebar — fixed overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative h-full">
            <SidebarInner isMobile />
          </div>
        </div>
      )}
    </>
  )
}
