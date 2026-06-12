import { useState, useEffect, useCallback, useRef } from "react"
import { VirtualKeyboard } from "../../components/kiosk/VirtualKeyboard"

const API_BASE = "/api/v1"

interface Tenant {
  id: string
  name: string
  unit: string
}

interface Fields {
  name: string
  phone: string
  company: string
  hostName: string
  purpose: string
}

type FieldKey = keyof Fields

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Nombre completo",
  phone: "Teléfono",
  company: "Empresa",
  hostName: "Persona que visitas",
  purpose: "Motivo de la visita",
}

const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  name: "Ej: Juan Pérez",
  phone: "Ej: 6641234567",
  company: "Ej: Acme Corp",
  hostName: "Nombre de la persona",
  purpose: "Ej: Reunión de trabajo",
}

const IDLE_TIMEOUT_MS = 120_000

function CheckIcon() {
  return (
    <svg className="w-20 h-20 text-secondary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function KioskPage() {
  const [fields, setFields] = useState<Fields>({
    name: "", phone: "", company: "", hostName: "", purpose: "",
  })
  const [activeField, setActiveField] = useState<FieldKey>("name")
  const [tenantId, setTenantId] = useState("")
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(7)

  const idleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLDivElement | null>>>({})

  useEffect(() => {
    fetch(`${API_BASE}/public/tenants`)
      .then((r) => r.json())
      .then(setTenants)
      .catch(() => {})
  }, [])

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => {
      setFields({ name: "", phone: "", company: "", hostName: "", purpose: "" })
      setTenantId("")
      setError("")
      setSuccess(false)
      setActiveField("name")
    }, IDLE_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    resetIdleTimer()
    return () => clearTimeout(idleRef.current)
  }, [resetIdleTimer])

  const handleReset = useCallback(() => {
    setFields({ name: "", phone: "", company: "", hostName: "", purpose: "" })
    setTenantId("")
    setError("")
    setSuccess(false)
    setActiveField("name")
    resetIdleTimer()
  }, [resetIdleTimer])

  useEffect(() => {
    if (!success) return
    setCountdown(7)
    const timer = setInterval(() => setCountdown((p) => p - 1), 1000)
    return () => clearInterval(timer)
  }, [success])

  useEffect(() => {
    if (success && countdown <= 0) handleReset()
  }, [success, countdown, handleReset])

  const updateField = useCallback(
    (key: FieldKey, value: string) => {
      setFields((prev) => ({ ...prev, [key]: value }))
      resetIdleTimer()
    },
    [resetIdleTimer],
  )

  const handleChar = useCallback(
    (char: string) => {
      setFields((prev) => ({ ...prev, [activeField]: prev[activeField] + char }))
    },
    [activeField],
  )

  const handleBackspace = useCallback(() => {
    setFields((prev) => ({ ...prev, [activeField]: prev[activeField].slice(0, -1) }))
  }, [activeField])

  const handleClear = useCallback(() => {
    setFields((prev) => ({ ...prev, [activeField]: "" }))
  }, [activeField])

  const handleEnter = useCallback(async () => {
    if (loading || !fields.name.trim()) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/public/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          phone: fields.phone.trim() || null,
          company: fields.company.trim() || null,
          host_name: fields.hostName.trim() || null,
          tenant_id: tenantId || null,
          purpose: fields.purpose.trim() || null,
          fax_number: "",
          website: "",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error al registrar" }))
        throw new Error(err.detail || "Error al registrar")
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar")
    } finally {
      setLoading(false)
      resetIdleTimer()
    }
  }, [fields, tenantId, loading, resetIdleTimer])

  const scrollToField = useCallback((key: FieldKey) => {
    fieldRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [])

  const focusField = useCallback(
    (key: FieldKey) => {
      setActiveField(key)
      scrollToField(key)
      resetIdleTimer()
    },
    [scrollToField, resetIdleTimer],
  )

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center space-y-4 max-w-lg">
          <CheckIcon />
          <h1 className="text-3xl font-bold text-primary">¡Registro exitoso!</h1>
          <p className="text-xl text-muted-foreground">
            {fields.name}, tu registro ha sido recibido.
          </p>
          <p className="text-base text-muted-foreground">El personal de recepción te atenderá en breve.</p>
          <p className="text-base text-secondary font-semibold">
            Volviendo al registro en {countdown} segundos...
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 w-full h-14 bg-primary text-white rounded-2xl text-xl font-bold
              active:bg-primary/90 transition-colors touch-manipulation"
          >
            Registrar otro visitante ahora
          </button>
        </div>
      </div>
    )
  }

  const keyboardHeight = "17rem"

  return (
    <div className="flex-1 flex flex-col" onClick={resetIdleTimer}>
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 space-y-2 pb-2">
        <div className="text-center mb-1">
          <h1 className="text-2xl font-bold text-primary">Torre MIND</h1>
          <p className="text-base text-muted-foreground">Registro de Visitante</p>
        </div>

        {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => (
          <div
            key={key}
            ref={(el) => { fieldRefs.current[key] = el }}
            className={`rounded-2xl border-2 p-3 transition-colors cursor-pointer touch-manipulation
              ${activeField === key
                ? "border-secondary bg-white shadow-md shadow-secondary/10"
                : "border-border bg-card"
              }`}
            onClick={() => focusField(key)}
          >
            <label className="block text-lg font-semibold text-primary mb-1">
              {FIELD_LABELS[key]}
              {key === "name" && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="text-xl min-h-[2rem] flex items-center break-all">
              {fields[key] || (
                <span className="text-muted-foreground/50">{FIELD_PLACEHOLDERS[key]}</span>
              )}
            </div>
          </div>
        ))}

        <div>
          <label className="block text-base font-semibold text-primary mb-1">¿A quién visitas?</label>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
            {tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTenantId(tenantId === t.id ? "" : t.id)
                  resetIdleTimer()
                }}
                className={`flex-shrink-0 snap-start rounded-2xl border-2 px-4 py-3 text-center
                  min-w-[9rem] transition-colors touch-manipulation
                  ${tenantId === t.id
                    ? "border-secondary bg-secondary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground"
                  }`}
              >
                <div className="text-base font-semibold leading-tight">{t.name}</div>
                <div className="text-sm text-muted-foreground mt-1">Piso {t.unit}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-base text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading || !fields.name.trim()}
          onClick={handleEnter}
          className="w-full h-14 bg-primary text-white rounded-2xl text-xl font-bold
            disabled:opacity-40 active:bg-primary/90 transition-colors touch-manipulation"
        >
          {loading ? "Registrando..." : "Registrarme"}
        </button>

        <div style={{ height: keyboardHeight }} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <VirtualKeyboard
          numeric={activeField === "phone"}
          onChar={handleChar}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onEnter={handleEnter}
          disabled={loading}
        />
      </div>
    </div>
  )
}
