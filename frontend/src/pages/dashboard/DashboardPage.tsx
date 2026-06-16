import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { useSocket } from "../../hooks/useSocket"
import { Users, LogOut, XCircle } from "lucide-react"

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

export function DashboardPage() {
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

  const handleConfirmDenial = async (id: string) => {
    await api.post(`/visits/${id}/confirm-denial`)
    setVisits((prev) => prev.filter((v) => v.id !== id))
  }

  const activeVisits = visits.filter((v) => v.status !== "denied")
  const deniedVisits = visits.filter((v) => v.status === "denied")

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    escalated: "bg-red-100 text-red-800",
    staff_decision: "bg-orange-100 text-orange-800",
    denied: "bg-gray-200 text-gray-700",
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full space-y-8">
      {/* Active visitors section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Visitantes en el edificio</h2>
            <span className="bg-primary/10 text-primary text-sm font-medium px-2.5 py-0.5 rounded-full">
              {activeVisits.length}
            </span>
          </div>
        </div>

        {activeVisits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              No hay visitantes activos en este momento.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeVisits.map((v) => (
              <Card key={v.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{v.visitor_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-gray-100"}`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {[v.visitor_company, v.tenant_name, v.host_name].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCheckout(v.id)}>
                    <LogOut className="w-4 h-4 mr-1" /> Salida
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Denied visitors section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-600">No recibidos</h2>
            <span className="bg-gray-100 text-gray-600 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {deniedVisits.length}
            </span>
          </div>
        </div>

        {deniedVisits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground text-sm">
              No hay visitantes rechazados pendientes de confirmación.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deniedVisits.map((v) => (
              <Card key={v.id} className="border-gray-200 bg-gray-50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{v.visitor_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-gray-100"}`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {[v.visitor_company, v.tenant_name, v.host_name].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleConfirmDenial(v.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Confirmar rechazo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
