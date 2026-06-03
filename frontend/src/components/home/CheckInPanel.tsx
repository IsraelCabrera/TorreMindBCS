import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { api } from "../../services/api"
import type { VisitorResult } from "./SearchBar"
import { X } from "lucide-react"

interface Tenant {
  id: string
  name: string
  contacts: Array<{ id: string; name: string }>
}

interface CheckInPanelProps {
  visitor: VisitorResult | null
  defaultType?: string
  onClose: () => void
  onSuccess: () => void
}

const visitorTypes = [
  { value: "tenant_visitor", label: "Visitante" },
  { value: "delivery", label: "Reparto" },
  { value: "vendor", label: "Proveedor" },
  { value: "walk_in", label: "Sin cita" },
  { value: "tenant_employee", label: "Empleado" },
  { value: "prospective_tenant", label: "Prospecto" },
]

export function CheckInPanel({ visitor, defaultType, onClose, onSuccess }: CheckInPanelProps) {
  const isReturning = visitor !== null
  const [name, setName] = useState(visitor?.name || "")
  const [phone, setPhone] = useState(visitor?.phone || "")
  const [company, setCompany] = useState(visitor?.company || "")
  const [visitorType, setVisitorType] = useState(defaultType || "tenant_visitor")
  const [hostQuery, setHostQuery] = useState(visitor?.last_host_name || "")
  const [hostName, setHostName] = useState(visitor?.last_host_name || "")
  const [selectedTenantId, setSelectedTenantId] = useState("")
  const [purpose, setPurpose] = useState("")
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [showHostDropdown, setShowHostDropdown] = useState(false)

  useEffect(() => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }, [])

  const hostOptions = useMemo(() => {
    const options: Array<{ label: string; value: string; tenantId: string }> = []
    for (const t of tenants) {
      if (t.contacts.length > 0) {
        for (const c of t.contacts) {
          options.push({ label: `${c.name} (${t.name})`, value: c.name, tenantId: t.id })
        }
      } else {
        options.push({ label: t.name, value: "", tenantId: t.id })
      }
    }
    return options
  }, [tenants])

  const filteredHosts = useMemo(() => {
    if (hostQuery.length < 1) return hostOptions
    const q = hostQuery.toLowerCase()
    return hostOptions.filter((h) => h.label.toLowerCase().includes(q))
  }, [hostQuery, hostOptions])

  const selectHost = (name: string, tenantId: string) => {
    setHostName(name)
    setHostQuery(name)
    setSelectedTenantId(tenantId)
    setShowHostDropdown(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.post("/visits/check-in", {
        visitor_id: isReturning ? visitor!.id : null,
        visitor_name: isReturning ? undefined : name,
        visitor_phone: phone || null,
        visitor_company: company || null,
        visitor_type: visitorType,
        tenant_id: selectedTenantId || null,
        host_name: hostName || null,
        purpose: purpose || null,
      })
      onSuccess()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-l-4 border-l-secondary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary">
            {isReturning ? "Registrar Entrada — Visitante Frecuente" : "Nuevo Visitante"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {visitorTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setVisitorType(t.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  visitorType === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-primary mb-0.5">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-0.5">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-0.5">Empresa</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-primary mb-0.5">Anfitrión</label>
              <input
                type="text"
                value={hostQuery}
                onChange={(e) => { setHostQuery(e.target.value); setShowHostDropdown(true) }}
                onFocus={() => setShowHostDropdown(true)}
                placeholder="Buscar..."
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
              {showHostDropdown && filteredHosts.length > 0 && (
                <div className="absolute z-50 mt-0.5 w-full border border-border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto">
                  {filteredHosts.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => selectHost(h.value, h.tenantId)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-0.5">Motivo</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !name.trim()} className="w-full">
            {loading ? "Registrando..." : "Registrar Entrada"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
