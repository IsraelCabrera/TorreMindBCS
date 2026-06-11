import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"

const API_BASE = "/api/v1"

interface Tenant {
  id: string
  name: string
  unit: string
}

interface RegisterState {
  step: "form" | "success" | "error"
  name: string
  phone: string
  company: string
  hostName: string
  tenantId: string
  purpose: string
  loading: boolean
  errorMsg: string
}

function CheckIcon() {
  return (
    <svg
      className="w-16 h-16 text-secondary mx-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg
      className="w-12 h-12 text-primary/20 mx-auto mb-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

export function SelfRegistrationPage() {
  const [state, setState] = useState<RegisterState>({
    step: "form",
    name: "",
    phone: "",
    company: "",
    hostName: "",
    tenantId: "",
    purpose: "",
    loading: false,
    errorMsg: "",
  })

  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/public/tenants`)
      .then((r) => r.json())
      .then(setTenants)
      .catch(() => {})
  }, [])

  const update = useCallback(<K extends keyof RegisterState>(key: K, value: RegisterState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) return

    update("loading", true)
    update("errorMsg", "")

    try {
      const res = await fetch(`${API_BASE}/public/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          phone: state.phone.trim() || null,
          company: state.company.trim() || null,
          host_name: state.hostName.trim() || null,
          tenant_id: state.tenantId || null,
          purpose: state.purpose.trim() || null,
          fax_number: "",
          website: "",
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error al registrar" }))
        throw new Error(err.detail || "Error al registrar")
      }

      update("step", "success")
    } catch (err) {
      update("errorMsg", err instanceof Error ? err.message : "Error al registrar")
    } finally {
      update("loading", false)
    }
  }, [state.name, state.phone, state.company, state.hostName, state.tenantId, state.purpose, update])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !state.loading && state.name.trim()) {
        handleSubmit()
      }
    },
    [handleSubmit, state.loading, state.name],
  )

  if (state.step === "success") {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="space-y-6 py-12">
            <CheckIcon />
            <h1 className="text-3xl font-bold text-primary">
              ¡Registro exitoso!
            </h1>
            <p className="text-xl text-muted-foreground">
              {state.name}, tu registro ha sido recibido. El personal de recepción te atenderá en breve.
            </p>
            <p className="text-base text-muted-foreground">
              Por favor espera en la sala de recepción.
            </p>
            <Button
              size="lg"
              className="mt-4 text-lg h-12 px-8"
              onClick={() =>
                setState({
                  step: "form",
                  name: "",
                  phone: "",
                  company: "",
                  hostName: "",
                  tenantId: "",
                  purpose: "",
                  loading: false,
                  errorMsg: "",
                })
              }
            >
              Registrar otro visitante
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <BuildingIcon />
          <h1 className="text-3xl font-bold text-primary">
            Registro de Visitante
          </h1>
          <p className="text-lg text-muted-foreground">
            Torre MIND — Bienvenido. Por favor completa tus datos para registrarte.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6 p-8">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-base font-semibold text-primary mb-2"
              >
                Nombre completo <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                autoFocus
                placeholder="Ej: Juan Pérez"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="name"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-base font-semibold text-primary mb-2"
              >
                Teléfono
              </label>
              <input
                id="reg-phone"
                type="tel"
                placeholder="Ej: +526641234567"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.phone}
                onChange={(e) => update("phone", e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="tel"
              />
            </div>

            <div>
              <label
                htmlFor="reg-company"
                className="block text-base font-semibold text-primary mb-2"
              >
                Empresa
              </label>
              <input
                id="reg-company"
                type="text"
                placeholder="Ej: Acme Corp"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.company}
                onChange={(e) => update("company", e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="organization"
              />
            </div>

            <div>
              <label
                htmlFor="reg-tenant"
                className="block text-base font-semibold text-primary mb-2"
              >
                ¿A quién visitas?
              </label>
              <select
                id="reg-tenant"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.tenantId}
                onChange={(e) => update("tenantId", e.target.value)}
              >
                <option value="">Selecciona una empresa...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — Piso {t.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-host"
                className="block text-base font-semibold text-primary mb-2"
              >
                Nombre de la persona que visitas
              </label>
              <input
                id="reg-host"
                type="text"
                placeholder="Ej: Alejandra García"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.hostName}
                onChange={(e) => update("hostName", e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="reg-purpose"
                className="block text-base font-semibold text-primary mb-2"
              >
                Motivo de la visita
              </label>
              <input
                id="reg-purpose"
                type="text"
                placeholder="Ej: Reunión de trabajo"
                className="w-full h-12 rounded-lg border-2 border-border bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                value={state.purpose}
                onChange={(e) => update("purpose", e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </div>

            {state.errorMsg && (
              <div
                role="alert"
                className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-base"
              >
                {state.errorMsg}
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={state.loading || !state.name.trim()}
              onClick={handleSubmit}
            >
              {state.loading ? "Registrando..." : "Registrarme"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Torre MIND — Control de Acceso
        </p>
      </div>
    </div>
  )
}
