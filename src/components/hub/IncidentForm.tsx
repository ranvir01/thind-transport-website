"use client"

/**
 * Office incident entry/edit. The three yes/no questions ARE the 49 CFR 390.5
 * accident test — answering them is what makes the DOT register derivable.
 * Written in plain language for people who don't read regulations for fun.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldAlert } from "lucide-react"
import { saveIncident } from "@/app/hub/_actions/safety"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export interface IncidentFormState {
  occurredAt: string
  location: string
  description: string
  policeReport: string
  truckId: string
  driverId: string
  fatality: boolean
  injuryTreatedAway: boolean
  towAwayDisabling: boolean
  status: "open" | "under_review" | "closed"
}

const QUALIFIERS: {
  key: "fatality" | "injuryTreatedAway" | "towAwayDisabling"
  question: string
  hint: string
}[] = [
  {
    key: "fatality",
    question: "Did anyone die?",
    hint: "Any fatality makes this a DOT-recordable accident.",
  },
  {
    key: "injuryTreatedAway",
    question: "Was anyone hurt badly enough to be treated away from the scene?",
    hint: "Ambulance ride or ER visit counts. First aid at the scene does not.",
  },
  {
    key: "towAwayDisabling",
    question: "Did any vehicle have to be towed because it couldn't drive away?",
    hint: "Disabling damage only — a tow for convenience doesn't count.",
  },
]

export function IncidentForm({
  incidentId,
  initial,
  trucks,
  drivers,
}: {
  incidentId: string | null
  initial: IncidentFormState
  trucks: { id: string; unit_number: string }[]
  drivers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<IncidentFormState>(initial)

  const recordable = form.fatality || form.injuryTreatedAway || form.towAwayDisabling

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveIncident(incidentId, {
        occurredAt: form.occurredAt,
        location: form.location || null,
        description: form.description || null,
        policeReport: form.policeReport || null,
        truckId: form.truckId || null,
        driverId: form.driverId || null,
        fatality: form.fatality,
        injuryTreatedAway: form.injuryTreatedAway,
        towAwayDisabling: form.towAwayDisabling,
        status: form.status,
      })
      if (result.ok) {
        toast.success(incidentId ? "Incident updated" : "Incident logged")
        router.push("/hub/safety")
        router.refresh()
      } else toast.error(result.error ?? "Could not save")
    })
  }

  return (
    <Panel className="p-4 md:p-6 max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="occurredAt" className={labelCls}>When it happened</label>
            <input
              id="occurredAt" type="datetime-local" required className={fieldCls}
              value={form.occurredAt}
              onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="location" className={labelCls}>Where (city, state or highway)</label>
            <input
              id="location" className={fieldCls} placeholder="I-84 MP 213, Baker City OR"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="driver" className={labelCls}>Driver</label>
            <select
              id="driver" className={fieldCls} value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            >
              <option value="">—</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="truck" className={labelCls}>Truck</label>
            <select
              id="truck" className={fieldCls} value={form.truckId}
              onChange={(e) => setForm({ ...form, truckId: e.target.value })}
            >
              <option value="">—</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>#{t.unit_number}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelCls}>What happened</label>
          <textarea
            id="description" rows={3} className={fieldCls}
            placeholder="Plain words — what, who, road conditions, other vehicles…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* 390.5 qualifiers */}
        <div className="rounded-card border border-border bg-surface-2 p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent-text">
            Three questions that decide if DOT counts this as an accident
          </p>
          {QUALIFIERS.map((q) => (
            <label key={q.key} className="flex items-start gap-3 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={form[q.key]}
                onChange={(e) => setForm({ ...form, [q.key]: e.target.checked })}
                className="mt-1 h-5 w-5 rounded border-border-strong bg-transparent accent-accent"
              />
              <span>
                <span className="block text-sm font-semibold text-fg">{q.question}</span>
                <span className="block text-body-xs text-fg-3">{q.hint}</span>
              </span>
            </label>
          ))}
          <p
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              recordable ? "bg-warn-soft text-warn border border-warn-soft" : "bg-surface-2 text-fg-2"
            )}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {recordable
              ? "DOT-recordable — this goes on the accident register automatically."
              : "Not DOT-recordable as answered — kept on file as an incident."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="policeReport" className={labelCls}>Police report # (if any)</label>
            <input
              id="policeReport" className={fieldCls} value={form.policeReport}
              onChange={(e) => setForm({ ...form, policeReport: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="status" className={labelCls}>Status</label>
            <select
              id="status" className={fieldCls} value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as IncidentFormState["status"] })}
            >
              <option value="open">Open</option>
              <option value="under_review">Under review</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <button
          type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {incidentId ? "Save changes" : "Log incident"}
        </button>
      </form>
    </Panel>
  )
}
