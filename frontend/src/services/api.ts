const API_BASE = "/api/v1"

let accessToken: string | null = null

export function setToken(token: string | null) {
  accessToken = token
}

export function getToken() {
  return accessToken
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    accessToken = null
    window.location.href = "/admin"
    throw new Error("Unauthorized")
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
