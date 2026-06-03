import { UserPlus, Package, Wrench, BadgeCheck, Users } from "lucide-react"

export type ActionType = "new_visitor" | "delivery" | "vendor" | "tenant_employee" | "guest"

interface QuickActionsProps {
  onAction: (action: ActionType) => void
}

const actions = [
  { type: "new_visitor" as const, label: "Nuevo Visitante", icon: UserPlus, color: "bg-primary text-primary-foreground hover:bg-primary/90" },
  { type: "delivery" as const, label: "Delivery", icon: Package, color: "bg-secondary text-secondary-foreground hover:bg-secondary/90" },
  { type: "vendor" as const, label: "Proveedor", icon: Wrench, color: "bg-accent text-accent-foreground hover:bg-accent/90" },
  { type: "tenant_employee" as const, label: "Empleado", icon: BadgeCheck, color: "bg-primary/80 text-primary-foreground hover:bg-primary/70" },
  { type: "guest" as const, label: "Invitado", icon: Users, color: "bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30" },
]

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.type}
          onClick={() => onAction(a.type)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${a.color}`}
        >
          <a.icon className="w-4 h-4" />
          {a.label}
        </button>
      ))}
    </div>
  )
}
