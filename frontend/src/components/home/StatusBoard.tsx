import { useState, useEffect } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { api } from "../../services/api"
import { useSocket } from "../../hooks/useSocket"
import { Users, LogOut } from "lucide-react"

interface ActiveVisit {
  id: string
  visitor_name: string
  visitor_company: string | null
  visitor_type: string
  status: string
  host_name: string | null
  check_in_at: string
  tenant_name: string | null
}

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  pending: { label: "Esperando", dot: "bg-yellow-400", bg: "border-l-yellow-400" },
  approved: { label: "Aprobado", dot: "bg-green-400", bg: "border-l-green-400" },
  denied: { label: "Denegado", dot: "bg-red-400", bg: "border-l-red-400" },
  escalated: { label: "Escalado", dot: "bg-orange-400", bg: "border-l-orange-400" },
  staff_decision: { label: "Revisión", dot: "bg-orange-400", bg: "border-l-orange-400" },
  checked_out: { label: "Salió", dot: "bg-gray-400", bg: "border-l-gray-400" },
}

export function StatusBoard() {
  const [visits, setVisits] = useState<ActiveVisit[]>([])
  const { on } = useSocket()

  useEffect(() => {
    api.get("/visits/active").then(setVisits).catch(console.error)
  }, [])

  useEffect(() => {
    const unsub1 = on("visit:created", () => {
      api.get("/visits/active").then(setVisits).catch(console.error)
    })
    const unsub2 = on("visit:updated", () => {
      api.get("/visits/active").then(setVisits).catch(console.error)
    })
    return () => { unsub1(); unsub2() }
  }, [on])

  const handleCheckout = async (id: string) => {
    await api.post(`/visits/${id}/check-out`)
    setVisits((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-primary">Visitantes en el edificio</h3>
        <span className="bg-primary/10 text-primary text-sm font-medium px-2.5 py-0.5 rounded-full">
          {visits.length}
        </span>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {visits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground text-sm">
              No hay visitantes activos en este momento.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visits.map((v) => {
              const cfg = statusConfig[v.status] || { label: v.status, dot: "bg-gray-400", bg: "border-l-gray-400" }
              return (
                <Card key={v.id} className={`border-l-4 ${cfg.bg}`}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} aria-hidden="true" />
                        <h4 className="font-semibold text-foreground truncate">{v.visitor_name}</h4>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {v.tenant_name && <span>{v.tenant_name}</span>}
                        {v.host_name && <span> → {v.host_name}</span>}
                        {!v.tenant_name && !v.host_name && v.visitor_company && <span>{v.visitor_company}</span>}
                        <span className="ml-2 text-xs">
                          {new Date(v.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleCheckout(v.id)}>
                      <LogOut className="w-4 h-4 mr-1" aria-hidden="true" /> Salida
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
