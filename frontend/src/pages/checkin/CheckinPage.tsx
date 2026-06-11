import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { Search, ArrowLeft } from "lucide-react"

interface Visitor {
  id: string
  name: string
  phone: string | null
  company: string | null
}

interface Tenant {
  id: string
  name: string
}

const visitorTypes = [
  { value: "tenant_visitor", label: "Visitante" },
  { value: "delivery", label: "Reparto" },
  { value: "vendor", label: "Proveedor" },
  { value: "walk_in", label: "Sin cita" },
  { value: "tenant_employee", label: "Empleado" },
  { value: "government", label: "Gobierno" },
  { value: "prospective_tenant", label: "Prospecto" },
]

export function CheckinPage() {
  const navigate = useNavigate()
  const [visitorType, setVisitorType] = useState("tenant_visitor")
  const [search, setSearch] = useState("")
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState("")
  const [hostName, setHostName] = useState("")
  const [purpose, setPurpose] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }, [])

  const searchVisitors = useCallback(async (q: string) => {
    if (q.length < 2) { setVisitors([]); return }
    const data = await api.get(`/visitors?q=${encodeURIComponent(q)}`)
    setVisitors(data)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchVisitors(search), 300)
    return () => clearTimeout(timer)
  }, [search, searchVisitors])

  const selectVisitor = (v: Visitor) => {
    setSelectedVisitor(v)
    setName(v.name)
    setPhone(v.phone || "")
    setCompany(v.company || "")
    setSearch("")
    setVisitors([])
  }

  const handleCheckin = async () => {
    setLoading(true)
    try {
      await api.post("/visits/check-in", {
        visitor_id: selectedVisitor?.id || null,
        visitor_name: selectedVisitor ? undefined : name,
        visitor_phone: phone || null,
        visitor_company: company || null,
        visitor_type: visitorType,
        tenant_id: selectedTenant || null,
        host_name: hostName || null,
        purpose: purpose || null,
      })
      navigate("/dashboard")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 w-full">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Volver
      </Button>

      <Card>
        <CardContent className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">Registro de Visita</h2>

          <fieldset>
            <legend className="sr-only">Tipo de visitante</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Tipo de visitante">
              {visitorTypes.map((t) => (
                <button
                  key={t.value}
                  role="radio"
                  aria-checked={visitorType === t.value}
                  onClick={() => setVisitorType(t.value)}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                    visitorType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="checkin-search" className="block text-sm font-medium text-primary mb-1">Buscar visitante existente</label>
            <div className="relative">
              <input
                id="checkin-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, teléfono o empresa..."
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
              <Search className="absolute right-3 top-2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </div>
            {visitors.length > 0 && (
              <div className="mt-1 border border-border rounded-md bg-card divide-y divide-border" role="listbox" aria-label="Visitantes encontrados">
                {visitors.map((v) => (
                  <button
                    key={v.id}
                    role="option"
                    onClick={() => selectVisitor(v)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{v.name}</span>
                    {v.company && <span className="text-muted-foreground ml-2">{v.company}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkin-name" className="block text-sm font-medium text-primary mb-1">Nombre *</label>
              <input
                id="checkin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
            </div>
            <div>
              <label htmlFor="checkin-phone" className="block text-sm font-medium text-primary mb-1">Teléfono</label>
              <input
                id="checkin-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
            </div>
            <div>
              <label htmlFor="checkin-company" className="block text-sm font-medium text-primary mb-1">Empresa</label>
              <input
                id="checkin-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
            </div>
            <div>
              <label htmlFor="checkin-tenant" className="block text-sm font-medium text-primary mb-1">Anfitrión (tenant)</label>
              <select
                id="checkin-tenant"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              >
                <option value="">Seleccionar...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="checkin-host" className="block text-sm font-medium text-primary mb-1">Nombre del anfitrión</label>
              <input
                id="checkin-host"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
            </div>
            <div>
              <label htmlFor="checkin-purpose" className="block text-sm font-medium text-primary mb-1">Motivo</label>
              <input
                id="checkin-purpose"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              />
            </div>
          </div>

          <Button onClick={handleCheckin} disabled={loading || !name} className="w-full">
            {loading ? "Registrando..." : "Registrar Entrada"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
