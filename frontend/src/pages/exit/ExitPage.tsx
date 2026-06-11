import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { ArrowLeft, Search, LogOut } from "lucide-react"

export function ExitPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; visitor_name: string; tenant_name: string | null; check_in_at: string }>>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const data = await api.get(`/visits/history?visitor_name=${encodeURIComponent(q)}&status=pending&per_page=10`)
      setResults(data)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleCheckout = async (id: string) => {
    await api.post(`/visits/${id}/check-out`)
    setResults((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 w-full">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Volver
      </Button>

      <Card>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary">Registre Su Salida</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use su ID de Entrada o nombre para registrar su salida del edificio.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="exit-search" className="text-sm font-medium text-primary">Nombre del visitante</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  id="exit-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nombre del visitante..."
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                />
                <Search className="absolute right-3 top-2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Buscando...</p>}

          <div aria-live="polite" aria-atomic="true">
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <div>
                      <p className="font-medium text-sm">{r.visitor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.tenant_name || "Sin anfitrión"} — {new Date(r.check_in_at).toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleCheckout(r.id)}>
                      <LogOut className="w-4 h-4 mr-1" /> Salida
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
