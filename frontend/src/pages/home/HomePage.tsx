import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../../components/ui/card"
import { UserPlus, Repeat } from "lucide-react"

/* NOTA: Esta página no está importada en App.tsx — no se muestra en producción */

const tenants = ["Dynamo Coworking", "Bajapack", "NexusFuel", "Viamericas", "Integon", "Terraza"]

export function HomePage() {
  const navigate = useNavigate()

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      navigate("/checkin")
    }
  }

  return (
    <section className="w-full py-2 sm:py-3 md:py-4 flex flex-col flex-1">
      <div className="text-center mb-2 sm:mb-3 md:mb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1.5 sm:mb-2 text-balance">
          Bienvenido a MIND
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground text-balance max-w-2xl mx-auto mb-1.5 sm:mb-2">
          Registre su visita de forma rápida y segura en MIND.
        </p>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground/80 text-balance max-w-2xl mx-auto mb-2 font-medium">
          {tenants.join(", ")}.
        </p>
      </div>
      <div className="w-full flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Card
                tabIndex={0}
                role="button"
                aria-label="Registrar visitante por primera vez"
                className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-border hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => navigate("/checkin")}
                onKeyDown={handleCardKeyDown}
              >
                <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col items-center text-center space-y-2 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="font-semibold text-base sm:text-lg text-primary">Visitante por primera vez</h4>
                  </div>
                </CardContent>
              </Card>
              <Card
                tabIndex={0}
                role="button"
                aria-label="Registrar visitante frecuente"
                className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-border hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => navigate("/checkin")}
                onKeyDown={handleCardKeyDown}
              >
                <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col items-center text-center space-y-2 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Repeat className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="font-semibold text-base sm:text-lg text-primary">Visitante frecuente</h4>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
