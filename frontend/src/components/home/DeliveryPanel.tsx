import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { api } from "../../services/api"
import { X } from "lucide-react"

interface Tenant {
  id: string
  name: string
  contacts: Array<{ id: string; name: string }>
}

interface DeliveryPanelProps {
  onClose: () => void
  onSuccess: () => void
}

const couriers = ["DHL", "FedEx", "Estafeta", "UPS", "Correos de México", "Otro"]

export function DeliveryPanel({ onClose, onSuccess }: DeliveryPanelProps) {
  const [courier, setCourier] = useState("")
  const [recipientQuery, setRecipientQuery] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [description, setDescription] = useState("")
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false)

  useEffect(() => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }, [])

  const recipientOptions = useMemo(() => {
    const options: Array<{ label: string; value: string }> = []
    for (const t of tenants) {
      if (t.contacts.length > 0) {
        for (const c of t.contacts) {
          options.push({ label: `${c.name} (${t.name})`, value: c.name })
        }
      } else {
        options.push({ label: t.name, value: t.name })
      }
    }
    return options
  }, [tenants])

  const filteredRecipients = useMemo(() => {
    if (recipientQuery.length < 1) return recipientOptions
    const q = recipientQuery.toLowerCase()
    return recipientOptions.filter((r) => r.label.toLowerCase().includes(q))
  }, [recipientQuery, recipientOptions])

  const selectRecipient = (name: string) => {
    setRecipientName(name)
    setRecipientQuery(name)
    setShowRecipientDropdown(false)
  }

  const handleSubmit = async () => {
    if (!courier || !recipientName) return
    setLoading(true)
    try {
      const delivery = await api.post("/deliveries", {
        courier,
        recipient_name: recipientName,
        description: description || null,
      })
      await api.post(`/deliveries/${delivery.id}/notify`)
      onSuccess()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-l-4 border-l-accent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary">Registrar Paquete</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-primary mb-0.5">Mensajería *</label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              >
                <option value="">Seleccionar...</option>
                {couriers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-primary mb-0.5">Destinatario *</label>
              <input
                type="text"
                value={recipientQuery}
                onChange={(e) => { setRecipientQuery(e.target.value); setShowRecipientDropdown(true) }}
                onFocus={() => setShowRecipientDropdown(true)}
                placeholder="Buscar..."
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
              {showRecipientDropdown && filteredRecipients.length > 0 && (
                <div className="absolute z-50 mt-0.5 w-full border border-border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto">
                  {filteredRecipients.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectRecipient(r.value)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-primary mb-0.5">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Caja mediana, documentos..."
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !courier || !recipientName} className="w-full">
            {loading ? "Notificando..." : "Notificar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
