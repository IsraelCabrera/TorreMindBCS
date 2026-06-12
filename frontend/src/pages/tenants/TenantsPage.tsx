import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { api } from "../../services/api"
import { getUser } from "../../services/auth"
import { TenantFormDialog } from "../../components/tenants/TenantFormDialog"
import { Building2, Edit, Plus, Trash2, X } from "lucide-react"

interface Tenant {
  id: string
  name: string
  unit: string | null
  floor: number | null
  primary_phone: string | null
  primary_email: string | null
  contacts: Array<{ id: string; name: string; phone: string | null; email: string | null; is_primary: boolean }>
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-base text-primary font-medium">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Eliminar</Button>
        </div>
      </div>
    </div>
  )
}

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const user = getUser()

  const fetchTenants = () => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }

  useEffect(() => { fetchTenants() }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/tenants/${deleteId}`)
      setDeleteId(null)
      fetchTenants()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Directorio de Inquilinos</h2>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setShowForm(true)} aria-label="Agregar nuevo inquilino">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Nuevo
          </Button>
        )}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {tenants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No hay inquilinos registrados.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list" aria-label="Directorio de inquilinos">
        {tenants.map((t) => (
          <Card key={t.id} role="listitem" className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-primary truncate">{t.name}</h3>
                  {t.unit && <p className="text-sm text-muted-foreground">Oficina: {t.unit}</p>}
                  {t.primary_phone && <p className="text-sm text-muted-foreground">{t.primary_phone}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {user?.role === "admin" && (
                    <>
                      <button
                        onClick={() => setEditTenant(t)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        aria-label={`Editar ${t.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        aria-label={`Eliminar ${t.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
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

      {editTenant && (
        <TenantFormDialog
          tenant={editTenant}
          onClose={() => setEditTenant(null)}
          onSuccess={() => { setEditTenant(null); fetchTenants() }}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          message="¿Eliminar este inquilino? Se desactivará y no aparecerá en el directorio."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
