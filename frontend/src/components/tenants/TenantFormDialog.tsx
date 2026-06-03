import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { api } from "../../services/api"

interface ContactForm {
  name: string
  phone: string
  email: string
  is_primary: boolean
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function TenantFormDialog({ onClose, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("")
  const [floor, setFloor] = useState("")
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [primaryEmail, setPrimaryEmail] = useState("")
  const [contacts, setContacts] = useState<ContactForm[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
      const tenant = await api.post("/tenants", {
        name: name.trim(),
        unit: unit.trim() || null,
        floor: floor ? Number(floor) : null,
        primary_phone: primaryPhone.trim() || null,
        primary_email: primaryEmail.trim() || null,
      })
      for (const c of contacts) {
        if (c.name.trim()) {
          await api.post(`/tenants/${tenant.id}/contacts`, {
            name: c.name.trim(),
            phone: c.phone.trim() || null,
            email: c.email.trim() || null,
            is_primary: c.is_primary,
          })
        }
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear inquilino")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Nuevo Inquilino</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del inquilino</p>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Nombre *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Oficina</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Piso</label>
                <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Teléfono</label>
              <input value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Email</label>
              <input type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)}
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
                  <label className="block text-xs text-muted-foreground mb-0.5">Nombre</label>
                  <input value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)}
                    className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-0.5">Teléfono</label>
                    <input value={c.phone} onChange={(e) => updateContact(i, "phone", e.target.value)}
                      className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-0.5">Email</label>
                    <input value={c.email} onChange={(e) => updateContact(i, "email", e.target.value)}
                      className="w-full h-8 rounded border border-border bg-card px-2 text-sm outline-none focus:border-ring" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.is_primary}
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
              {saving ? "Creando..." : "Crear inquilino"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
