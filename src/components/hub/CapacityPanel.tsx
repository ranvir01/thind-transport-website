"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Megaphone, Trash2 } from "lucide-react"
import { postCapacityAction, removeCapacityAction } from "@/app/hub/_actions/capacity"
import { fieldCls, Panel } from "@/components/hub/ui"

export interface CapacityRow {
  id: string
  truck_unit: string | null
  equipment: string
  available_on: string
  origin_city: string
  origin_state: string
  dest_preference: string | null
  note: string | null
}

export function CapacityPanel({
  trucks,
  postings,
}: {
  trucks: { id: string; unit_number: string }[]
  postings: CapacityRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    truckId: "", equipment: "dry_van" as "flatbed" | "reefer" | "dry_van",
    availableOn: new Date().toISOString().slice(0, 10),
    originCity: "", originState: "", destPreference: "", note: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await postCapacityAction(form)
      if (result.ok) {
        toast.success("Posted — it shows on the public load board immediately")
        setForm({ ...form, originCity: "", destPreference: "", note: "" })
        router.refresh()
      } else toast.error(result.error ?? "Could not post")
    })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Panel className="p-4 md:p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-white mb-3">
          <Megaphone className="h-4 w-4 text-gold" /> Post available capacity
        </h2>
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Truck" className={fieldCls} value={form.truckId}
              onChange={(e) => setForm({ ...form, truckId: e.target.value })}>
              <option value="">Any truck</option>
              {trucks.map((t) => <option key={t.id} value={t.id}>#{t.unit_number}</option>)}
            </select>
            <select aria-label="Equipment" className={fieldCls} value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value as typeof form.equipment })}>
              <option value="dry_van">Dry van</option>
              <option value="reefer">Reefer</option>
              <option value="flatbed">Flatbed</option>
            </select>
            <input aria-label="Available on" type="date" required className={fieldCls} value={form.availableOn}
              onChange={(e) => setForm({ ...form, availableOn: e.target.value })} />
            <div className="grid grid-cols-[1fr_64px] gap-2">
              <input aria-label="Origin city" required placeholder="City *" className={fieldCls} value={form.originCity}
                onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
              <input aria-label="Origin state" required maxLength={2} placeholder="ST" className={fieldCls} value={form.originState}
                onChange={(e) => setForm({ ...form, originState: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <input aria-label="Destination preference" placeholder="Preferred destination (optional — 'anywhere west')"
            className={fieldCls} value={form.destPreference}
            onChange={(e) => setForm({ ...form, destPreference: e.target.value })} />
          <button type="submit" disabled={pending}
            className="flex min-h-[48px] items-center gap-2 rounded-xl bg-orange px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Post it
          </button>
        </form>
      </Panel>

      <Panel className="divide-y divide-white/5">
        {postings.length === 0 ? (
          <p className="p-5 text-body-sm text-steel-300">Nothing posted. Empty trucks don&apos;t pay for themselves.</p>
        ) : (
          postings.map((posting) => (
            <div key={posting.id} className="flex items-center justify-between gap-2 p-3.5 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-white">
                  {posting.truck_unit ? `#${posting.truck_unit} · ` : ""}
                  {posting.equipment.replace("_", " ")} · {posting.origin_city}, {posting.origin_state}
                </p>
                <p className="text-body-xs text-steel-300">
                  Available {new Date(posting.available_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {posting.dest_preference ? ` → ${posting.dest_preference}` : ""}
                </p>
              </div>
              <button
                aria-label="Remove posting"
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeCapacityAction(posting.id)
                    if (result.ok) router.refresh()
                    else toast.error(result.error ?? "Failed")
                  })
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-steel-400 hover:bg-white/5 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </Panel>
    </div>
  )
}
