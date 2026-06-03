import { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { login } from "../../services/auth"
import { useNavigate } from "react-router-dom"

export function AdminPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    try {
      await login(email, password)
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 w-full">
      <Card>
        <CardContent className="space-y-6 p-8 text-center">
          <h2 className="text-2xl font-bold text-primary">Iniciar Sesión</h2>
          <p className="text-sm text-muted-foreground">Acceso para administradores y personal del lobby</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-3 text-left">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
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
