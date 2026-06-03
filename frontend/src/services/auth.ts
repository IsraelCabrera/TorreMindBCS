import { api, setToken } from "./api"

export interface User {
  id: string
  email: string
  name: string
  role: string
}

let currentUser: User | null = null

export function setUser(user: User | null) {
  currentUser = user
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
