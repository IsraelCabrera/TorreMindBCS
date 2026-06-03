import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { getUser } from "../../services/auth"
import { TenantFormDialog } from "../../components/tenants/TenantFormDialog"
import { Building2, Plus } from "lucide-react"

interface Tenant {
  id: string
  name: string
  unit: string | null
  floor: number | null
  primary_phone: string | null
  primary_email: string | null
  contacts: Array<{ id: string; name: string; phone: string | null; email: string | null; is_primary: boolean }>
}

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [showForm, setShowForm] = useState(false)
  const user = getUser()

  const fetchTenants = () => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }

  useEffect(() => { fetchTenants() }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Directorio de Inquilinos</h2>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        )}
      </div>

      {tenants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">
          No hay inquilinos registrados.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tenants.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <h3 className="font-semibold text-primary">{t.name}</h3>
              {t.unit && <p className="text-sm text-muted-foreground">Oficina: {t.unit}</p>}
              {t.primary_phone && <p className="text-sm text-muted-foreground">{t.primary_phone}</p>}
              {t.contacts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {t.contacts.map((c) => (
                    <p key={c.id} className="text-xs text-muted-foreground">
                      {c.name}{c.is_primary ? " (principal)" : ""}{c.phone ? ` — ${c.phone}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <TenantFormDialog
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchTenants() }}
        />
      )}
    </div>
  )
}
