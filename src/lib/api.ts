const API = ''

export interface HealthResponse { status: string; version: string }
export interface TokenResponse { access_token: string; token_type: string; user_name: string }
export interface UserResponse { id: number; name: string; email: string }

async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers || {}) as Record<string, string> }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(API + path, { ...options, headers })
  if (!res.ok) {
    let msg = 'Request failed'
    try { const d = await res.json(); msg = d.detail || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function checkHealth() { return authFetch('/api/health') }
export async function signup(name: string, email: string, password: string) {
  const data = await authFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('user_name', data.user_name)
  return data
}
export async function login(email: string, password: string) {
  const data = await authFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('user_name', data.user_name)
  return data
}
export async function getProfile() { return authFetch('/api/auth/me') }
export function logout() { localStorage.removeItem('token'); localStorage.removeItem('user_name') }
export function isLoggedIn() { return !!localStorage.getItem('token') }
export function getUserName() { return localStorage.getItem('user_name') }

// Saves
export async function saveState(projectSlug: string, label: string, state: object) {
  return authFetch('/api/saves', { method: 'POST', body: JSON.stringify({ project_slug: projectSlug, label, state }) })
}
export async function loadSaves(slug: string) { return authFetch('/api/saves/' + slug) }
export async function deleteSave(id: number) { return authFetch('/api/saves/' + id, { method: 'DELETE' }) }

// Scores
export async function submitScore(projectSlug: string, score: number, metadata = {}) {
  return authFetch('/api/scores', { method: 'POST', body: JSON.stringify({ project_slug: projectSlug, score, metadata }) })
}
export async function getLeaderboard(slug: string) { return authFetch('/api/scores/' + slug + '?limit=20') }

// Models
export async function uploadModel(projectSlug: string, file: File) {
  const token = localStorage.getItem('token')
  const form = new FormData()
  form.append('project_slug', projectSlug)
  form.append('file', file)
  const res = await fetch(API + '/api/models/upload', { method: 'POST', headers: token ? { 'Authorization': 'Bearer ' + token } : {}, body: form })
  if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Upload failed') }
  return res.json()
}
export async function listModels() { return authFetch('/api/models') }
export async function deleteModel(id: number) { return authFetch('/api/models/' + id, { method: 'DELETE' }) }
