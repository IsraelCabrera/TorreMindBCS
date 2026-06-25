import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { api } from "../../services/api"
import { X, Search } from "lucide-react"

interface TenantContact {
  id: string
  name: string
  phone: string | null
  tenant_name: string
}

interface DeliveryFormProps {
  onClose?: () => void
  onSuccess?: () => void
  showCloseButton?: boolean
  title?: string
  submitLabel?: string
}

const couriers = ["DHL", "FedEx", "Estafeta", "UPS", "Correos de México"]

export function DeliveryForm({
  onClose,
  onSuccess,
  showCloseButton = true,
  title = "Registrar Paquete",
  submitLabel = "Registrar",
}: DeliveryFormProps) {
  const [courier, setCourier] = useState<string>("")
  const [customCourier, setCustomCourier] = useState<string>("")
  const [recipientQuery, setRecipientQuery] = useState<string>("")
  const [recipientName, setRecipientName] = useState<string>("")
  const [recipientPhone, setRecipientPhone] = useState<string>("")
  const [guideNumber, setGuideNumber] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [tenants, setTenants] = useState<TenantContact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false)

  useEffect(() => {
    api.get("/tenants")
      .then((data: Array<{ id: string; name: string; contacts: Array<{ id: string; name: string; phone: string | null }> }>) => {
        const contacts: TenantContact[] = []
        for (const t of data) {
          if (t.contacts && t.contacts.length > 0) {
            for (const c of t.contacts) {
              contacts.push({
                id: c.id,
                name: c.name,
                phone: c.phone,
                tenant_name: t.name,
              })
            }
          } else {
            contacts.push({
              id: `tenant-${t.id}`,
              name: t.name,
              phone: null,
              tenant_name: "",
            })
          }
        }
        setTenants(contacts)
      })
      .catch(console.error)
  }, [])

  const filteredRecipients = useMemo(() => {
    if (recipientQuery.length < 1) return tenants
    const q = recipientQuery.toLowerCase()
    return tenants.filter((r) =>
      (r.name + (r.tenant_name ? ` (${r.tenant_name})` : "")).toLowerCase().includes(q)
    )
  }, [recipientQuery, tenants])

  const selectRecipient = useCallback((name: string, phone: string | null) => {
    setRecipientName(name)
    setRecipientPhone(phone || "")
    setRecipientQuery(name)
    setShowRecipientDropdown(false)
  }, [])

  const handleSubmit = async () => {
    if (!courier || !recipientName) return
    setLoading(true)
    setError("")
    try {
      await api.post("/deliveries", {
        courier,
        guide_number: guideNumber || null,
        recipient_name: recipientName,
        recipient_phone: recipientPhone || null,
        description: description || null,
      })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar")
    } finally {
      setLoading(false)
    }
  }

  const [isCustomCourier, setIsCustomCourier] = useState(false)

  const handleCourierChange = (value: string) => {
    if (value === "custom") {
      setIsCustomCourier(true)
      setCourier("")
    } else {
      setCourier(value)
      setIsCustomCourier(false)
      setCustomCourier("")
    }
  }

  const effectiveCourier = isCustomCourier ? customCourier : courier

  return (
    <Card className="border-l-4 border-l-accent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary">{title}</h3>
          {showCloseButton && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="delivery-courier" className="block text-xs font-medium text-primary mb-0.5">
                Mensajería *
              </label>
              <Select value={isCustomCourier ? "custom" : courier} onValueChange={handleCourierChange}>
                <SelectTrigger id="delivery-courier">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-accent">
                    + Otra mensajería...
                  </SelectItem>
                </SelectContent>
              </Select>
              {isCustomCourier && (
                <Input
                  id="delivery-custom-courier"
                  placeholder="Nombre de mensajería"
                  value={customCourier}
                  onChange={(e) => setCustomCourier(e.target.value)}
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>
            <div>
              <label htmlFor="delivery-guide" className="block text-xs font-medium text-primary mb-0.5">
                No. Guía (opcional)
              </label>
              <Input
                id="delivery-guide"
                type="text"
                value={guideNumber}
                onChange={(e) => setGuideNumber(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="relative">
              <label htmlFor="delivery-recipient" className="block text-xs font-medium text-primary mb-0.5">
                Destinatario *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id="delivery-recipient"
                  type="text"
                  value={recipientQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setRecipientQuery(value)
                    setRecipientName(value) // Allow custom names
                    setShowRecipientDropdown(true)
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRecipientDropdown(false), 200)}
                  placeholder="Buscar contacto o escribir nombre..."
                  role="combobox"
                  aria-expanded={showRecipientDropdown}
                  aria-haspopup="listbox"
                  aria-autocomplete="both"
                  className="w-full h-9 rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-ring"
                />
              </div>
              {showRecipientDropdown && filteredRecipients.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Opciones de destinatario"
                  className="absolute z-50 mt-0.5 w-full border border-border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto"
                >
                  {filteredRecipients.map((r, i) => (
                    <button
                      key={i}
                      role="option"
                      onClick={() => selectRecipient(r.name, r.phone)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{r.name}</div>
                      {r.tenant_name && <div className="text-xs text-muted-foreground">{r.tenant_name}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="delivery-description" className="block text-xs font-medium text-primary mb-0.5">
                Descripción (opcional)
              </label>
              <Input
                id="delivery-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Caja mediana, documentos..."
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading || !effectiveCourier || !recipientName}
            className="w-full"
          >
            {loading ? "Registrando..." : submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}