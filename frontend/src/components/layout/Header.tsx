import { Link } from "react-router-dom"
import { Button } from "../ui/button"

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/history", label: "Historial" },
  { to: "/deliveries", label: "Paquetes" },
  { to: "/tenants", label: "Inquilinos" },
  { to: "/reports", label: "Reportes" },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-80 transition-opacity">
            <div className="w-32 h-10 sm:w-40 sm:h-12 flex items-center justify-center flex-shrink-0">
              <img
                alt="MIND Logo"
                width={160}
                height={48}
                className="object-contain"
                src="/mind-logo.png"
              />
            </div>
            <div className="min-w-0 flex-shrink">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-primary leading-tight truncate">
                <span className="hidden sm:inline">Visitor Control</span>
                <span className="sm:hidden">Visitor</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight hidden sm:block">
                Gestión Inteligente de Visitantes
              </p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}>
                <Button variant="ghost" size="sm">{l.label}</Button>
              </Link>
            ))}
          </nav>
          <nav className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link to="/exit">
              <Button variant="outline" size="sm">
                <span className="hidden sm:inline">Salida</span>
                <span className="sm:hidden">Salida</span>
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <span className="hidden md:inline">Admin</span>
                <span className="md:hidden">Admin</span>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
