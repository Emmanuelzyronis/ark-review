'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ark-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-ark-md bg-ark-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-ark-text-primary">Sign in to ArkReview</h1>
          <p className="text-ark-text-secondary mt-2 text-sm">Voice AI code review for engineering teams</p>
        </div>

        <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-ark-md px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-ark-text-muted">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-ark-primary hover:text-ark-primary-hover transition-colors">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
