"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { setNavigationModeAction } from "@/app/hub/_actions/company"
import { Panel } from "@/components/hub/ui"

type NavMode = "trimmed" | "full" | "default"

/**
 * Owner picks this carrier's navigation surface. The flag resolves
 * per-carrier (that was the whole point of nav.small_carrier_mode — the old
 * env var trimmed every tenant at once); "default" clears the override so
 * the deploy-wide default governs again.
 */
export function NavModePanel({
  override,
  codeDefault,
}: {
  /** The stored carrier override, or null when following the default. */
  override: boolean | null
  /** What the code default resolves to on this deploy. */
  codeDefault: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const current: NavMode = override === null ? "default" : override ? "trimmed" : "full"
  const [mode, setMode] = useState<NavMode>(current)

  const OPTIONS: { value: NavMode; label: string; hint: string }[] = [
    {
      value: "trimmed",
      label: "Small-fleet",
      hint: "Dispatch, money, fleet, compliance — the screens a small office lives in. Everything else stays reachable by URL and ⌘K stays quiet about it.",
    },
    {
      value: "full",
      label: "Full surface",
      hint: "Every section in the nav and the ⌘K palette, including planner, capacity, recruiting, and facilities.",
    },
    {
      value: "default",
      label: `Deploy default (currently ${codeDefault ? "small-fleet" : "full"})`,
      hint: "No per-company choice stored — follows whatever the deployment is configured to.",
    },
  ]

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await setNavigationModeAction(mode)
      if (result.ok) {
        toast.success("Navigation updated")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save")
      }
    })
  }

  return (
    <Panel className="max-w-3xl p-4 md:p-5">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-body-sm text-fg-2">
          How much of LoadOff shows in the sidebar and ⌘K for everyone at this company.
          Applies to this company only.
        </p>
        <div className="space-y-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 hover:bg-hover"
            >
              <input
                type="radio"
                name="nav_mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-body-xs text-fg-3">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending || mode === current}
          className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === current ? "Saved" : "Save navigation mode"}
        </button>
      </form>
    </Panel>
  )
}
