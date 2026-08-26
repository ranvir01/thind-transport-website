"use client"

/** Facility detail editors: info card + office note composer (E2). */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MessageSquarePlus, Save } from "lucide-react"
import { addOfficeFacilityNoteAction, updateFacilityAction } from "@/app/hub/_actions/facilities"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { FACILITY_NOTE_TAGS } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

export function FacilityInfoForm({
  facilityId,
  initial,
}: {
  facilityId: string
  initial: { hours: string; phone: string; overnightParking: "yes" | "no" | ""; typicalLumper: string; notes: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initial)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateFacilityAction(facilityId, form)
      if (result.ok) {
        toast.success("Facility info saved")
        router.refresh()
      } else toast.error(result.error ?? "Could not save")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">
        The basics
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="fac-hours" className={labelCls}>Receiving hours</label>
            <input
              id="fac-hours" className={fieldCls} placeholder="Mon–Fri 06:00–14:00"
              value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="fac-phone" className={labelCls}>Phone</label>
            <input
              id="fac-phone" className={fieldCls}
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="fac-parking" className={labelCls}>Overnight parking</label>
            <select
              id="fac-parking" className={fieldCls} value={form.overnightParking}
              onChange={(e) => setForm({ ...form, overnightParking: e.target.value as "yes" | "no" | "" })}
            >
              <option value="">Unknown</option>
              <option value="yes">Yes — drivers can stay</option>
              <option value="no">No — plan parking nearby</option>
            </select>
          </div>
          <div>
            <label htmlFor="fac-lumper" className={labelCls}>Typical lumper ($)</label>
            <input
              id="fac-lumper" className={fieldCls} placeholder="150.00" inputMode="decimal"
              value={form.typicalLumper} onChange={(e) => setForm({ ...form, typicalLumper: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="fac-notes" className={labelCls}>Check-in process & quirks</label>
          <textarea
            id="fac-notes" rows={3} className={fieldCls}
            placeholder="Gate code, guard shack quirks, dock door range, who to call…"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button
          type="submit" disabled={pending}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </form>
    </Panel>
  )
}

export function OfficeNoteComposer({ facilityId }: { facilityId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const toggle = (tag: string) =>
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addOfficeFacilityNoteAction(facilityId, body, tags)
      if (result.ok) {
        toast.success("Note added — drivers see it on their stop cards")
        setBody("")
        setTags([])
        router.refresh()
      } else toast.error(result.error ?? "Could not add")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {FACILITY_NOTE_TAGS.map((tag) => (
          <button
            key={tag} type="button" onClick={() => toggle(tag)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-body-xs font-semibold capitalize min-h-[32px]",
              tags.includes(tag)
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border-strong bg-surface-2 text-fg-3"
            )}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          aria-label="Note" className={fieldCls} placeholder="Add what the next driver should know…"
          value={body} onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit" disabled={pending || (!body.trim() && tags.length === 0)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-5 w-5" />}
        </button>
      </div>
    </form>
  )
}
