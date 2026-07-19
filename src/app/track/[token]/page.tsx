import type { Metadata } from "next"
import { getTrackedLoad } from "@/lib/hub/sharelinks"
import { TrackRefresher } from "@/components/hub/TrackRefresher"
import { StopTimeline } from "@/components/hub/StopTimeline"
import { LoadProgressBar, PUBLIC_FLOW, publicStatus } from "@/components/hub/LoadProgressBar"
import { getTrackAccent } from "./accent"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Shipment Tracking",
  robots: { index: false, follow: false },
}

function fmt(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [tracked, accent] = await Promise.all([
    getTrackedLoad(token).catch(() => null),
    getTrackAccent(token),
  ])

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
        {/* accent.rule defaults to the same rgba as the stock border-white/10 hairline,
            so an unset accent renders this card pixel-identical to before. */}
        <div
          className="rounded-2xl border bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] p-6 md:p-8"
          style={{ borderColor: accent.rule }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: accent.text }}>
            {carrierName}
          </p>
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
              <LoadProgressBar status={load.status} />
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
          <StopTimeline stops={stops} className="mt-6" />

          <p className="mt-6 border-t border-white/10 pt-4 text-body-xs text-steel-400">
            Live status page provided by {carrierName}. Updates appear as the driver moves.
          </p>
        </div>
      </div>
    </div>
  )
}
