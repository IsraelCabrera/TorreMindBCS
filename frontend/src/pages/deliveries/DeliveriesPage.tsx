import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { api } from "../../services/api"
import { Package, Plus, Filter } from "lucide-react"

interface Delivery {
  id: string
  courier: string
  guide_number: string | null
  recipient_name: string
  recipient_phone: string | null
  description: string | null
  status: string
  check_in_at: string
  collected_at: string | null
  collected_by: string | null
  collected_by_name: string | null
  notification_sent: boolean
}

export function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending")
  const [form, setForm] = useState({ courier: "", recipient_name: "", guide_number: "", description: "" })
  const [collectDialogOpen, setCollectDialogOpen] = useState(false)
  const [collectDeliveryId, setCollectDeliveryId] = useState<string | null>(null)
  const [collectBy, setCollectBy] = useState<"owner" | "other">("owner")
  const [collectByName, setCollectByName] = useState("")

  const fetchDeliveries = () => {
    api.get(`/deliveries?status=${statusFilter}`).then(setDeliveries).catch(console.error)
  }

  useEffect(() => { fetchDeliveries() }, [statusFilter])

  const createDelivery = async () => {
    await api.post("/deliveries", form)
    setForm({ courier: "", recipient_name: "", guide_number: "", description: "" })
    setShowForm(false)
    fetchDeliveries()
  }

  const openCollectDialog = (id: string, by: "owner" | "other") => {
    setCollectDeliveryId(id)
    setCollectBy(by)
    setCollectByName("")
    setCollectDialogOpen(true)
  }

  const confirmCollect = async () => {
    if (!collectDeliveryId) return
    await api.post(`/deliveries/${collectDeliveryId}/collect`, {
      collected_by: collectBy,
      collected_by_name: collectBy === "other" ? collectByName : null
    })
    setCollectDialogOpen(false)
    setCollectDeliveryId(null)
    fetchDeliveries()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Paquetes en recepción</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "pending" ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            aria-pressed={statusFilter === "pending"}
          >
            Pendientes
          </Button>
          <Button
            variant={statusFilter === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
          >
            <Filter className="w-4 h-4 mr-1" aria-hidden="true" /> Todos
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm" aria-expanded={showForm} aria-controls="delivery-form">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Nuevo paquete
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-4" id="delivery-form">
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="delivery-courier" className="sr-only">Mensajería</label>
                <input id="delivery-courier" placeholder="Mensajería *" value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
              <div>
                <label htmlFor="delivery-recipient" className="sr-only">Destinatario</label>
                <input id="delivery-recipient" placeholder="Destinatario *" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
              <div>
                <label htmlFor="delivery-guide" className="sr-only">Número de guía</label>
                <input id="delivery-guide" placeholder="Número de guía" value={form.guide_number} onChange={(e) => setForm({ ...form, guide_number: e.target.value })}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
              <div>
                <label htmlFor="delivery-description" className="sr-only">Descripción</label>
                <input id="delivery-description" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
            </div>
            <Button onClick={createDelivery} disabled={!form.courier || !form.recipient_name} className="w-full">
              Registrar Paquete
            </Button>
          </CardContent>
        </Card>
      )}

      <div aria-live="polite" aria-atomic="true">
        {deliveries.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground">No hay paquetes{statusFilter === "pending" ? " pendientes" : ""}.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{d.courier} — {d.recipient_name}</p>
                    {d.guide_number && <p className="text-sm text-muted-foreground">Guía: {d.guide_number}</p>}
                    <p className="text-sm text-muted-foreground">{d.description || "Sin descripción"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.check_in_at).toLocaleString()}
                      {d.status === "collected" && d.collected_at && (
                        <>
                          ` · Recogido: ${new Date(d.collected_at).toLocaleString()} (${d.collected_by === "owner" ? "dueño" : "tercero"})`
                          {d.collected_by === "other" && d.collected_by_name && ` — ${d.collected_by_name}`}
                        </>
                      )}
                    </p>
                  </div>
                  {d.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => openCollectDialog(d.id, "owner")}>
                        👤 Entregado a dueño
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openCollectDialog(d.id, "other")}>
                        👥 Entregado a tercero
                      </Button>
                    </div>
                  )}
                  {d.status === "collected" && (
                    <span className="text-sm text-green-600 dark:text-green-400">
                      ✓ {d.collected_by === "owner" ? "Entregado al dueño" : "Entregado a tercero"}
                      {d.collected_by === "other" && d.collected_by_name && ` — ${d.collected_by_name}`}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar entrega</DialogTitle>
          </DialogHeader>
          {collectBy === "other" && (
            <div className="space-y-4">
              <p>¿Quién recoge el paquete?</p>
              <Input
                placeholder="Nombre de la persona"
                value={collectByName}
                onChange={(e) => setCollectByName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}
          {collectBy === "owner" && (
            <p>¿Confirmar que el destinatario recogió su paquete?</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmCollect} disabled={collectBy === "other" && !collectByName.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}