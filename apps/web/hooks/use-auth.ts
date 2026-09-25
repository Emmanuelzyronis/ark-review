'use client'

import { useState, useEffect, useCallback } from 'react'
import { authApi } from '@/lib/api'

interface User {
  id: string
  login: string
  email: string
  avatar_url: string | null
  installation_id: string | null
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const token = localStorage.getItem('ark-review-token')
    if (!token) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, token }))
    authApi.me()
      .then(({ user }) => setState({ user: user as User, token, loading: false, error: null }))
      .catch(() => {
        localStorage.removeItem('ark-review-token')
        setState({ user: null, token: null, loading: false, error: null })
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { token, user } = await authApi.login({ email, password })
      localStorage.setItem('ark-review-token', token)
      setState({ user: user as User, token, loading: false, error: null })
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Login failed'
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [])

  const register = useCallback(async (login: string, email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { token, user } = await authApi.register({ login, email, password })
      localStorage.setItem('ark-review-token', token)
      setState({ user: user as User, token, loading: false, error: null })
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Registration failed'
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem('ark-review-token')
    setState({ user: null, token: null, loading: false, error: null })
  }, [])

  return { ...state, login, register, logout }
}
