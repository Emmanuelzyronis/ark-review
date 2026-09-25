'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

export default function RegisterPage() {
  const [loginName, setLoginName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register, loading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await register(loginName, email, password)
    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Registration failed')
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
          <h1 className="text-2xl font-bold text-ark-text-primary">Create your account</h1>
          <p className="text-ark-text-secondary mt-2 text-sm">Start reviewing PRs in under 5 minutes</p>
        </div>

        <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-ark-md px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <Input
              label="Username"
              type="text"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              placeholder="your-handle"
              required
              autoComplete="username"
            />
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
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
              minLength={8}
            />
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-ark-text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-ark-primary hover:text-ark-primary-hover transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
