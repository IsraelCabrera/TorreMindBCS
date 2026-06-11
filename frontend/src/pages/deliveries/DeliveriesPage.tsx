import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { Package, Plus } from "lucide-react"

interface Delivery {
  id: string
  courier: string
  recipient_name: string
  recipient_phone: string | null
  description: string | null
  status: string
  check_in_at: string
  notification_sent: boolean
}

export function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ courier: "", recipient_name: "", recipient_phone: "", description: "" })

  useEffect(() => { api.get("/deliveries").then(setDeliveries).catch(console.error) }, [])

  const createDelivery = async () => {
    await api.post("/deliveries", form)
    setForm({ courier: "", recipient_name: "", recipient_phone: "", description: "" })
    setShowForm(false)
    api.get("/deliveries").then(setDeliveries).catch(console.error)
  }

  const markCollected = async (id: string) => {
    await api.post(`/deliveries/${id}/collect`)
    setDeliveries((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Paquetes en recepción</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" aria-expanded={showForm} aria-controls="delivery-form">
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Nuevo paquete
        </Button>
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
                <label htmlFor="delivery-phone" className="sr-only">Teléfono</label>
                <input id="delivery-phone" placeholder="Teléfono" value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
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
          <Card><CardContent className="text-center py-12 text-muted-foreground">No hay paquetes pendientes.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{d.courier} — {d.recipient_name}</p>
                    <p className="text-sm text-muted-foreground">{d.description || "Sin descripción"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.check_in_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" onClick={() => markCollected(d.id)}>Recogido</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
