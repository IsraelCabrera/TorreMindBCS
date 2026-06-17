const API_BASE = "/api/v1"
const TOKEN_KEY = "vlms_access_token"
const REFRESH_TOKEN_KEY = "vlms_refresh_token"

let accessToken: string | null = localStorage.getItem(TOKEN_KEY)

export function setToken(token: string | null) {
  accessToken = token
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getToken() {
  return accessToken
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setToken(data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    } else {
      setToken(null)
      setRefreshToken(null)
      window.location.href = "/admin-page-mind"
      throw new Error("Sesión expirada")
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Request failed")
  }
  return res.json()
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body?: unknown) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
}

async function devRequest(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Dev-Mode": "true",
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Request failed")
  }
  return res.json()
}

export const devApi = {
  get: (path: string) => devRequest(path),
  post: (path: string, body?: unknown) => devRequest(path, { method: "POST", body: JSON.stringify(body) }),
}
