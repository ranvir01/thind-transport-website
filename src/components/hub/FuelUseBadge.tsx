"use client"

/**
 * Fuel-use badge + one-tap reclassify (tractor / reefer / other).
 * Reefer fuel is IFTA-exempt, so getting this right is a money matter —
 * the control explains itself in plain words.
 */
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { reclassifyFuelUse } from "@/app/hub/_actions/fuel"
import { FUEL_USES, type FuelUse } from "@/lib/hub/types"

const STYLES: Record<FuelUse, string> = {
  tractor: "border-border-strong bg-surface-2 text-fg-2",
  reefer: "border-warn-soft bg-warn-soft text-warn",
  other: "border-border-strong bg-surface-2 text-fg-3",
}

const SHORT: Record<FuelUse, string> = {
  tractor: "Road",
  reefer: "Reefer",
  other: "Other",
}

const HINT: Record<FuelUse, string> = {
  tractor: "Counts toward IFTA + MPG",
  reefer: "IFTA-exempt (trailer fridge)",
  other: "DEF / additives — not motor fuel",
}

export function FuelUseBadge({ id, value }: { id: string; value: FuelUse }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<FuelUse>(value)
  const [pending, startTransition] = useTransition()

  const pick = (use: FuelUse) => {
    setOpen(false)
    if (use === current) return
    const previous = current
    setCurrent(use)
    startTransition(async () => {
      const result = await reclassifyFuelUse(id, use)
      if (!result.ok) {
        setCurrent(previous)
        toast.error(result.error ?? "Could not update")
      } else {
        toast.success(`Marked as ${SHORT[use].toLowerCase()} fuel — IFTA updates on the next run`)
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        title={HINT[current]}
        className={cn(
          "rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider min-h-[28px]",
          STYLES[current],
          pending && "opacity-50"
        )}
      >
        {SHORT[current]}
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          {FUEL_USES.map((use) => (
            <button
              key={use}
              onClick={() => pick(use)}
              className={cn(
                "block w-full px-3 py-2.5 text-left hover:bg-hover min-h-[44px]",
                use === current && "bg-surface-2"
              )}
            >
              <span className="text-sm font-semibold text-fg">{SHORT[use]} fuel</span>
              <span className="block text-[11px] text-fg-3">{HINT[use]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
