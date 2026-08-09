"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { resetSandboxAction } from "@/app/hub/_actions/sandbox"
import { cn } from "@/lib/utils"

/**
 * Slim strip shown on every screen of a sandbox session: you're in the
 * playground, here's the door back to the seat picker, here's the reset.
 * `dark` variant sits on the navy driver/portal chrome.
 */
export function SandboxBanner({ dark = false }: { dark?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resetting, setResetting] = useState(false)

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
    <div
      className={cn(
        "mb-4 flex min-h-[40px] flex-wrap items-center gap-x-3 gap-y-1 rounded-control border px-3 py-1.5 text-[12.5px] font-semibold",
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
  )
}
