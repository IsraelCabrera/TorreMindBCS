import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { api } from "../../services/api"

interface ContactForm {
  name: string
  phone: string | null
  email: string | null
  is_primary: boolean
}

interface TenantData {
  id: string
  name: string
  unit: string | null
  floor: number | null
  primary_phone: string | null
  primary_email: string | null
  contacts: ContactForm[]
}

interface Props {
  onClose: () => void
  onSuccess: () => void
  tenant?: TenantData | null
}

export function TenantFormDialog({ onClose, onSuccess, tenant }: Props) {
  const [name, setName] = useState(tenant?.name ?? "")
  const [unit, setUnit] = useState(tenant?.unit ?? "")
  const [floor, setFloor] = useState(tenant?.floor?.toString() ?? "")
  const [primaryPhone, setPrimaryPhone] = useState(tenant?.primary_phone ?? "")
  const [primaryEmail, setPrimaryEmail] = useState(tenant?.primary_email ?? "")
  const [contacts, setContacts] = useState<ContactForm[]>(tenant?.contacts ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isEdit = !!tenant

  const addContact = () => {
    setContacts([...contacts, { name: "", phone: "", email: "", is_primary: contacts.length === 0 }])
  }

  const updateContact = (i: number, field: keyof ContactForm, value: string | boolean) => {
    const updated = contacts.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c,
    )
    if (field === "is_primary" && value === true) {
      updated.forEach((c, idx) => { if (idx !== i) c.is_primary = false })
    }
    setContacts(updated)
  }

  const removeContact = (i: number) => {
    setContacts(contacts.filter((_, idx) => idx !== i))
  }

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError("")
    try {
      const body = {
        name: name.trim(),
        unit: unit.trim() || null,
        floor: floor ? Number(floor) : null,
        primary_phone: primaryPhone.trim() || null,
        primary_email: primaryEmail.trim() || null,
      }
      if (isEdit) {
        await api.put(`/tenants/${tenant!.id}`, body)
      } else {
        const created = await api.post("/tenants", body)
        for (const c of contacts) {
          if (c.name.trim()) {
            await api.post(`/tenants/${created.id}/contacts`, {
              name: c.name.trim(),
              phone: c.phone?.trim() || null,
              email: c.email?.trim() || null,
              is_primary: c.is_primary,
            })
          }
        }
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al ${isEdit ? "actualizar" : "crear"} inquilino`)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">{isEdit ? "Editar Inquilino" : "Nuevo Inquilino"}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del inquilino</p>
            <div>
              <label htmlFor="tenant-name" className="block text-sm font-medium text-primary mb-1">Nombre *</label>
              <input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tenant-unit" className="block text-sm font-medium text-primary mb-1">Oficina</label>
                <input id="tenant-unit" value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
              <div>
                <label htmlFor="tenant-floor" className="block text-sm font-medium text-primary mb-1">Piso</label>
                <input id="tenant-floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
            </div>
            <div>
              <label htmlFor="tenant-phone" className="block text-sm font-medium text-primary mb-1">Teléfono</label>
              <input id="tenant-phone" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label htmlFor="tenant-email" className="block text-sm font-medium text-primary mb-1">Email</label>
              <input id="tenant-email" type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contactos</p>
              <Button variant="outline" size="sm" onClick={addContact}>+ Agregar</Button>
            </div>
            {contacts.map((c, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Contacto {i + 1}</span>
                  <button onClick={() => removeContact(i)}
                    className="text-xs text-destructive hover:underline">Eliminar</button>
                </div>
                <div>
                  <label htmlFor={`contact-name-${i}`} className="block text-xs text-muted-foreground mb-0.5">Nombre</label>
                  <input id={`contact-name-${i}`} value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)}
                    className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`contact-phone-${i}`} className="block text-xs text-muted-foreground mb-0.5">Teléfono</label>
                    <input id={`contact-phone-${i}`} value={c.phone ?? ""} onChange={(e) => updateContact(i, "phone", e.target.value)}
                      className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label htmlFor={`contact-email-${i}`} className="block text-xs text-muted-foreground mb-0.5">Email</label>
                    <input id={`contact-email-${i}`} value={c.email ?? ""} onChange={(e) => updateContact(i, "email", e.target.value)}
                      className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                  </div>
                </div>
                <label htmlFor={`contact-primary-${i}`} className="flex items-center gap-2 text-sm">
                  <input id={`contact-primary-${i}`} type="checkbox" checked={c.is_primary}
                    onChange={(e) => updateContact(i, "is_primary", e.target.checked)}
                    className="rounded border-border" />
                  Contacto principal
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={submit} disabled={saving || !name.trim()} className="flex-1">
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear inquilino"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
