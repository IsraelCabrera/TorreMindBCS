import { api, setToken } from "./api"

export interface User {
  id: string
  email: string
  name: string
  role: string
}

const USER_KEY = "vlms_current_user"

let currentUser: User | null = (() => {
  try {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? (JSON.parse(stored) as User) : null
  } catch {
    return null
  }
})()

export function setUser(user: User | null) {
  currentUser = user
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

export function getUser(): User | null {
  return currentUser
}

export function isAdmin(): boolean {
  return currentUser?.role === "admin"
}

export async function login(email: string, password: string): Promise<User> {
  const data = await api.post("/auth/login", { email, password })
  setToken(data.access_token)
  setUser(data.user)
  return data.user
}

export async function fetchMe(): Promise<User | null> {
  try {
    const user = await api.get("/auth/me")
    setUser(user)
    return user
  } catch {
    return null
  }
}

export function logout() {
  setToken(null)
  setUser(null)
  window.location.href = "/admin-page-mind"
}
