import { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"

interface DeliveryReport {
  total_received: number
  total_collected: number
  pending: number
  collected_by_owner: number
  collected_by_other: number
  daily: Array<{ date: string; received: number; collected: number }>
}

interface EodReport {
  date: string
  generated_at: string
  visits: {
    total: number
    manual_checkouts: number
    auto_checkouts_eod: number
    still_inside: number
  }
  deliveries: {
    received: number
    pending: number
    collected: number
  }
  auto_checkout_details: Array<{
    visit_id: string
    visitor_name: string
    check_in_at: string
    check_out_at: string | null
    host_name: string | null
    purpose: string | null
  }>
  pending_deliveries: Array<{
    delivery_id: string
    courier: string
    recipient_name: string
    check_in_at: string
    guide_number: string | null
  }>
}

const TABS = [
  { id: "daily", label: "Resumen Diario" },
  { id: "metrics", label: "Métricas" },
  { id: "deliveries", label: "Paquetes" },
  { id: "eod", label: "Fin de Día" },
] as const

type TabId = typeof TABS[number]["id"]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("daily")
  
  const [dailyReport, setDailyReport] = useState<{ date: string; total: number; breakdown: Record<string, number> } | null>(null)
  const [metrics, setMetrics] = useState<Record<string, { avg_ms: number; count: number }> | null>(null)
  const [deliveryReport, setDeliveryReport] = useState<DeliveryReport | null>(null)
  const [eodReport, setEodReport] = useState<EodReport | null>(null)

  const loadDailyReport = async () => {
    const data = await api.get("/reports/daily")
    setDailyReport(data)
  }

  const loadMetrics = async () => {
    const data = await api.get("/reports/metrics")
    setMetrics(data)
  }

  const loadDeliveryReport = async () => {
    const data = await api.get("/reports/deliveries")
    setDeliveryReport(data)
  }

  const loadEodReport = async () => {
    const data = await api.get("/reports/eod")
    setEodReport(data)
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—"
    const date = new Date(isoString)
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "daily":
        return (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Resumen Diario</h3>
                <Button onClick={loadDailyReport} size="sm">Cargar</Button>
              </div>
              {dailyReport && (
                <div className="text-sm space-y-1" aria-live="polite">
                  <p>Fecha: <strong>{dailyReport.date}</strong></p>
                  <p>Total: <strong>{dailyReport.total}</strong></p>
                  {Object.entries(dailyReport.breakdown).map(([k, v]) => (
                    <p key={k} className="text-muted-foreground">{k}: {v}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      case "metrics":
        return (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Métricas de Acción</h3>
                <Button onClick={loadMetrics} size="sm">Cargar</Button>
              </div>
              {metrics && (
                <div aria-live="polite">
                  {Object.entries(metrics).map(([k, v]) => (
                    <p key={k} className="text-sm text-muted-foreground">
                      {k}: avg {v.avg_ms}ms ({v.count} veces)
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      case "deliveries":
        return (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Reporte de Paquetes</h3>
                <Button onClick={loadDeliveryReport} size="sm">Cargar</Button>
              </div>
              {deliveryReport && (
                <div className="text-sm space-y-1" aria-live="polite">
                  <p>Recibidos: <strong>{deliveryReport.total_received}</strong></p>
                  <p>Entregados: <strong>{deliveryReport.total_collected}</strong></p>
                  <p>Pendientes: <strong>{deliveryReport.pending}</strong></p>
                  <p className="text-muted-foreground">→ Al dueño: {deliveryReport.collected_by_owner}</p>
                  <p className="text-muted-foreground">→ A tercero: {deliveryReport.collected_by_other}</p>
                  {deliveryReport.daily.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-muted-foreground">Detalle diario</summary>
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {deliveryReport.daily.map((d) => (
                          <li key={d.date}>{d.date}: {d.received} recibidos, {d.collected} entregados</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      case "eod":
        return (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Reporte Fin de Día</h3>
                <Button onClick={loadEodReport} size="sm">Cargar</Button>
              </div>
              
              {eodReport && (
                <div className="space-y-4" aria-live="polite">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Total Visitas</p>
                      <p className="text-xl font-bold">{eodReport.visits.total}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Checkouts Manuales</p>
                      <p className="text-xl font-bold text-green-600">{eodReport.visits.manual_checkouts}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Auto-Checkouts (EOD)</p>
                      <p className="text-xl font-bold text-blue-600">{eodReport.visits.auto_checkouts_eod}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Aún Dentro</p>
                      <p className="text-xl font-bold text-red-600">{eodReport.visits.still_inside}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Paquetes Recibidos</p>
                      <p className="text-xl font-bold">{eodReport.deliveries.received}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Entregados</p>
                      <p className="text-xl font-bold text-green-600">{eodReport.deliveries.collected}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground">Pendientes</p>
                      <p className="text-xl font-bold text-yellow-600">{eodReport.deliveries.pending}</p>
                    </div>
                  </div>

                  {eodReport.auto_checkout_details.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Auto-Checkouts del Día</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eodReport.auto_checkout_details.map((v) => (
                          <div key={v.visit_id} className="bg-muted/30 rounded-lg p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{v.visitor_name}</span>
                              <span className="text-muted-foreground">{formatTime(v.check_in_at)} - {formatTime(v.check_out_at)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Visita a: {v.host_name || "—"}</span>
                              <span>{v.purpose || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eodReport.pending_deliveries.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Entregas Pendientes</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eodReport.pending_deliveries.map((d) => (
                          <div key={d.delivery_id} className="bg-muted/30 rounded-lg p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{d.recipient_name}</span>
                              <span className="text-muted-foreground">{formatTime(d.check_in_at)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Courier: {d.courier}</span>
                              <span>Guía: {d.guide_number || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(eodReport.auto_checkout_details.length === 0 && eodReport.pending_deliveries.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay auto-checkouts ni entregas pendientes para esta fecha.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <h2 className="text-xl font-semibold text-primary mb-4">Reportes</h2>
      
      {/* Custom Tabs */}
      <div className="flex border-b border-border mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  )
}