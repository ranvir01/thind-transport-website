import type { Metadata } from "next"
import { getTrackedLoad } from "@/lib/hub/sharelinks"
import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"
import { TrackRefresher } from "@/components/hub/TrackRefresher"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Shipment Tracking",
  robots: { index: false, follow: false },
}

const PUBLIC_FLOW: LoadStatus[] = [
  "booked", "dispatched", "at_pickup", "in_transit", "delivered",
]

function publicStatus(status: LoadStatus): { label: string; index: number } {
  // Money statuses are internal — the public page shows "Delivered" at most.
  if (["pod_received", "invoiced", "paid", "settled"].includes(status)) {
    return { label: "Delivered", index: PUBLIC_FLOW.length - 1 }
  }
  const index = PUBLIC_FLOW.indexOf(status)
  return { label: STATUS_LABELS[status] ?? status, index: index === -1 ? 0 : index }
}

function fmt(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tracked = await getTrackedLoad(token).catch(() => null)

  if (!tracked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] p-8 text-center">
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
            Link expired or revoked
          </h1>
          <p className="mt-2 text-body-sm text-steel-200">
            Ask your carrier contact for a fresh tracking link.
          </p>
        </div>
      </div>
    )
  }

  const { load, stops, carrierName, latestPosition } = tracked
  const status = publicStatus(load.status)
  const cancelled = load.status === "cancelled"
  const live = !cancelled && status.index < PUBLIC_FLOW.length - 1

  return (
    <div className="min-h-screen px-4 py-10">
      <TrackRefresher active={live} />
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">{carrierName}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            {load.reference}
          </h1>
          <p className="text-body-sm text-steel-200 capitalize">{load.equipment.replace("_", " ")} shipment</p>

          {/* Status progress */}
          {cancelled ? (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">
              This load was cancelled.
            </p>
          ) : (
            <div className="mt-6">
              <div className="flex items-center gap-1.5">
                {PUBLIC_FLOW.map((step, i) => (
                  <div key={step} className={`h-2 flex-1 rounded-full ${i <= status.index ? "bg-gold" : "bg-white/10"}`} />
                ))}
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                {status.label}
                {latestPosition ? (
                  <span className="font-normal text-steel-300">
                    {" "}· last seen near {latestPosition.lat.toFixed(2)}, {latestPosition.lng.toFixed(2)} at {fmt(latestPosition.ts)}
                  </span>
                ) : null}
              </p>
            </div>
          )}

          {/* Stops */}
          <ol className="mt-6 space-y-4">
            {stops.map((stop, i) => (
              <li key={stop.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      stop.departed_at
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                        : stop.arrived_at
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-white/15 bg-white/5 text-steel-200"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < stops.length - 1 ? <span className="w-px flex-1 bg-white/10 my-1" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{stop.type}</p>
                  <p className="font-semibold text-white">{stop.city}, {stop.state}</p>
                  <p className="text-body-xs text-steel-300">
                    {stop.fcfs ? "FCFS" : stop.appt_start ? `Appt ${fmt(stop.appt_start)}` : ""}
                    {stop.arrived_at ? ` · Arrived ${fmt(stop.arrived_at)}` : ""}
                    {stop.departed_at ? ` · Departed ${fmt(stop.departed_at)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-white/10 pt-4 text-body-xs text-steel-400">
            Live status page provided by {carrierName}. Updates appear as the driver moves.
          </p>
        </div>
      </div>
    </div>
  )
}
