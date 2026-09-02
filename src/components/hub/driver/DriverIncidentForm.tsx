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
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import {
  btnDriverPrimaryCls, fieldDarkCls, fieldDarkTextareaCls, labelDarkCls,
} from "@/components/hub/ui"
import { cn } from "@/lib/utils"

const QUESTIONS = [
  { key: "fatality" as const, q: "Did anyone die?" },
  { key: "injuryTreatedAway" as const, q: "Was anyone taken away for medical treatment?" },
  { key: "towAwayDisabling" as const, q: "Did any vehicle need a tow because it couldn't drive?" },
]

export function DriverIncidentForm({ loads }: { loads: { id: string; reference: string }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // After an offline queue, lock re-submit so a second tap can't enqueue a
  // duplicate crash report. The filled form stays readable at the scene.
  const [savedOffline, setSavedOffline] = useState(false)
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
    if (savedOffline) return
    startTransition(async () => {
      const input = {
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
      }
      // A crash scene is exactly where signal dies — the report must queue,
      // never vanish. Same offline path as the DVIR and load-card taps.
      const result = await runOrQueue({ kind: "incident", payload: input }, () =>
        fileDriverIncidentReport(input)
      )
      if ("queued" in result) {
        // No navigation while offline — router.push/refresh needs the network
        // it doesn't have, same as the DVIR queued path. Park the button
        // instead: a filled form with a live "File" invites a driver who
        // doubts the toast to queue the same report twice.
        toast.success("No signal — report saved on your phone, sends automatically")
        setSavedOffline(true)
      } else if (result.ok) {
        toast.success("Report filed — the office has been alerted")
        router.push("/hub/driver")
        router.refresh()
      } else toast.error(result.error ?? "Could not file the report")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="driver-card space-y-3 p-4">
        <div>
          <label htmlFor="inc-location" className={labelDarkCls}>Where are you?</label>
          <div className="flex gap-3">
            <input
              id="inc-location" required className={cn(fieldDarkCls, "h-12 md:h-12")}
              placeholder="I-90 EB near exit 110, Ellensburg WA"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <button
              type="button"
              onClick={grabLocation}
              aria-label="Use my GPS location"
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-control border",
                coords ? "text-[color:var(--driver-accent)]" : "border-white/15 text-steel-200 hover:bg-white/10"
              )}
              style={
                coords
                  ? {
                      borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--driver-accent) 15%, transparent)",
                    }
                  : undefined
              }
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="inc-desc" className={labelDarkCls}>What happened?</label>
          <textarea
            id="inc-desc" required className={fieldDarkTextareaCls}
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

      <div className="driver-card space-y-2 p-4">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">
          <ShieldAlert className="h-4 w-4" /> Three quick questions — answer honestly
        </p>
        {QUESTIONS.map(({ key, q }) => (
          <div key={key} className="flex min-h-[48px] items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm font-semibold text-white">{q}</p>
            <div role="group" aria-label={q} className="flex shrink-0 rounded-control border border-white/15 overflow-hidden">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={form[key] === value}
                  onClick={() => setForm({ ...form, [key]: value })}
                  className={cn(
                    "min-h-[44px] px-4 text-sm font-semibold",
                    form[key] === value
                      ? value
                        ? "bg-orange/25 text-orange-300"
                        : "bg-white/15 text-white"
                      : "text-steel-300 hover:bg-white/5"
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
        type="submit" disabled={pending || savedOffline}
        className={btnDriverPrimaryCls}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {savedOffline ? "Saved on your phone" : "File the report"}
      </button>
      {savedOffline ? (
        <p className="text-center text-[13px] text-steel-300">
          Sends automatically when you have signal — no need to tap again.
        </p>
      ) : null}
      <p className="text-center text-[13px] text-steel-300">
        After filing, message dispatch any photos from the scene.
      </p>
    </form>
  )
}
