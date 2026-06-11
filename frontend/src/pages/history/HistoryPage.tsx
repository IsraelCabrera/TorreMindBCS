import { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { Search } from "lucide-react"

interface Visit {
  id: string
  visitor_name: string
  visitor_company: string | null
  visitor_type: string
  status: string
  host_name: string | null
  check_in_at: string
  check_out_at: string | null
  tenant_name: string | null
}

export function HistoryPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [filters, setFilters] = useState({ visitor_name: "", tenant_name: "", status: "", visitor_type: "" })
  const [loaded, setLoaded] = useState(false)

  const search = async () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const data = await api.get(`/visits/history?${params}`)
    setVisits(data)
    setLoaded(true)
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800", escalated: "bg-red-100 text-red-800",
    checked_out: "bg-gray-100 text-gray-600", staff_decision: "bg-orange-100 text-orange-800",
  }

  const statusLabels: Record<string, string> = {
    pending: "Pendiente", approved: "Aprobado",
    denied: "Denegado", escalated: "Escalado",
    checked_out: "Check-out", staff_decision: "Revisión",
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full">
      <h2 className="text-xl font-semibold text-primary mb-4">Historial de Visitas</h2>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-3 p-4">
          <label htmlFor="history-visitor" className="sr-only">Nombre del visitante</label>
          <input id="history-visitor" placeholder="Visitante" value={filters.visitor_name} onChange={(e) => setFilters({ ...filters, visitor_name: e.target.value })}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring flex-1 min-w-[150px]" />
          <label htmlFor="history-tenant" className="sr-only">Nombre del tenant</label>
          <input id="history-tenant" placeholder="Tenant" value={filters.tenant_name} onChange={(e) => setFilters({ ...filters, tenant_name: e.target.value })}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring flex-1 min-w-[150px]" />
          <label htmlFor="history-status" className="sr-only">Filtrar por estado</label>
          <select id="history-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option><option value="approved">Aprobado</option>
            <option value="denied">Denegado</option><option value="checked_out">Check-out</option>
          </select>
          <Button onClick={search} size="sm"><Search className="w-4 h-4 mr-1" aria-hidden="true" /> Buscar</Button>
        </CardContent>
      </Card>

      {!loaded && <p className="text-center text-muted-foreground py-8">Use los filtros y presione "Buscar"</p>}

      {loaded && visits.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No se encontraron visitas.</p>
      )}

      <div className="space-y-2" aria-live="polite" aria-atomic="true">
        {visits.map((v) => (
          <Card key={v.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.visitor_name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-gray-100"}`}>
                    <span className="sr-only">Estado: </span>{statusLabels[v.status] || v.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{v.visitor_type}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[v.visitor_company, v.tenant_name, v.host_name].filter(Boolean).join(" — ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Entrada: {new Date(v.check_in_at).toLocaleString()}
                  {v.check_out_at && ` — Salida: ${new Date(v.check_out_at).toLocaleString()}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
