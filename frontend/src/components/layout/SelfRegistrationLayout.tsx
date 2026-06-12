import { Outlet } from "react-router-dom"

export function SelfRegistrationLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex flex-col">
      <a href="#main-content" className="skip-to-content">
        Saltar al contenido principal
      </a>
      <main
        id="main-content"
        className="flex-1 flex flex-col min-h-0"
        role="main"
        aria-label="Auto registro de visitantes"
      >
        <Outlet />
      </main>
    </div>
  )
}
