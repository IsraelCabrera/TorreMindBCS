import { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"

export function ReportsPage() {
  const [report, setReport] = useState<{ date: string; total: number; breakdown: Record<string, number> } | null>(null)
  const [metrics, setMetrics] = useState<Record<string, { avg_ms: number; count: number }> | null>(null)

  const loadReport = async () => {
    const data = await api.get("/reports/daily")
    setReport(data)
  }

  const loadMetrics = async () => {
    const data = await api.get("/reports/metrics")
    setMetrics(data)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <h2 className="text-xl font-semibold text-primary mb-4">Reportes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Resumen Diario</h3>
            <Button onClick={loadReport} size="sm">Cargar</Button>
            {report && (
              <div className="text-sm space-y-1">
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
            {metrics && Object.entries(metrics).map(([k, v]) => (
              <p key={k} className="text-sm text-muted-foreground">{k}: avg {v.avg_ms}ms ({v.count} veces)</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
