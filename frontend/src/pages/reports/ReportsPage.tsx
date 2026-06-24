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

export function ReportsPage() {
  const [report, setReport] = useState<{ date: string; total: number; breakdown: Record<string, number> } | null>(null)
  const [metrics, setMetrics] = useState<Record<string, { avg_ms: number; count: number }> | null>(null)
  const [deliveryReport, setDeliveryReport] = useState<DeliveryReport | null>(null)

  const loadReport = async () => {
    const data = await api.get("/reports/daily")
    setReport(data)
  }

  const loadMetrics = async () => {
    const data = await api.get("/reports/metrics")
    setMetrics(data)
  }

  const loadDeliveryReport = async () => {
    const data = await api.get("/reports/deliveries")
    setDeliveryReport(data)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <h2 className="text-xl font-semibold text-primary mb-4">Reportes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Resumen Diario</h3>
            <Button onClick={loadReport} size="sm">Cargar</Button>
            {report && (
              <div className="text-sm space-y-1" aria-live="polite">
                <p>Total: <strong>{report.total}</strong></p>
                {Object.entries(report.breakdown).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground">{k}: {v}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Métricas de Acción</h3>
            <Button onClick={loadMetrics} size="sm">Cargar</Button>
            {metrics && <div aria-live="polite">{Object.entries(metrics).map(([k, v]) => (
              <p key={k} className="text-sm text-muted-foreground">{k}: avg {v.avg_ms}ms ({v.count} veces)</p>
            ))}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Reporte de Paquetes</h3>
            <Button onClick={loadDeliveryReport} size="sm">Cargar</Button>
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
      </div>
    </div>
  )
}