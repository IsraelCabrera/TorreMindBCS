import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { devApi } from "../../services/api"
import { api } from "../../services/api"
import { MessageSquare, UserCheck, Smartphone, History, Trash2, Eye } from "lucide-react"

const TEMPLATE_NAMES = ["host_acknowledgment", "package_arrival", "host_escalated", "package_collected"]

const TEMPLATE_VARIABLES: Record<string, { key: string; label: string }[]> = {
  host_acknowledgment: [
    { key: "visitor_name", label: "Nombre del visitante" },
    { key: "visitor_company", label: "Empresa del visitante" },
  ],
  package_arrival: [
    { key: "courier", label: "Mensajería" },
    { key: "recipient", label: "Destinatario" },
    { key: "guide_number", label: "Número de guía" },
  ],
  package_collected: [
    { key: "courier", label: "Mensajería" },
    { key: "recipient", label: "Destinatario" },
    { key: "guide_number", label: "Número de guía" },
  ],
  host_escalated: [
    { key: "visitor_name", label: "Nombre del visitante" },
  ],
}

interface ActiveVisit {
  id: string
  visitor_name: string
  status: string
  tenant_name: string | null
}

interface DevMessage {
  id: string
  visit_id: string | null
  delivery_id: string | null
  template_name: string
  recipient: string
  status: string
  response_data: Record<string, unknown> | null
  meta_message_id: string | null
  sent_at: string | null
}

