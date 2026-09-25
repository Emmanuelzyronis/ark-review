'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@/components/navigation-sidebar'
import { useAuth } from '@/hooks/use-auth'
import { reposApi } from '@/lib/api'
import { Bell, LogOut, Menu } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [repos, setRepos] = useState<Array<{ owner: string; name: string }>>([])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      reposApi.list()
        .then(r => setRepos(r.repos as Array<{ owner: string; name: string }>))
        .catch(() => {})
    }
  }, [user])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ark-bg">
        <div
          className="animate-spin h-8 w-8 rounded-full border-2 border-ark-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (!user) return null

  const breadcrumbs = pathname.split('/').filter(Boolean)

  return (
    <div className="flex h-screen overflow-hidden bg-ark-bg">
      <NavigationSidebar
        repos={repos}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-ark-border bg-ark-bg-secondary/50 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2 rounded-ark-md hover:bg-ark-bg-tertiary text-ark-text-muted hover:text-ark-text-secondary transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex-1 text-sm text-ark-text-muted hidden sm:block">
            {breadcrumbs.map((seg, i, arr) => (
              <span key={i}>
                {i > 0 && <span className="mx-1 opacity-40" aria-hidden="true">/</span>}
                <span className={i === arr.length - 1 ? 'text-ark-text-secondary' : 'opacity-60'}>{seg}</span>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-ark-md hover:bg-ark-bg-tertiary text-ark-text-muted hover:text-ark-text-secondary transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-ark-md hover:bg-ark-bg-tertiary transition-colors"
                aria-label={`Account menu for ${user.login}`}
                aria-haspopup="true"
              >
                <div
                  className="h-7 w-7 rounded-full bg-ark-primary flex items-center justify-center text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {user.login?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-ark-text-secondary hidden sm:block">{user.login}</span>
              </button>
              <div
                className="absolute right-0 top-full mt-1 w-48 bg-ark-bg-secondary border border-ark-border rounded-ark-lg shadow-ark-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity z-50"
                role="menu"
                aria-label="Account options"
              >
                <div className="px-4 py-3 border-b border-ark-border">
                  <div className="text-sm font-medium text-ark-text-primary">{user.login}</div>
                  <div className="text-xs text-ark-text-muted">{user.email}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { logout(); router.push('/') }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ark-text-secondary hover:bg-ark-bg-tertiary hover:text-ark-text-primary transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
