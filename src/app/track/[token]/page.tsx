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
        <div
          className="w-full max-w-md rounded-card p-8 text-center"
          style={{
            background: "#1c1e23",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.3)",
          }}
        >
          <h1 className="font-sans text-[22px] font-semibold normal-case text-white">
            Link expired or revoked
          </h1>
          <p className="mt-2 text-body-sm text-steel-200">
            Ask your carrier contact for a fresh tracking link.
          </p>
        </div>
      </div>
    )
  }

  const { load, stops, carrierName, latestPosition, eta, pickupVerified } = tracked
  const status = publicStatus(load.status)
  const cancelled = load.status === "cancelled"
  const live = !cancelled && status.index < PUBLIC_FLOW.length - 1

  return (
    <div className="min-h-screen px-4 py-10">
      <TrackRefresher active={live} />
      <div className="mx-auto w-full max-w-lg">
        {/* Solid forced-dark card. /track loads without hub-theme.css, so the shared
            .driver-card class is unavailable and the surface is inlined here (same
            values as --driver-surface / --driver-shadow). accent.rule keeps the
            carrier's tint on the card edge; an unset accent is the stock hairline. */}
        <div
          className="rounded-card p-6 md:p-8"
          style={
            {
              background: "#1c1e23",
              border: `1px solid ${accent.rule}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.3)",
              "--portal-accent": accent.text,
            } as React.CSSProperties
          }
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: accent.text }}>
            {carrierName}
          </p>
          <h1 className="mt-1 font-sans text-[22px] font-semibold normal-case text-white">
            {load.reference}
          </h1>
          <p className="text-body-sm text-steel-200 capitalize">{load.equipment.replace("_", " ")} shipment</p>

          {/* Status progress */}
          {cancelled ? (
            <p className="mt-5 rounded-control border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">
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
              {eta ? (
                <p
                  className={`mt-1.5 text-sm font-semibold ${eta.late ? "text-amber-300" : "text-white"}`}
                  data-testid="track-eta"
                >
                  {eta.stopType === "pickup" ? "Arriving at pickup" : "Arriving"} {eta.label}
                  {eta.late ? <span className="font-normal text-amber-200/80"> · running behind the appointment</span> : null}
                </p>
              ) : null}
            </div>
          )}

          {/* Stops */}
          <StopTimeline stops={stops} className="mt-6" pickupVerified={pickupVerified} />

          <p className="mt-6 border-t border-white/10 pt-4 text-body-xs text-steel-300">
            Live status page provided by {carrierName}. Updates appear as the driver moves.
          </p>
        </div>
      </div>
    </div>
  )
}
