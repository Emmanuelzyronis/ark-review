const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ark-review-token')
}

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { login: string; email: string; password: string }) =>
    fetchAPI<{ token: string; user: unknown }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchAPI<{ token: string; user: unknown }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => fetchAPI<{ user: unknown }>('/api/auth/me'),

  logout: () => fetchAPI<{ message: string }>('/api/auth/logout', { method: 'POST' }),
}

// ─── Repos ────────────────────────────────────────────────────────────────────
export const reposApi = {
  list: () => fetchAPI<{ repos: unknown[] }>('/api/repos'),

  get: (owner: string, repo: string) =>
    fetchAPI<{ repo: unknown }>(`/api/repos/${owner}/${repo}`),

  create: (data: { owner: string; name: string; github_repo_id?: number; default_branch?: string }) =>
    fetchAPI<{ repo: unknown }>('/api/repos', { method: 'POST', body: JSON.stringify(data) }),

  delete: (owner: string, repo: string) =>
    fetchAPI<{ message: string }>(`/api/repos/${owner}/${repo}`, { method: 'DELETE' }),

  getConfig: (owner: string, repo: string) =>
    fetchAPI<{ config: unknown }>(`/api/repos/${owner}/${repo}/config`),

  updateConfig: (owner: string, repo: string, config: unknown) =>
    fetchAPI<{ config: unknown }>(`/api/repos/${owner}/${repo}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getAnalytics: (owner: string, repo: string) =>
    fetchAPI<{ analytics: unknown }>(`/api/repos/${owner}/${repo}/analytics`),

  getHistory: (owner: string, repo: string, page = 1) =>
    fetchAPI<{ history: unknown[]; total: number }>(`/api/repos/${owner}/${repo}/history?page=${page}`),
}

// ─── PRs ──────────────────────────────────────────────────────────────────────
export const prsApi = {
  list: (owner: string, repo: string, params?: { sort?: string; order?: string; state?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return fetchAPI<{ prs: unknown[] }>(`/api/repos/${owner}/${repo}/prs${qs ? `?${qs}` : ''}`)
  },

  get: (owner: string, repo: string, prNumber: number) =>
    fetchAPI<{ pr: unknown }>(`/api/repos/${owner}/${repo}/prs/${prNumber}`),

  create: (owner: string, repo: string, data: unknown) =>
    fetchAPI<{ pr: unknown }>(`/api/repos/${owner}/${repo}/prs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  triggerReview: (owner: string, repo: string, prNumber: number, data?: { diff?: string; description?: string }) =>
    fetchAPI<{ message: string }>(`/api/repos/${owner}/${repo}/prs/${prNumber}/review`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getIssues: (owner: string, repo: string, prNumber: number, filters?: { severity?: string; type?: string }) => {
    const qs = new URLSearchParams(filters as Record<string, string>).toString()
    return fetchAPI<{ issues: unknown[] }>(`/api/repos/${owner}/${repo}/prs/${prNumber}/issues${qs ? `?${qs}` : ''}`)
  },

  approve: (owner: string, repo: string, prNumber: number, reviewBody?: string) =>
    fetchAPI<{ message: string; action: string }>(`/api/repos/${owner}/${repo}/prs/${prNumber}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_body: reviewBody }),
    }),

  requestChanges: (owner: string, repo: string, prNumber: number, reviewBody?: string) =>
    fetchAPI<{ message: string; action: string }>(`/api/repos/${owner}/${repo}/prs/${prNumber}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ review_body: reviewBody }),
    }),

  getVoice: (owner: string, repo: string, prNumber: number) =>
    fetchAPI<{ voice: unknown }>(`/api/repos/${owner}/${repo}/prs/${prNumber}/voice`),
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  team: () => fetchAPI<{ analytics: unknown }>('/api/analytics/team'),
}

export { fetchAPI }
