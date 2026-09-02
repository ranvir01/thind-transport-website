"use client"

/**
 * Bottom sheet — the app's overlay for grouped actions and guided flows.
 * Radix Dialog underneath (focus trap, esc, portal, a11y labels); presented
 * as a bottom sheet on touch widths and a centered card from md up.
 * Token-aware (bg-surface/text-fg), unlike the marketing dialog primitive.
 * `variant="dark"` is for the forced-dark surfaces (driver PWA, portal): those
 * never read the office mode tokens, so the sheet paints the driver ladder
 * (--driver-surface-2, raised) instead — see AGENTS.md "No mode-dependent
 * tokens on forced-dark surfaces".
 */
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  variant = "light",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Optional one-liner under the title. */
  description?: string
  children: React.ReactNode
  /** Wider desktop card for flows (importer stepper). */
  wide?: boolean
  /** "dark" on the forced-dark driver/portal surfaces; "light" follows the office mode. */
  variant?: "light" | "dark"
}) {
  const dark = variant === "dark"
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Scrims run heavier in dark (0.65–0.8) or the sheet does not separate from the page. */}
        <Dialog.Overlay
          className={cn(
            "hub-backdrop-enter fixed inset-0 z-[90]",
            dark ? "bg-[color:var(--driver-overlay,rgba(0,0,0,0.72))]" : "bg-overlay"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed z-[95] flex flex-col focus:outline-none hub-sheet-content",
            dark
              ? "bg-driver-surface-2 text-driver-text shadow-[var(--driver-shadow-raised)]"
              : "bg-surface text-fg shadow-overlay",
            // Touch: full-width bottom sheet under the home indicator. Radius is
            // the ladder's `sheet` rung (20px) — the raw 18px it replaced was off
            // the ladder and disagreed with the md: card below.
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet pb-[env(safe-area-inset-bottom,0px)]",
            dark ? "border-t border-driver-border-strong" : "border-t border-border",
            // md+: centered card (fade only — see .hub-sheet-content).
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[82vh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:border md:pb-0",
            dark && "md:border-driver-border-strong",
            wide ? "md:max-w-2xl" : "md:max-w-md"
          )}
        >
          {/* Grab handle: 32×4 at 40% on-surface (M3), inside a 48px tap area so
              the handle itself is a target rather than a 4px sliver. */}
          <div className="flex h-6 shrink-0 items-center justify-center md:hidden" aria-hidden>
            <span
              className={cn(
                "block h-1 w-8 rounded-pill",
                dark ? "bg-driver-text opacity-40" : "bg-fg opacity-30"
              )}
            />
          </div>
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className={cn("text-[16px] font-semibold", dark ? "text-driver-text" : "text-fg")}>
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className={cn("mt-0.5 text-[13px]", dark ? "text-driver-text-3" : "text-fg-3")}>
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-control",
                dark
                  ? "text-driver-text-3 hover:bg-white/10 hover:text-driver-text"
                  : "text-fg-3 hover:bg-hover hover:text-fg"
              )}
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
