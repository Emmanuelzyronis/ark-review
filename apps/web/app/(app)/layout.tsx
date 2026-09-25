'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@/components/navigation-sidebar'
import { useAuth } from '@/hooks/use-auth'
import { reposApi } from '@/lib/api'
import { Bell, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [repos, setRepos] = useState<Array<{ owner: string; name: string }>>([])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ark-bg">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-ark-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-ark-bg">
      <NavigationSidebar repos={repos} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-ark-border bg-ark-bg-secondary/50 flex items-center justify-between px-6 flex-shrink-0">
          <div className="text-sm text-ark-text-muted breadcrumb">
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i}>
                {i > 0 && <span className="mx-1 opacity-40">/</span>}
                <span className={i === arr.length - 1 ? 'text-ark-text-secondary' : 'opacity-60'}>{seg}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-ark-md hover:bg-ark-bg-tertiary text-ark-text-muted hover:text-ark-text-secondary transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-ark-md hover:bg-ark-bg-tertiary transition-colors">
                <div className="h-7 w-7 rounded-full bg-ark-primary flex items-center justify-center text-xs font-bold text-white">
                  {user.login?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-ark-text-secondary">{user.login}</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-ark-bg-secondary border border-ark-border rounded-ark-lg shadow-ark-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                <div className="px-4 py-3 border-b border-ark-border">
                  <div className="text-sm font-medium text-ark-text-primary">{user.login}</div>
                  <div className="text-xs text-ark-text-muted">{user.email}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { logout(); router.push('/') }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ark-text-secondary hover:bg-ark-bg-tertiary hover:text-ark-text-primary transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
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
