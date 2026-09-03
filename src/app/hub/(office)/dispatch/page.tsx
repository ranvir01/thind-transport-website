import Link from "next/link"
import { ShieldCheck, ShieldAlert, Plus, CloudLightning, ClipboardPaste, AlertTriangle, Clock } from "lucide-react"
import { listLoads, getLoadStops } from "@/lib/hub/loads"
import { listDrivers, dispatchLegality } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { getCarrierSettings } from "@/lib/hub/settings"
import { getActiveAlerts, type WeatherAlert } from "@/lib/hub/weather"
import { getDwellingStops } from "@/lib/hub/detention"
import { latestPickupVerificationsByLoad } from "@/lib/hub/pickup-verifications"
import { pickupPillLabel } from "@/lib/hub/pickup-verification"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  BOARD_STATUSES, STATUS_LABELS, fmtCents, loadTotalCents, type Load,
} from "@/lib/hub/types"
import { Panel, PageHeader, Pill, btnPrimaryCls, btnSecondaryCls, moneyCls } from "@/components/hub/ui"
import { AdvanceStatusButton } from "@/components/hub/StatusActions"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Raw invoice_status enum → sentence case: 12px uppercase sits off the type ladder. */
function invoiceStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
}

const DOC_CHECK: { kind: string; label: string }[] = [
  { kind: "rate_confirmation", label: "RC" },
  { kind: "bol", label: "BOL" },
  { kind: "pod", label: "POD" },
]

async function weatherForLoads(carrierId: string, loads: Load[]): Promise<Map<string, WeatherAlert>> {
  // Severe weather at the next stop of moving loads (free NWS API, best-effort).
  const result = new Map<string, WeatherAlert>()
  const candidates = loads.filter((l) => ["dispatched", "at_pickup", "in_transit"].includes(l.status)).slice(0, 10)
  await Promise.all(
    candidates.map(async (load) => {
      try {
        const stops = await getLoadStops(carrierId, load.id)
        const next = stops.find((s) => !s.departed_at && s.lat != null && s.lng != null)
        if (!next) return
        const alerts = await getActiveAlerts(next.lat!, next.lng!)
        if (alerts[0]) result.set(load.id, alerts[0])
      } catch { /* weather is garnish — never block the board */ }
    })
  )
  return result
}

