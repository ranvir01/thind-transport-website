import Link from "next/link"
import { CalendarOff, ClipboardCheck, Clock3, CloudLightning, ShieldAlert, Wallet } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import {
  driverActiveLoads, lastPay, openDocumentRequests, driverExpiries, latestHosSnapshot,
  driverRunPay, driverUnsettledPay,
} from "@/lib/hub/driver-app"
import { getActiveAlerts } from "@/lib/hub/weather"
import { pendingAnnouncementsForUser } from "@/lib/hub/announcements"
import { getCarrierSettings } from "@/lib/hub/settings"
import { fmtCentsExact } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { DriverLoadCard } from "@/components/hub/driver/DriverLoadCard"
import { AnnouncementAckCard } from "@/components/hub/driver/AnnouncementAckCard"
import { DocRequestCard } from "@/components/hub/driver/DocRequestCard"
import { PushManager } from "@/components/hub/PushManager"
import { DriverExpiryPill } from "@/components/hub/driver/ExpiryPill"

export const dynamic = "force-dynamic"

/** Same border/background mix OfflineSync uses for --driver-accent chrome (opacity modifiers drop silently on CSS-var colors — AGENTS.md). */
const ACCENT_CARD_STYLE = {
  borderColor: "color-mix(in srgb, var(--driver-accent) 40%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--driver-accent) 8%, transparent)",
} as const

/** Quick-action tile: 56px tap target, body font, sentence case. */
const QUICK_TILE_CLS =
  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-control border border-white/15 px-1 text-[13px] font-semibold normal-case text-steel-200 hover:bg-white/5"

/**
 * HOS clock colour is data, not decoration (DESIGN.md): white while there is
 * time, amber inside the last hour, red once the clock has run out.
 */
function hosClockTone(minutes: number | null | undefined): string {
  if (minutes == null) return "text-white"
  if (minutes <= 0) return "text-red-300"
  if (minutes <= 60) return "text-amber-300"
  return "text-white"
}

