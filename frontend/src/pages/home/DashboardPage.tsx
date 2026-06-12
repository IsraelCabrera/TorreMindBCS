import { useState } from "react"
import { SearchBar } from "../../components/home/SearchBar"
import { QuickActions, type ActionType } from "../../components/home/QuickActions"
import { StatusBoard } from "../../components/home/StatusBoard"
import { CheckInPanel } from "../../components/home/CheckInPanel"
import { DeliveryPanel } from "../../components/home/DeliveryPanel"
import type { VisitorResult } from "../../components/home/SearchBar"
import { getUser } from "../../services/auth"

type PanelMode = "checkin" | "delivery" | null

export function DashboardPage() {
  const [panel, setPanel] = useState<PanelMode>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorResult | null>(null)
  const [panelVisitorType, setPanelVisitorType] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)
  const user = getUser()
  const isSecurity = user?.role === "security"

  const closePanel = () => {
    setPanel(null)
    setSelectedVisitor(null)
    setPanelVisitorType(undefined)
  }

  const handleSelectVisitor = (visitor: VisitorResult) => {
    setSelectedVisitor(visitor)
    setPanel("checkin")
  }

  const handleNewVisitor = () => {
    setSelectedVisitor(null)
    setPanel("checkin")
  }

  const handleAction = (action: ActionType) => {
    if (action === "delivery") {
      setPanel("delivery")
      return
    }
    const typeMap: Record<string, string> = {
      vendor: "vendor",
      tenant_employee: "tenant_employee",
      guest: "tenant_visitor",
    }
    setPanelVisitorType(typeMap[action])
    setSelectedVisitor(null)
    setPanel("checkin")
  }

  const handleSuccess = () => {
    closePanel()
    setRefreshKey((k) => k + 1)
  }

  return (
    <section className="w-full py-4 flex flex-col flex-1">
      <div className="max-w-4xl mx-auto px-4 w-full space-y-4">
        <div className="text-center mb-1">
          <h2 className="text-xl font-bold text-primary">
            Panel de Recepción — MIND
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSecurity ? "Monitoreo de visitantes en tiempo real" : "Búsqueda rápida · Registro en segundos"}
          </p>
        </div>

        <SearchBar
          onSelectVisitor={isSecurity ? () => {} : handleSelectVisitor}
          onNewVisitor={isSecurity ? () => {} : handleNewVisitor}
        />

        {!isSecurity && <QuickActions onAction={handleAction} />}

        <div aria-live="polite" aria-atomic="true">
          {panel === "checkin" && !isSecurity && (
            <CheckInPanel
              visitor={selectedVisitor}
              defaultType={panelVisitorType}
              onClose={closePanel}
              onSuccess={handleSuccess}
            />
          )}

          {panel === "delivery" && !isSecurity && (
            <DeliveryPanel
              onClose={closePanel}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        <StatusBoard key={refreshKey} />
      </div>
    </section>
  )
}