export default async function DispatchBoardPage() {
  const user = await requireOfficeUser()
  const [loads, drivers, trucks, settings, dwelling] = await Promise.all([
    listLoads(user.carrierId, { status: "active" }),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    getCarrierSettings(user.carrierId),
    getDwellingStops(user.carrierId),
  ])
  const weather = await weatherForLoads(user.carrierId, loads)
  const driverById = new Map(drivers.map((d) => [d.id, d]))
  const truckById = new Map(trucks.map((t) => [t.id, t]))
  const dwellingByLoad = new Map(dwelling.map((d) => [d.loadId, d]))
  // Pickup verification chips: verified/mismatch only. "unverified" is the
  // normal offline case and would put a shrug on every card.
  const pickupByLoad = await latestPickupVerificationsByLoad(user.carrierId, loads.map((l) => l.id)).catch(
    () => new Map<string, never>()
  )

  const byStatus = new Map<string, Load[]>()
  for (const status of BOARD_STATUSES) byStatus.set(status, [])
  for (const load of loads) {
    if (byStatus.has(load.status)) byStatus.get(load.status)!.push(load)
  }

  return (
    <div>
      <PageHeader
        title="Dispatch Board"
        subtitle="Every active load, booking to POD."
        action={
          <div className="flex gap-2">
            <Link href="/hub/loads/paste" className={btnSecondaryCls}>
              <ClipboardPaste className="h-4 w-4" /> Paste rate con
            </Link>
            <Link href="/hub/loads/new" className={btnPrimaryCls}>
              <Plus className="h-4 w-4" /> New load
            </Link>
          </div>
        }
      />

      {/* Mobile: stacked sections. Desktop: horizontal columns — a visible scrollbar
          is the only hint that Delivered/POD Received sit past the fold. */}
      <div className="flex flex-col lg:flex-row gap-4 lg:overflow-x-auto lg:pb-4 lg:[&::-webkit-scrollbar]:h-2 lg:[&::-webkit-scrollbar-track]:bg-surface-2 lg:[&::-webkit-scrollbar-track]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-border-control lg:[&::-webkit-scrollbar-thumb]:rounded-full">
        {BOARD_STATUSES.map((status) => {
          const column = byStatus.get(status) ?? []
          return (
            <section key={status} className="lg:w-[300px] lg:shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[14px] font-semibold text-fg">
                  {STATUS_LABELS[status]}
                </h2>
                <Pill size="xs">{column.length}</Pill>
              </div>
              <div className="space-y-2">
                {column.length === 0 ? (
                  <div className="rounded-card border border-dashed border-border-control p-4 text-center text-body-xs text-fg-3">
                    Empty
                  </div>
                ) : (
                  column.map((load) => {
                    const alert = weather.get(load.id)
                    const dwell = dwellingByLoad.get(load.id)
                    const docKinds = load.doc_kinds ?? []
                    const totalCents = loadTotalCents(load)
                    const totalMiles = (load.loaded_miles ?? 0) + (load.deadhead_miles ?? 0)
                    const marginCents = totalMiles > 0 ? totalCents - totalMiles * settings.costPerMileCents : null
                    const legality = dispatchLegality(
                      load.driver_id ? driverById.get(load.driver_id) ?? null : null,
                      load.truck_id ? truckById.get(load.truck_id) ?? null : null
                    )
                    return (
                      <Panel key={load.id} className="p-3.5">
                        <Link href={`/hub/loads/${load.id}`} className="block group">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-fg group-hover:text-accent-text transition-colors">
                              {load.reference}
                            </span>
                            <span className={cn(moneyCls, "text-sm text-accent-text")}>
                              {fmtCents(totalCents)}
                            </span>
                          </div>
                          <p className="text-body-sm text-fg-2 mt-1">
                            {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"}
                            {" → "}
                            {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                          </p>
                          <p className="text-body-xs text-fg-3 mt-0.5 truncate">
                            {load.customer_name ?? "No customer"} · {load.driver_name ?? "Unassigned"}
                            {load.truck_unit ? ` · #${load.truck_unit}` : ""}
                          </p>
                          {marginCents != null ? (
                            <p className={`text-body-xs mt-0.5 font-semibold ${marginCents >= 0 ? "text-ok" : "text-bad"}`}>
                              Est. margin {fmtCents(marginCents)} @ {fmtCents(settings.costPerMileCents)}/mi cost
                            </p>
                          ) : null}
                          {load.invoice_status ? (
                            <p className="text-body-xs text-fg-3 mt-0.5">
                              Invoice: <span className="font-semibold text-accent-text">{invoiceStatusLabel(load.invoice_status)}</span>
                            </p>
                          ) : null}
                        </Link>
                        {!legality.legal ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-control bg-bad-soft border border-bad-soft px-2 py-1 text-[11px] font-semibold text-bad">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {legality.stops[0]}
                          </p>
                        ) : legality.warnings.length > 0 ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-control bg-warn-soft border border-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {legality.warnings[0]}
                          </p>
                        ) : null}
                        {alert ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-control bg-warn-soft border border-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                            <CloudLightning className="h-3.5 w-3.5 shrink-0" /> {alert.event} on route
                          </p>
                        ) : null}
                        {(() => {
                          const pv = pickupByLoad.get(load.id)
                          const label = pv ? pickupPillLabel(pv.result, pv.distance_miles == null ? null : Number(pv.distance_miles)) : null
                          if (!label) return null
                          const ok = pv!.result === "verified"
                          return (
                            <Link
                              href={`/hub/loads/${load.id}`}
                              className={`mt-2 flex items-center gap-1.5 rounded-control border px-2 py-1 text-[11px] font-semibold hover:bg-hover ${
                                ok ? "bg-ok-soft border-ok-soft text-ok" : "bg-bad-soft border-bad-soft text-bad"
                              }`}
                            >
                              {ok ? <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> : <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                              {label}
                            </Link>
                          )
                        })()}
                        {dwell ? (
                          <Link
                            href={`/hub/loads/${load.id}`}
                            className="mt-2 flex items-center gap-1.5 rounded-control bg-warn-soft border border-warn-soft px-2 py-1 text-[11px] font-semibold text-warn hover:bg-hover"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Dwelling {dwell.hoursOver.toFixed(1)}h over free time (~{fmtCents(dwell.estimatedCents)}) — mark departed to bill it
                          </Link>
                        ) : null}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            {DOC_CHECK.map((doc) => (
                              <Pill key={doc.kind} size="xs" tone={docKinds.includes(doc.kind) ? "ok" : "neutral"}>
                                {doc.label}
                              </Pill>
                            ))}
                          </div>
                          <AdvanceStatusButton loadId={load.id} status={load.status} compact />
                        </div>
                      </Panel>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {loads.length === 0 ? (
        <Panel className="p-8 text-center mt-2">
          <p className="text-fg font-semibold">The board is clear.</p>
          <p className="text-body-sm text-fg-2 mt-1">
            Book a load or <Link href="/hub/import" className="text-accent-text font-semibold">import your spreadsheet</Link> to get rolling.
          </p>
        </Panel>
      ) : null}
    </div>
  )
}