export function WhatsAppTestPage() {
  const [activeTab, setActiveTab] = useState<"preview" | "simulate-reply" | "simulate-inbound" | "history">("preview")

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_NAMES[0])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([])
  const [selectedVisitId, setSelectedVisitId] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyResult, setReplyResult] = useState<Record<string, unknown> | null>(null)

  const [inboundPhone, setInboundPhone] = useState("+526641234567")
  const [inboundText, setInboundText] = useState("Vengo a visitar a Juan")
  const [inboundTenantId, setInboundTenantId] = useState("")
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [inboundLoading, setInboundLoading] = useState(false)
  const [inboundResult, setInboundResult] = useState<Record<string, unknown> | null>(null)

  const [devMessages, setDevMessages] = useState<DevMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null)

  useEffect(() => {
    api.get("/tenants").then(setTenants).catch(console.error)
  }, [])

  const fetchActiveVisits = () => {
    api.get("/visits/active").then((visits: ActiveVisit[]) => {
      setActiveVisits(visits)
      if (visits.length > 0 && !selectedVisitId) {
        setSelectedVisitId(visits[0].id)
      }
    }).catch(console.error)
  }

  useEffect(() => {
    fetchActiveVisits()
    const interval = setInterval(fetchActiveVisits, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleTemplateChange = (name: string) => {
    setSelectedTemplate(name)
    setVariables({})
    setPreviewResult(null)
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    try {
      const result = await devApi.post("/dev/whatsapp/send-test", {
        template_name: selectedTemplate,
        to: "+526641234567",
        language_code: "es",
        variables,
      })
      setPreviewResult(result)
    } catch (err) {
      console.error(err)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSimulateReply = async (action: string) => {
    if (!selectedVisitId) return
    setReplyLoading(true)
    setReplyResult(null)
    try {
      const result = await devApi.post("/dev/whatsapp/simulate-button-reply", {
        visit_id: selectedVisitId,
        action,
      })
      setReplyResult(result)
      fetchActiveVisits()
    } catch (err) {
      console.error(err)
    } finally {
      setReplyLoading(false)
    }
  }

  const handleSimulateInbound = async () => {
    setInboundLoading(true)
    setInboundResult(null)
    try {
      const result = await devApi.post("/dev/whatsapp/simulate-text-message", {
        phone: inboundPhone,
        text: inboundText,
        tenant_id: inboundTenantId || undefined,
      })
      setInboundResult(result)
      fetchActiveVisits()
    } catch (err) {
      console.error(err)
    } finally {
      setInboundLoading(false)
    }
  }

  const fetchDevMessages = async () => {
    setMessagesLoading(true)
    try {
      const result = await devApi.get("/dev/whatsapp/messages")
      setDevMessages(result.messages || [])
    } catch (err) {
      console.error(err)
    } finally {
      setMessagesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "history") {
      fetchDevMessages()
    }
  }, [activeTab])

  const handleClearMessages = async () => {
    try {
      await devApi.post("/dev/whatsapp/messages", { method: "DELETE" })
      setDevMessages([])
    } catch (err) {
      console.error(err)
    }
  }

  const tabs = [
    { id: "preview" as const, label: "Template Preview", icon: Eye },
    { id: "simulate-reply" as const, label: "Simulate Reply", icon: UserCheck },
    { id: "simulate-inbound" as const, label: "Simulate Inbound", icon: Smartphone },
    { id: "history" as const, label: "Message History", icon: History },
  ]

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      denied: "bg-red-100 text-red-800",
      escalated: "bg-orange-100 text-orange-800",
      checked_out: "bg-gray-100 text-gray-800",
    }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-primary">WhatsApp Test (Dev Mode)</h2>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "preview" && (
        <div className="space-y-6">
          <Card>
<div className="mb-4">
  <h3 className="text-lg font-semibold text-foreground">Template Preview</h3>
</div>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                >
                  {TEMPLATE_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {TEMPLATE_VARIABLES[selectedTemplate]?.map((variable) => (
                <div key={variable.key}>
                  <label className="block text-sm font-medium text-primary mb-1">{variable.label}</label>
                  <input
                    type="text"
                    value={variables[variable.key] || ""}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [variable.key]: e.target.value }))}
                    placeholder={`Ej: ${variable.label}`}
                    className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                  />
                </div>
              ))}

              <Button onClick={handlePreview} disabled={previewLoading} className="w-full">
                {previewLoading ? "Building..." : "Preview"}
              </Button>
            </CardContent>
          </Card>

          {previewResult && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-700">Payload</h3>
              </div>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs leading-relaxed">
                  {JSON.stringify(previewResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "simulate-reply" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Simulate Host Reply</h3>
            </div>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select an active visit and simulate a tenant tapping "Que suba" or "No disponible".
              </p>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Active Visit</label>
                <select
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                >
                  <option value="">-- Select a visit --</option>
                  {activeVisits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visitor_name} ({v.status}) — {v.tenant_name || "No tenant"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVisitId && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSimulateReply("approve")}
                    disabled={replyLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ✅ Que suba
                  </Button>
                  <Button
                    onClick={() => handleSimulateReply("deny")}
                    disabled={replyLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    ❌ No disponible
                  </Button>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={fetchActiveVisits} className="w-full">
                Refresh Active Visits ({activeVisits.length})
              </Button>
            </CardContent>
          </Card>

          {replyResult && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-700">Result</h3>
              </div>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs leading-relaxed">
                  {JSON.stringify(replyResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "simulate-inbound" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Simulate Visitor Inbound Message</h3>
            </div>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simulate a visitor sending a WhatsApp message to the building number.
                This creates a new visit and triggers notifications.
              </p>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Visitor Phone</label>
                <input
                  type="text"
                  value={inboundPhone}
                  onChange={(e) => setInboundPhone(e.target.value)}
                  placeholder="+526641234567"
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Message Text</label>
                <input
                  type="text"
                  value={inboundText}
                  onChange={(e) => setInboundText(e.target.value)}
                  placeholder="Vengo a visitar a Juan"
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tenant (optional)</label>
                <select
                  value={inboundTenantId}
                  onChange={(e) => setInboundTenantId(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                >
                  <option value="">-- No tenant --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSimulateInbound} disabled={inboundLoading} className="w-full">
                {inboundLoading ? "Sending..." : "Simulate Inbound Message"}
              </Button>
            </CardContent>
          </Card>

          {inboundResult && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-700">Created Visit</h3>
              </div>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs leading-relaxed">
                  {JSON.stringify(inboundResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Dev Mock Messages</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchDevMessages} disabled={messagesLoading}>
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearMessages}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </Button>
            </div>
          </div>

          {devMessages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No dev mock messages yet. Use the other tabs to create some.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {devMessages.map((msg) => (
                <Card key={msg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{msg.template_name}</span>
                          <span className="text-xs text-muted-foreground">{msg.recipient}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : "N/A"}
                          {msg.visit_id && ` — Visit: ${msg.visit_id.substring(0, 8)}...`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(msg.status)}
                        <button
                          onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Toggle details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expandedMessageId === msg.id && msg.response_data && (
                      <pre className="mt-3 bg-muted p-3 rounded-md overflow-x-auto text-xs leading-relaxed">
                        {JSON.stringify(msg.response_data, null, 2)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-8">
        Dev-only page — requires <code className="bg-muted px-1 rounded">X-Dev-Mode: true</code> header
      </p>
    </div>
  )
}