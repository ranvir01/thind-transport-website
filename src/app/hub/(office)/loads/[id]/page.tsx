import Link from "next/link"
import { notFound } from "next/navigation"
import { MapPin, Pencil } from "lucide-react"
import { getLoad, getLoadStops, getStatusEvents } from "@/lib/hub/loads"
import { listDocuments } from "@/lib/hub/documents"
import {
  STATUS_LABELS, formatMoney, formatMoneyExact, loadTotal,
} from "@/lib/hub/types"
import { Panel, PageHeader, StatusBadge, BackLink } from "@/components/hub/ui"
import { AdvanceStatusButton, CancelLoadButton, StopTimestampButton } from "@/components/hub/StatusActions"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"

export const dynamic = "force-dynamic"

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const load = await getLoad(id).catch(() => null)
  if (!load) notFound()

  const [stops, events, documents] = await Promise.all([
    getLoadStops(id), getStatusEvents(id), listDocuments("load", id),
  ])

  const total = loadTotal(load)
  const rpm = load.loaded_miles ? total / load.loaded_miles : null

  return (
    <div>
      <BackLink href="/hub/loads" label="Loads" />
      <PageHeader
        title={load.reference}
        subtitle={load.customer_name ? `${load.customer_name}${load.customer_reference ? ` · Ref ${load.customer_reference}` : ""}` : undefined}
        action={
          <Link
            href={`/hub/loads/${id}/edit`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        }
      />

      {/* Status + actions */}
      <Panel className="p-4 md:p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={load.status} className="text-sm px-3 py-1" />
          <div className="flex flex-wrap gap-2 ml-auto">
            <AdvanceStatusButton loadId={id} status={load.status} />
            <CancelLoadButton loadId={id} status={load.status} />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Stops timeline */}
          <Panel className="p-4 md:p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-4">
              Stops
            </h2>
            <ol className="space-y-4">
              {stops.map((stop, i) => (
                <li key={stop.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
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
                  <div className="flex-1 pb-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-steel-300">
                        {stop.type}
                      </span>
                      {stop.appt_start ? (
                        <span className="text-body-xs text-steel-400">
                          Appt {formatDateTime(stop.appt_start)}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold text-white">
                      {stop.facility ? `${stop.facility} · ` : ""}
                      {stop.city}, {stop.state} {stop.zip ?? ""}
                    </p>
                    {stop.address ? <p className="text-body-sm text-steel-300">{stop.address}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-body-xs text-steel-300">
                      <span>Arrived: {formatDateTime(stop.arrived_at)}</span>
                      <span>Departed: {formatDateTime(stop.departed_at)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StopTimestampButton stopId={stop.id} loadId={id} field="arrived_at" done={Boolean(stop.arrived_at)} />
                      {stop.arrived_at ? (
                        <StopTimestampButton stopId={stop.id} loadId={id} field="departed_at" done={Boolean(stop.departed_at)} />
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Documents */}
          <DocumentsPanel entityType="load" entityId={id} documents={documents} />
        </div>

        <div className="space-y-4">
          {/* Money */}
          <Panel className="p-4 md:p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">Rate</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-steel-200">Linehaul</dt><dd className="text-white font-semibold">{formatMoneyExact(load.linehaul)}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Fuel surcharge</dt><dd className="text-white font-semibold">{formatMoneyExact(load.fuel_surcharge)}</dd></div>
              {(Array.isArray(load.accessorials) ? load.accessorials : []).map((acc, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-steel-200">{acc.label}</dt>
                  <dd className="text-white font-semibold">{formatMoneyExact(acc.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-2">
                <dt className="text-white font-bold">Total</dt>
                <dd className="font-display text-gold font-extrabold text-lg">{formatMoney(total)}</dd>
              </div>
              {rpm ? (
                <div className="flex justify-between">
                  <dt className="text-steel-200">Rate per mile</dt>
                  <dd className="text-white font-semibold">${rpm.toFixed(2)}/mi · {load.loaded_miles} mi</dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          {/* Assignment & details */}
          <Panel className="p-4 md:p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-steel-200">Driver</dt><dd className="text-white font-semibold">{load.driver_name ?? "Unassigned"}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Truck</dt><dd className="text-white font-semibold">{load.truck_unit ? `#${load.truck_unit}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Trailer</dt><dd className="text-white font-semibold">{load.trailer_unit ? `#${load.trailer_unit}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Equipment</dt><dd className="text-white font-semibold capitalize">{load.equipment.replace("_", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Commodity</dt><dd className="text-white font-semibold">{load.commodity ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Weight</dt><dd className="text-white font-semibold">{load.weight_lbs ? `${load.weight_lbs.toLocaleString()} lbs` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-steel-200">Source</dt><dd className="text-white font-semibold uppercase">{load.source}</dd></div>
            </dl>
            {load.notes ? (
              <p className="mt-3 rounded-lg bg-white/5 p-3 text-body-sm text-steel-100">{load.notes}</p>
            ) : null}
          </Panel>

          {/* Status history */}
          <Panel className="p-4 md:p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">History</h2>
            <ol className="space-y-2.5">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-body-sm">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-steel-400" />
                  <div>
                    <p className="text-white">
                      {event.from_status ? `${STATUS_LABELS[event.from_status]} → ` : ""}
                      <span className="font-semibold">{STATUS_LABELS[event.to_status]}</span>
                    </p>
                    <p className="text-body-xs text-steel-400">
                      {formatDateTime(event.created_at)}{event.actor_name ? ` · ${event.actor_name}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  )
}