export default async function DriverHomePage() {
  const user = await requireDriverUser()
  const [loads, announcements, requests, pay, expiries, settings, hos] = await Promise.all([
    driverActiveLoads(user.carrierId, user.driverId),
    pendingAnnouncementsForUser(user.carrierId, user.id, user.role, user.driverId),
    openDocumentRequests(user.carrierId, user.driverId),
    lastPay(user.carrierId, user.driverId),
    driverExpiries(user.carrierId, user.driverId),
    getCarrierSettings(user.carrierId),
    latestHosSnapshot(user.carrierId, user.driverId),
  ])
  const detentionFreeMinutes = Math.round((settings.detention.freeHours ?? 2) * 60)

  // What the work is worth, if this carrier shows it. Both figures come from
  // the same engine that drafts settlements, so the phone can never quote a
  // wage the office would not pay. Needs `loads` first, hence a second await.
  const showRunPay = settings.driverApp?.showRunPay !== false
  const [runPay, unsettledCents] = showRunPay
    ? await Promise.all([
        driverRunPay(user.carrierId, user.driverId, loads.map((l) => l.id)),
        driverUnsettledPay(user.carrierId, user.driverId),
      ])
    : [new Map(), 0]

  // Weather along the current run (free NWS API, best-effort).
  const nextStop = loads[0]?.stops?.find((s) => !s.departed_at && s.lat != null && s.lng != null)
  const weatherAlerts = nextStop ? await getActiveAlerts(nextStop.lat!, nextStop.lng!) : []

  return (
    <div className="space-y-4">
      {/* Pinned: announcements needing eyes, paperwork the office is waiting on */}
      {announcements.map((a) => (
        <AnnouncementAckCard key={a.id} announcement={a} />
      ))}
      {requests.map((r) => (
        <DocRequestCard key={r.id} request={r} />
      ))}

      {weatherAlerts.length > 0 ? (
        <section className="driver-card p-4" style={ACCENT_CARD_STYLE}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">
            <CloudLightning className="h-4 w-4" /> Weather on your route
          </p>
          {weatherAlerts.slice(0, 2).map((alert, i) => (
            <p key={i} className="mt-1 text-body-sm text-steel-200">
              <span className="font-semibold text-white">{alert.event}:</span> {alert.headline}
            </p>
          ))}
        </section>
      ) : null}

      {/* The work */}
      {loads.length === 0 ? (
        <section className="driver-card p-6 text-center">
          <p className="text-lg font-semibold text-white">No active load</p>
          <p className="mt-1 text-body-sm text-steel-300">
            When dispatch assigns you a load it shows up here — with an alert if you turned them on.
          </p>
          <div className="mt-4">
            <PushManager />
          </div>
        </section>
      ) : (
        loads.map((load) => (
          <DriverLoadCard
            key={load.id}
            load={load}
            detentionFreeMinutes={detentionFreeMinutes}
            pay={runPay.get(load.id) ?? null}
          />
        ))
      )}

      {/* Quick glances */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/hub/driver/pay"
          className="driver-card p-4"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-steel-300">
            <Wallet className="h-3.5 w-3.5" /> Last pay
          </p>
          <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-[color:var(--driver-accent)]">
            {pay ? fmtCentsExact(pay.net_cents) : "—"}
          </p>
          {pay ? (
            <p className="text-body-xs text-steel-300">
              week of {new Date(pay.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          ) : (
            <p className="text-body-xs text-steel-300">No settlements yet</p>
          )}
          {/* Everything earned since that settlement closed. Without this a
              driver sees nothing at all between delivering on Tuesday and the
              office approving on Friday. */}
          {showRunPay && unsettledCents > 0 ? (
            <p className="mt-2 border-t border-white/10 pt-2 text-body-xs text-steel-300">
              <span className="font-bold text-white">{fmtCentsExact(unsettledCents)}</span> since
              then, not settled yet
            </p>
          ) : null}
        </Link>
        <div className="driver-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">My cards</p>
          <div className="mt-1.5 space-y-1.5">
            <p className="flex items-center justify-between gap-1 text-body-xs text-steel-200">
              CDL <DriverExpiryPill date={expiries.cdl_expiry} />
            </p>
            <p className="flex items-center justify-between gap-1 text-body-xs text-steel-200">
              Med card <DriverExpiryPill date={expiries.medical_card_expiry} />
            </p>
          </div>
        </div>
      </div>

      {/* HOS clocks — display only, the ELD is always the legal record */}
      <div className="driver-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-steel-300">
          <Clock3 className="h-3.5 w-3.5" /> Hours of service
        </p>
        {hos ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Drive", minutes: hos.drive_remaining_minutes },
              { label: "Shift", minutes: hos.shift_remaining_minutes },
              { label: "Cycle", minutes: hos.cycle_remaining_minutes },
            ].map((clock) => (
              <div key={clock.label} className="driver-card driver-card--well py-2">
                <p className={cn("font-mono text-xl font-medium tabular-nums", hosClockTone(clock.minutes))}>
                  {clock.minutes != null ? `${Math.floor(clock.minutes / 60)}h ${clock.minutes % 60}m` : "—"}
                </p>
                <p className="text-[12px] font-bold uppercase tracking-wider text-steel-300">{clock.label}</p>
              </div>
            ))}
            <p className="col-span-3 text-[12px] text-steel-300">
              From the ELD as of {new Date(hos.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — the ELD is always the legal record.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-body-xs text-steel-300">
            Clocks show here automatically once the ELD sync is connected. Your ELD stays the legal record.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/hub/driver/dvir"
          className={QUICK_TILE_CLS}
        >
          <ClipboardCheck className="h-4 w-4" /> Inspection
        </Link>
        <Link
          href="/hub/driver/timeoff"
          className={QUICK_TILE_CLS}
        >
          <CalendarOff className="h-4 w-4" /> Time off
        </Link>
        <Link
          href="/hub/driver/incident"
          className={QUICK_TILE_CLS}
        >
          <ShieldAlert className="h-4 w-4" /> Incident
        </Link>
      </div>

      {loads.length > 0 ? <PushManager compact /> : null}
    </div>
  )
}
