"use client"

/**
 * Bottom sheet — the app's overlay for grouped actions and guided flows.
 * Radix Dialog underneath (focus trap, esc, portal, a11y labels); presented
 * as a bottom sheet on touch widths and a centered card from md up.
 * Token-aware (bg-surface/text-fg), unlike the marketing dialog primitive.
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Optional one-liner under the title. */
  description?: string
  children: React.ReactNode
  /** Wider desktop card for flows (importer stepper). */
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-backdrop-enter fixed inset-0 z-[90] bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed z-[95] flex flex-col bg-surface text-fg focus:outline-none hub-sheet-content",
            // Touch: full-width bottom sheet under the home indicator.
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[18px] border-t border-border shadow-overlay pb-[env(safe-area-inset-bottom)]",
            // md+: centered card (fade only — see .hub-sheet-content).
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[82vh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:border md:pb-0",
            wide ? "md:max-w-2xl" : "md:max-w-md"
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-pill bg-border-strong md:hidden" />
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-fg">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[13px] text-fg-3">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-fg-3 hover:bg-hover hover:text-fg"
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
