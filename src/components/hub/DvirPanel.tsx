"use client"

/**
 * Office DVIR panel on the truck page: inspection history, the open defect
 * grounding the truck, and the repair-certification form that (with the next
 * driver's pre-trip sign-off) releases it.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ClipboardCheck, Loader2, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { certifyRepairAction } from "@/app/hub/_actions/dvir"
import { fieldCls, Panel } from "@/components/hub/ui"
import type { Dvir } from "@/lib/hub/dvir"

export function DvirPanel({
  truckId,
  dvirs,
  state,
  openDvir,
}: {
  truckId: string
  dvirs: Dvir[]
  state: "clear" | "awaiting_repair" | "awaiting_review"
  openDvir: Dvir | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ vendor: "", cost: "", notes: "" })

  const certify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!openDvir) return
    startTransition(async () => {
      const result = await certifyRepairAction(openDvir.id, truckId, form)
      if (result.ok) {
        toast.success("Repair certified — the next driver's pre-trip sign-off releases the truck")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-white mb-2">
        <ClipboardCheck className="h-4 w-4 text-gold" /> Inspections (DVIR)
      </h2>

      {state !== "clear" && openDvir ? (
        <div className="mb-3 rounded-xl border border-orange/40 bg-orange/[0.07] p-3">
          <p className="text-sm font-bold text-orange">
            {state === "awaiting_repair"
              ? "Grounded — defects awaiting repair certification (396.13)"
              : "Repair certified — waiting on the next driver's pre-trip sign-off"}
          </p>
          <ul className="mt-1 space-y-0.5">
            {openDvir.defects.map((d, i) => (
              <li key={i} className="text-body-sm text-steel-100">
                • {d.label}{d.note ? ` — ${d.note}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-body-xs text-steel-300">
            Reported by {openDvir.driver_name} on{" "}
            {new Date(openDvir.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>

          {state === "awaiting_repair" ? (
            <form onSubmit={certify} className="mt-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  aria-label="Repair vendor" required placeholder="Who fixed it (shop/mechanic)"
                  className={fieldCls} value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
                <input
                  aria-label="Repair cost" placeholder="Cost $" inputMode="decimal"
                  className={fieldCls} value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
              <input
                aria-label="Repair notes" placeholder="What was done"
                className={fieldCls} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button
                type="submit" disabled={pending}
                className="flex min-h-[48px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Certify the repair
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {dvirs.length === 0 ? (
        <p className="text-body-sm text-steel-300">
          No inspections filed yet — drivers do post-trips from their phones in about two minutes.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {dvirs.map((dvir) => (
            <li key={dvir.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 text-steel-100">
                <span className="font-semibold text-white">{dvir.type === "post" ? "Post-trip" : "Pre-trip"}</span>
                {" · "}{dvir.driver_name}
                {" · "}
                {new Date(dvir.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  dvir.defects.length === 0
                    ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : dvir.safe_to_operate
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-orange/40 bg-orange/10 text-orange"
                )}
              >
                {dvir.defects.length === 0 ? (
                  <><Check className="h-3 w-3" /> clean</>
                ) : (
                  `${dvir.defects.length} defect${dvir.defects.length > 1 ? "s" : ""}${dvir.safe_to_operate ? "" : " · grounded"}`
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
