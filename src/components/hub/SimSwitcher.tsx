"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { setSimViewAction } from "@/app/hub/_actions/simulation"
import { cn } from "@/lib/utils"
import type { SimView } from "@/lib/hub/mode"

const OPTIONS: { id: SimView; label: string }[] = [
  { id: "thind", label: "Thind" },
  { id: "ats", label: "ATS" },
  { id: "all", label: "All" },
]

export function SimSwitcher({
  current,
  size = "compact",
}: {
  current: SimView
  /** compact = header pill; comfortable = 44px taps in the workspace menu. */
  size?: "compact" | "comfortable"
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const comfortable = size === "comfortable"

  return (
    <div
      role="group"
      aria-label="Simulation company"
      className={cn(
        "flex items-center rounded-pill bg-hover p-0.5 font-semibold",
        comfortable ? "w-full text-sm" : "text-[11px]"
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await setSimViewAction(opt.id)
              router.refresh()
            })
          }}
          className={cn(
            "rounded-pill",
            comfortable ? "min-h-[44px] flex-1 px-3" : "min-h-[28px] px-2 py-1",
            current === opt.id ? "bg-surface text-fg shadow-card" : "text-fg-3 hover:text-fg"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
