import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { login, getUser, type User } from "../../services/auth"
import { api } from "../../services/api"
import { useNavigate } from "react-router-dom"
import { Shield, Users, ClipboardList, X, Trash2, Edit } from "lucide-react"

interface SystemUser {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
}

interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

type Tab = "users" | "audit"

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    try {
      await login(email, password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 w-full">
      <Card>
        <CardContent className="space-y-6 p-8 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-primary">Iniciar Sesión</h2>
          <p className="text-sm text-muted-foreground">Acceso para administradores y personal del lobby</p>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="space-y-3 text-left">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-primary mb-1">Email</label>
              <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-primary mb-1">Contraseña</label>
              <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
          </div>
          <Button onClick={handleLogin} disabled={loading || !email || !password} className="w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function NewUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("lobby_staff")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    setLoading(true)
    setError("")
    try {
      await api.post("/admin/users", { email, password, name, role })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario")
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Nuevo Usuario</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring">
            <option value="lobby_staff">Lobby Staff</option>
            <option value="admin">Admin</option>
            <option value="security">Seguridad</option>
          </select>
        </div>
        <Button onClick={handleCreate} disabled={loading || !name || !email || !password} className="w-full">
          {loading ? "Creando..." : "Crear Usuario"}
        </Button>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-base text-primary font-medium">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  )
}

function EditUserDialog({ user, onClose, onUpdated }: { user: SystemUser; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    setLoading(true)
    setError("")
    try {
      const body: Record<string, string> = { name: name.trim(), email: email.trim(), role }
      if (password) body.password = password
      await api.put(`/admin/users/${user.id}`, body)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario")
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Editar Usuario</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Nueva contraseña (dejar vacío para mantener)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring">
            <option value="lobby_staff">Lobby Staff</option>
            <option value="admin">Admin</option>
            <option value="security">Seguridad</option>
          </select>
        </div>
        <Button onClick={handleSave} disabled={loading || !name.trim() || !email.trim()} className="w-full">
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  )
}

function AdminPanel() {
  const [tab, setTab] = useState<Tab>("users")
  const [users, setUsers] = useState<SystemUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [showNewUser, setShowNewUser] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null)
  const currentUser = getUser()

  const fetchUsers = () => {
    api.get("/admin/users").then(setUsers).catch(console.error)
  }

  const fetchAuditLogs = () => {
    api.get("/admin/audit-log").then(setAuditLogs).catch(console.error)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDeactivate = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`)
      setConfirmUserId(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
    }
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700",
      lobby_staff: "bg-blue-100 text-blue-700",
      security: "bg-green-100 text-green-700",
    }
    const labels: Record<string, string> = {
      admin: "Admin",
      lobby_staff: "Staff",
      security: "Seguridad",
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || "bg-gray-100 text-gray-700"}`}>
        {labels[role] || role}
      </span>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-primary">Panel de Administración</h2>
      </div>

      <div className="flex gap-2 mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
            ${tab === "users" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          role="tab"
          aria-selected={tab === "audit"}
          onClick={() => { setTab("audit"); fetchAuditLogs() }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
            ${tab === "audit" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
        >
          <ClipboardList className="w-4 h-4" />
          Bitácora
        </button>
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewUser(true)}>
              <Users className="w-4 h-4 mr-1" />
              Nuevo Usuario
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-primary">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${u.is_active ? "bg-green-500" : "bg-red-400"}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.is_active ? (
                          <>
                            <button
                              onClick={() => setEditUserId(u.id)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              aria-label={`Editar ${u.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => setConfirmUserId(u.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                aria-label={`Desactivar ${u.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Acción</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Objetivo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-primary font-medium">{log.user_id ? log.user_id.slice(0, 8) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.target_type}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{log.target_id?.slice(0, 8) || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No hay registros de actividad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNewUser && (
        <NewUserDialog onClose={() => setShowNewUser(false)} onCreated={() => { setShowNewUser(false); fetchUsers() }} />
      )}

      {editUserId && (() => {
        const u = users.find(u => u.id === editUserId)
        return u ? <EditUserDialog user={u} onClose={() => setEditUserId(null)} onUpdated={() => { setEditUserId(null); fetchUsers() }} /> : null
      })()}

      {confirmUserId && (
        <ConfirmDialog
          message="¿Desactivar este usuario? No podrá iniciar sesión."
          onConfirm={() => handleDeactivate(confirmUserId)}
          onCancel={() => setConfirmUserId(null)}
        />
      )}
    </div>
  )
}

export function AdminPage() {
  const [user, setUser] = useState(getUser())
  const navigate = useNavigate()

  useEffect(() => {
    const u = getUser()
    setUser(u)
  }, [])

  if (!user) {
    return <LoginForm onLogin={() => setUser(getUser())} />
  }

  if (user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 w-full text-center">
        <Card>
          <CardContent className="space-y-4 p-8">
            <Shield className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-primary">Acceso Denegado</h2>
            <p className="text-sm text-muted-foreground">
              No tienes permisos de administrador para acceder a esta sección.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminPanel />
}
