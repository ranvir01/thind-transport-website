"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Quote } from "lucide-react"
import { portalQuoteRequestAction } from "@/app/hub/_actions/portal"
import { fieldCls, labelCls } from "@/components/hub/ui"

export function PortalQuoteForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    originCity: "", originState: "", destCity: "", destState: "",
    pickupDate: "", equipment: "dry_van" as "flatbed" | "reefer" | "dry_van",
    weightLbs: "", commodity: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await portalQuoteRequestAction(form)
      if (result.ok) {
        toast.success(`Quote request ${result.reference} is with dispatch — they'll call you back`)
        setOpen(false)
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover"
      >
        <Quote className="h-4 w-4" /> Request a quote
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4 space-y-3">
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <div>
          <label htmlFor="q-ocity" className={labelCls}>Pickup city *</label>
          <input id="q-ocity" required className={fieldCls} value={form.originCity}
            onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
        </div>
        <div>
          <label htmlFor="q-ostate" className={labelCls}>State *</label>
          <input id="q-ostate" required maxLength={2} className={fieldCls} value={form.originState}
            onChange={(e) => setForm({ ...form, originState: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <div>
          <label htmlFor="q-dcity" className={labelCls}>Delivery city *</label>
          <input id="q-dcity" required className={fieldCls} value={form.destCity}
            onChange={(e) => setForm({ ...form, destCity: e.target.value })} />
        </div>
        <div>
          <label htmlFor="q-dstate" className={labelCls}>State *</label>
          <input id="q-dstate" required maxLength={2} className={fieldCls} value={form.destState}
            onChange={(e) => setForm({ ...form, destState: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="q-date" className={labelCls}>Pickup date</label>
          <input id="q-date" type="date" className={fieldCls} value={form.pickupDate}
            onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
        </div>
        <div>
          <label htmlFor="q-equip" className={labelCls}>Equipment</label>
          <select id="q-equip" className={fieldCls} value={form.equipment}
            onChange={(e) => setForm({ ...form, equipment: e.target.value as typeof form.equipment })}>
            <option value="dry_van">Dry van</option>
            <option value="reefer">Reefer</option>
            <option value="flatbed">Flatbed</option>
          </select>
        </div>
        <div>
          <label htmlFor="q-weight" className={labelCls}>Weight (lbs)</label>
          <input id="q-weight" inputMode="numeric" className={fieldCls} value={form.weightLbs}
            onChange={(e) => setForm({ ...form, weightLbs: e.target.value })} />
        </div>
        <div>
          <label htmlFor="q-commodity" className={labelCls}>What is it?</label>
          <input id="q-commodity" className={fieldCls} value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 min-h-[48px] rounded-xl border border-border-strong text-sm font-semibold text-fg-2 hover:bg-hover">
          Cancel
        </button>
        <button type="submit" disabled={pending}
          className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-fg hover:bg-accent-hover disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send the request
        </button>
      </div>
    </form>
  )
}
