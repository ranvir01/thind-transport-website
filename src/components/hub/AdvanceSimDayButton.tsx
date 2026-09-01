"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { advanceSimDayAction } from "@/app/hub/_actions/simulation"

export function AdvanceSimDayButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const result = await advanceSimDayAction()
          if (result.ok) {
            toast.success(`Simulated day is now ${result.date}`)
            router.refresh()
          } else {
            toast.error(result.error ?? "Could not advance")
          }
        })
      }}
      className={className ?? "rounded-control bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-text"}
    >
      {pending ? "Advancing…" : "Advance simulated day"}
    </button>
  )
}
