"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FlaskConical, Loader2, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { resetSandboxAction } from "@/app/hub/_actions/sandbox"
import { SANDBOX_TOURS, sandboxSeat } from "@/lib/hub/sandbox"
import { cn } from "@/lib/utils"

/**
 * Slim strip shown on every screen of a sandbox session, plus the per-seat
 * guided tour: the first three moves that make this chair make sense,
 * dismissable once per seat (localStorage). `dark` sits on navy chrome.
 */
export function SandboxBanner({ dark = false, seat }: { dark?: boolean; seat?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resetting, setResetting] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const tour = seat ? SANDBOX_TOURS[seat] : undefined
  const seatTitle = seat ? sandboxSeat(seat)?.title : undefined
  const tourKey = `sandbox-tour-${seat}`

  useEffect(() => {
    if (!tour) return
    try {
      if (!localStorage.getItem(tourKey)) setTourOpen(true)
    } catch {
      /* storage blocked — keep the tour closed rather than nag every load */
    }
  }, [tour, tourKey])

  const dismissTour = () => {
    setTourOpen(false)
    try {
      localStorage.setItem(tourKey, "done")
    } catch {
      /* fine — it just reappears next session */
    }
  }

  const reset = () => {
    setResetting(true)
    startTransition(async () => {
      const result = await resetSandboxAction()
      if (result.ok) {
        toast.success("Sandbox reset")
        router.refresh()
      } else {
        toast.error(result.error ?? "Reset failed")
      }
      setResetting(false)
    })
  }

  return (
    <div className="mb-4">
      <div
        className={cn(
          "flex min-h-[40px] flex-wrap items-center gap-x-3 gap-y-1 rounded-control border px-3 py-1.5 text-[12.5px] font-semibold",
          dark
            ? "border-white/15 bg-white/[0.06] text-steel-200"
            : "border-accent-soft bg-accent-soft text-accent-text"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Sandbox — nothing here is real
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Link
            href="/hub/sandbox"
            className={cn(
              "rounded-control px-2 py-1 hover:underline",
              dark ? "text-white" : "text-accent-text"
            )}
          >
            Switch seat
          </Link>
          <button
            onClick={reset}
            disabled={pending || resetting}
            className={cn(
              "inline-flex items-center gap-1 rounded-control px-2 py-1 disabled:opacity-50",
              dark ? "text-white hover:bg-white/10" : "text-accent-text hover:bg-accent-soft"
            )}
          >
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reset
          </button>
        </span>
      </div>

      {tour && tourOpen ? (
        <div
          className={cn(
            "mt-2 rounded-card border p-3.5 shadow-card",
            dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-surface"
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className={cn("text-[13px] font-semibold", dark ? "text-white" : "text-fg")}>
              Your first three moves{seatTitle ? ` — ${seatTitle}` : ""}
            </p>
            <button
              onClick={dismissTour}
              aria-label="Dismiss tour"
              className={cn(
                "-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
                dark ? "text-steel-400 hover:bg-white/10 hover:text-white" : "text-fg-3 hover:bg-hover hover:text-fg"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="space-y-1">
            {tour.map((step, i) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  onClick={dismissTour}
                  className={cn(
                    "group flex min-h-[40px] items-center gap-2.5 rounded-control px-2 py-1.5 text-[13px]",
                    dark ? "text-steel-200 hover:bg-white/5" : "text-fg-2 hover:bg-hover"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-[11px] font-bold",
                      dark ? "bg-white/10 text-white" : "bg-accent-soft text-accent-text"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{step.label}</span>
                  <ArrowRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-fast group-hover:opacity-100",
                      dark ? "text-white" : "text-accent-text"
                    )}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
