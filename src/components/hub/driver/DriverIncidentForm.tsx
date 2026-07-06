"use client"

/**
 * At-the-scene first report (390.5 questions in plain words). Geolocation is
 * optional and asked politely; photos can be added right after filing from
 * the office's incident record — the report itself must never block on them.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MapPin, ShieldAlert } from "lucide-react"
import { fileDriverIncidentReport } from "@/app/hub/_actions/safety"
import { fieldDarkCls, labelDarkCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

const QUESTIONS = [
  { key: "fatality" as const, q: "Did anyone die?" },
  { key: "injuryTreatedAway" as const, q: "Was anyone taken away for medical treatment?" },
  { key: "towAwayDisabling" as const, q: "Did any vehicle need a tow because it couldn't drive?" },
]

export function DriverIncidentForm({ loads }: { loads: { id: string; reference: string }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState({
    location: "",
    description: "",
    policeReport: "",
    loadId: loads[0]?.id ?? "",
    fatality: false,
    injuryTreatedAway: false,
    towAwayDisabling: false,
  })

  const grabLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        toast.success("Location attached")
      },
      () => toast.error("Couldn't get your location — type where you are instead")
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await fileDriverIncidentReport({
        occurredAt: new Date().toISOString(),
        location: form.location,
        description: form.description,
        policeReport: form.policeReport || null,
        loadId: form.loadId || null,
        fatality: form.fatality,
        injuryTreatedAway: form.injuryTreatedAway,
        towAwayDisabling: form.towAwayDisabling,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      })
      if (result.ok) {
        toast.success("Report filed — the office has been alerted")
        router.push("/hub/driver")
        router.refresh()
      } else toast.error(result.error ?? "Could not file the report")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 space-y-3">
        <div>
          <label htmlFor="inc-location" className={labelDarkCls}>Where are you?</label>
          <div className="flex gap-2">
            <input
              id="inc-location" required className={fieldDarkCls}
              placeholder="I-90 EB near exit 110, Ellensburg WA"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <button
              type="button"
              onClick={grabLocation}
              aria-label="Use my GPS location"
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
                coords ? "border-gold/50 bg-gold/15 text-gold" : "border-white/15 text-steel-200 hover:bg-white/5"
              )}
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="inc-desc" className={labelDarkCls}>What happened?</label>
          <textarea
            id="inc-desc" rows={3} required className={fieldDarkCls}
            placeholder="Plain words. What, who, road conditions…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {loads.length > 0 ? (
          <div>
            <label htmlFor="inc-load" className={labelDarkCls}>On a load?</label>
            <select
              id="inc-load" className={fieldDarkCls} value={form.loadId}
              onChange={(e) => setForm({ ...form, loadId: e.target.value })}
            >
              <option value="">Not on a load</option>
              {loads.map((l) => (
                <option key={l.id} value={l.id}>{l.reference}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="inc-police" className={labelDarkCls}>Police report # (if they gave you one)</label>
          <input
            id="inc-police" className={fieldDarkCls} value={form.policeReport}
            onChange={(e) => setForm({ ...form, policeReport: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 space-y-2">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
          <ShieldAlert className="h-4 w-4" /> Three quick questions — answer honestly
        </p>
        {QUESTIONS.map(({ key, q }) => (
          <div key={key} className="flex items-center justify-between gap-3 min-h-[48px]">
            <p className="min-w-0 flex-1 text-sm font-semibold text-white">{q}</p>
            <div className="flex shrink-0 rounded-xl border border-white/15 overflow-hidden">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setForm({ ...form, [key]: value })}
                  className={cn(
                    "min-h-[44px] px-4 text-sm font-bold",
                    form[key] === value
                      ? value
                        ? "bg-accent text-accent-fg"
                        : "bg-white/15 text-white"
                      : "text-steel-400 hover:bg-white/5"
                  )}
                >
                  {value ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit" disabled={pending}
        className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-control bg-accent font-display text-base font-bold uppercase tracking-[0.08em] text-accent-fg hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        File the report
      </button>
      <p className="text-center text-body-xs text-steel-400">
        After filing, message dispatch any photos from the scene.
      </p>
    </form>
  )
}
