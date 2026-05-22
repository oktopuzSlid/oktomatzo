const API_BASE = 'http://localhost:8001'

export interface HealthResponse {
  status: string
  version: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user_name: string
}

export interface UserResponse {
  id: number
  name: string
  email: string
}

export interface GenerateResponse {
  success: boolean
  message: string
  image_url?: string
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('Backend unavailable')
  return res.json()
}

export async function signup(name: string, email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Signup failed')
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('user_name', data.user_name)
  return data
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Login failed')
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('user_name', data.user_name)
  return data
}

export async function getProfile(): Promise<UserResponse> {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Not logged in')
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to get profile')
  return res.json()
}

export async function generateImage(prompt: string): Promise<GenerateResponse> {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Not logged in')
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Generation failed')
  return data
}

export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user_name')
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token')
}

export function getUserName(): string | null {
  return localStorage.getItem('user_name')
}
