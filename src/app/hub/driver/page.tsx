import Link from "next/link"
import { CalendarOff, ClipboardCheck, ShieldAlert, Wallet } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import {
  driverActiveLoads, lastPay, openDocumentRequests, driverExpiries,
} from "@/lib/hub/driver-app"
import { pendingAnnouncementsForUser } from "@/lib/hub/announcements"
import { getCarrierSettings } from "@/lib/hub/settings"
import { fmtCents } from "@/lib/hub/types"
import { DriverLoadCard } from "@/components/hub/driver/DriverLoadCard"
import { AnnouncementAckCard } from "@/components/hub/driver/AnnouncementAckCard"
import { DocRequestCard } from "@/components/hub/driver/DocRequestCard"
import { PushManager } from "@/components/hub/PushManager"
import { ExpiryPill } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function DriverHomePage() {
  const user = await requireDriverUser()
  const [loads, announcements, requests, pay, expiries, settings] = await Promise.all([
    driverActiveLoads(user.carrierId, user.driverId),
    pendingAnnouncementsForUser(user.carrierId, user.id, user.role, user.driverId),
    openDocumentRequests(user.carrierId, user.driverId),
    lastPay(user.carrierId, user.driverId),
    driverExpiries(user.carrierId, user.driverId),
    getCarrierSettings(user.carrierId),
  ])
  const detentionFreeMinutes = Math.round((settings.detention.freeHours ?? 2) * 60)

  return (
    <div className="space-y-4">
      {/* Pinned: announcements needing eyes, paperwork the office is waiting on */}
      {announcements.map((a) => (
        <AnnouncementAckCard key={a.id} announcement={a} />
      ))}
      {requests.map((r) => (
        <DocRequestCard key={r.id} request={r} />
      ))}

      {/* The work */}
      {loads.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-6 text-center">
          <p className="font-display text-lg font-extrabold text-white">No active load</p>
          <p className="mt-1 text-body-sm text-steel-300">
            When dispatch assigns you a load it shows up here — with an alert if you turned them on.
          </p>
          <div className="mt-4">
            <PushManager />
          </div>
        </section>
      ) : (
        loads.map((load) => (
          <DriverLoadCard key={load.id} load={load} detentionFreeMinutes={detentionFreeMinutes} />
        ))
      )}

      {/* Quick glances */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/hub/driver/pay"
          className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 hover:bg-white/5"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-steel-300">
            <Wallet className="h-3.5 w-3.5" /> Last pay
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-gold">
            {pay ? fmtCents(pay.net_cents) : "—"}
          </p>
          {pay ? (
            <p className="text-body-xs text-steel-300">
              week of {new Date(pay.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          ) : (
            <p className="text-body-xs text-steel-300">No settlements yet</p>
          )}
        </Link>
        <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">My cards</p>
          <div className="mt-1.5 space-y-1.5">
            <p className="flex items-center justify-between gap-1 text-body-xs text-steel-200">
              CDL <ExpiryPill date={expiries.cdl_expiry} />
            </p>
            <p className="flex items-center justify-between gap-1 text-body-xs text-steel-200">
              Med card <ExpiryPill date={expiries.medical_card_expiry} />
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/hub/driver/dvir"
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-white/15 px-1 font-display text-[11px] font-bold uppercase tracking-[0.04em] text-steel-100 hover:bg-white/5"
        >
          <ClipboardCheck className="h-4 w-4" /> Inspection
        </Link>
        <Link
          href="/hub/driver/timeoff"
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-white/15 px-1 font-display text-[11px] font-bold uppercase tracking-[0.04em] text-steel-100 hover:bg-white/5"
        >
          <CalendarOff className="h-4 w-4" /> Time off
        </Link>
        <Link
          href="/hub/driver/incident"
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-white/15 px-1 font-display text-[11px] font-bold uppercase tracking-[0.04em] text-steel-100 hover:bg-white/5"
        >
          <ShieldAlert className="h-4 w-4" /> Incident
        </Link>
      </div>

      {loads.length > 0 ? <PushManager compact /> : null}
    </div>
  )
}
