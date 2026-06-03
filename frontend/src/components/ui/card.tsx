import type { HTMLAttributes } from "react"
import { forwardRef } from "react"
import { cn } from "../../lib/utils"

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
  ),
)
CardContent.displayName = "CardContent"
