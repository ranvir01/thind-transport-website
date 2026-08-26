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

export function SimSwitcher({ current }: { current: SimView }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <div
      role="group"
      aria-label="Simulation company"
      className="flex items-center rounded-pill bg-hover p-0.5 text-[11px] font-semibold"
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
            "rounded-pill px-2 py-1 min-h-[28px]",
            current === opt.id ? "bg-surface text-fg shadow-card" : "text-fg-3 hover:text-fg"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
