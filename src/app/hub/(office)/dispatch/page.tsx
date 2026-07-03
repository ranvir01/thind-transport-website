import Link from "next/link"
import { Plus, CloudLightning, ClipboardPaste, AlertTriangle } from "lucide-react"
import { listLoads, getLoadStops } from "@/lib/hub/loads"
import { listDrivers, dispatchLegality } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { getCarrierSettings } from "@/lib/hub/settings"
import { getActiveAlerts, type WeatherAlert } from "@/lib/hub/weather"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  BOARD_STATUSES, STATUS_LABELS, fmtCents, loadTotalCents, type Load,
} from "@/lib/hub/types"
import { Panel, PageHeader, btnPrimaryCls, btnSecondaryCls } from "@/components/hub/ui"
import { AdvanceStatusButton } from "@/components/hub/StatusActions"

export const dynamic = "force-dynamic"

const DOC_CHECK: { kind: string; label: string }[] = [
  { kind: "rate_confirmation", label: "RC" },
  { kind: "bol", label: "BOL" },
  { kind: "pod", label: "POD" },
]

async function weatherForLoads(loads: Load[]): Promise<Map<string, WeatherAlert>> {
  // Severe weather at the next stop of moving loads (free NWS API, best-effort).
  const result = new Map<string, WeatherAlert>()
  const candidates = loads.filter((l) => ["dispatched", "at_pickup", "in_transit"].includes(l.status)).slice(0, 10)
  await Promise.all(
    candidates.map(async (load) => {
      try {
        const stops = await getLoadStops(load.id)
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
  const [loads, drivers, trucks, settings] = await Promise.all([
    listLoads(user.carrierId, { status: "active" }),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    getCarrierSettings(user.carrierId),
  ])
  const weather = await weatherForLoads(loads)
  const driverById = new Map(drivers.map((d) => [d.id, d]))
  const truckById = new Map(trucks.map((t) => [t.id, t]))

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

      {/* Mobile: stacked sections. Desktop: horizontal columns. */}
      <div className="flex flex-col lg:flex-row gap-4 lg:overflow-x-auto lg:pb-4">
        {BOARD_STATUSES.map((status) => {
          const column = byStatus.get(status) ?? []
          return (
            <section key={status} className="lg:w-[300px] lg:shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-label-lg uppercase tracking-wider text-fg-2 font-bold">
                  {STATUS_LABELS[status]}
                </h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-2">
                  {column.length}
                </span>
              </div>
              <div className="space-y-2">
                {column.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-center text-body-xs text-fg-3">
                    Empty
                  </div>
                ) : (
                  column.map((load) => {
                    const alert = weather.get(load.id)
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
                            <span className="font-mono font-medium text-accent-text tabular-nums text-sm">
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
                            <p className={`text-body-xs mt-0.5 font-semibold ${marginCents >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                              Est. margin {fmtCents(marginCents)} @ {fmtCents(settings.costPerMileCents)}/mi cost
                            </p>
                          ) : null}
                          {load.invoice_status ? (
                            <p className="text-body-xs text-fg-3 mt-0.5">
                              Invoice: <span className="uppercase font-bold text-cyan-300">{load.invoice_status}</span>
                            </p>
                          ) : null}
                        </Link>
                        {!legality.legal ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-400/30 px-2 py-1 text-[11px] font-semibold text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {legality.stops[0]}
                          </p>
                        ) : legality.warnings.length > 0 ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-warn-soft border border-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {legality.warnings[0]}
                          </p>
                        ) : null}
                        {alert ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-warn-soft border border-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                            <CloudLightning className="h-3.5 w-3.5 shrink-0" /> {alert.event} on route
                          </p>
                        ) : null}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            {DOC_CHECK.map((doc) => (
                              <span
                                key={doc.kind}
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                                  docKinds.includes(doc.kind)
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                                    : "bg-surface-2 text-fg-3 border-border"
                                }`}
                              >
                                {doc.label}
                              </span>
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
