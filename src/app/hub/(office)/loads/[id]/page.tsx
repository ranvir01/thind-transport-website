import { CustomDetailsPanel } from "@/components/hub/CustomDetailsPanel"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, FileText, MapPin, MessageSquare, CloudLightning, Camera, StickyNote, AlertTriangle } from "lucide-react"
import { getLoad, getLoadStops, getLoadEvents } from "@/lib/hub/loads"
import { getOsdClaimForLoad } from "@/lib/hub/claims"
import { fuelForLoad } from "@/lib/hub/fuel"
import { listDocuments } from "@/lib/hub/documents"
import { listShareLinks } from "@/lib/hub/sharelinks"
import { getInvoiceForLoad } from "@/lib/hub/invoices"
import { requireOfficeUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import {
  STATUS_LABELS, fmtCents, fmtCentsExact, loadTotalCents, type LoadEvent,
} from "@/lib/hub/types"
import { Panel, PageHeader, StatusBadge, BackLink } from "@/components/hub/ui"
import { AdvanceStatusButton, CancelLoadButton, StopTimestampButton, CheckCallButton } from "@/components/hub/StatusActions"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { ShareLinkPanel } from "@/components/hub/ShareLinkPanel"
import { MessageLoadButton } from "@/components/hub/MessageLoadButton"
import { DuplicateLoadButton } from "@/components/hub/DuplicateLoadButton"
import { RecurringLaneButton } from "@/components/hub/RecurringLaneButton"
import { getRecurringRule } from "@/lib/hub/recurring"
import { DetentionButton } from "@/components/hub/DetentionButton"
import { detentionCents } from "@/lib/hub/money"
import { getCarrierSettings } from "@/lib/hub/settings"
import { CreateInvoiceButton } from "@/components/hub/MoneyActions"
import { LoadFuelPanel } from "@/components/hub/LoadFuelPanel"
import { SuggestMilesButton } from "@/components/hub/SuggestMilesButton"

export const dynamic = "force-dynamic"

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

function eventIcon(kind: LoadEvent["kind"]) {
  switch (kind) {
    case "document": return Camera
    case "check_call": return MessageSquare
    case "geo": return MapPin
    case "weather_alert": return CloudLightning
    case "note": return StickyNote
    default: return MapPin
  }
}

function eventText(event: LoadEvent): string {
  const p = event.payload as Record<string, string | null>
  switch (event.kind) {
    case "status_change":
      return p.from
        ? `${STATUS_LABELS[p.from as keyof typeof STATUS_LABELS] ?? p.from} → ${STATUS_LABELS[p.to as keyof typeof STATUS_LABELS] ?? p.to}`
        : `Created as ${STATUS_LABELS[p.to as keyof typeof STATUS_LABELS] ?? p.to}`
    case "document":
      return `${String(p.kind ?? "document").replace("_", " ")} uploaded (${p.file ?? ""})`
    case "geo":
      return `${p.field === "arrived_at" ? "Arrived" : "Departed"} ${p.city ?? ""}, ${p.state ?? ""}`
    case "check_call":
      return `Check call: ${p.note ?? ""}`
    case "note":
      return String(p.note ?? "Note")
    case "weather_alert":
      return `Weather: ${p.event ?? ""}`
    case "detention":
      return `Detention flagged`
    default:
      return event.kind
  }
}

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const load = await getLoad(user.carrierId, id).catch(() => null)
  if (!load) notFound()

  const settings = await getCarrierSettings(user.carrierId)
  const [stops, events, documents, shareLinks, invoice, loadFuel, recurringRule, osdClaim] = await Promise.all([
    getLoadStops(user.carrierId, id),
    getLoadEvents(user.carrierId, id),
    listDocuments(user.carrierId, "load", id),
    listShareLinks(user.carrierId, id),
    getInvoiceForLoad(user.carrierId, id),
    fuelForLoad(user.carrierId, id),
    getRecurringRule(user.carrierId, id),
    getOsdClaimForLoad(user.carrierId, id),
  ])

  const totalCents = loadTotalCents(load)
  const rpmCents = load.loaded_miles ? totalCents / load.loaded_miles : null
  const canInvoice = can(user.role, "money:write") && load.status === "pod_received" && !invoice
  // Detention now auto-applies the moment a stop is marked departed (office or
  // driver side) — this button is only a fallback for loads that closed before
  // that shipped, or whose free-time/rate settings changed after the fact.
  const detentionEstimateCents = stops.reduce((sum, stop) => {
    if (!stop.arrived_at || !stop.departed_at) return sum
    return sum + detentionCents(
      new Date(stop.arrived_at), new Date(stop.departed_at),
      settings.detention.freeHours, settings.detention.ratePerHourCents
    )
  }, 0)
  const existingDetentionCents = (Array.isArray(load.accessorials) ? load.accessorials : [])
    .filter((a) => /detention/i.test(a.label))
    .reduce((sum, a) => sum + Number(a.amount_cents || 0), 0)

  return (
    <div>
      <BackLink href="/hub/loads" label="Loads" />
      <PageHeader
        title={load.reference}
        subtitle={load.customer_name ? `${load.customer_name}${load.customer_reference ? ` · Ref ${load.customer_reference}` : ""}${load.factored ? " · Factored" : ""}` : undefined}
        action={
          <div className="flex max-w-full flex-wrap gap-2">
            <MessageLoadButton loadId={id} />
            {can(user.role, "loads:write") ? (
              <RecurringLaneButton
                loadId={id}
                rule={recurringRule ? {
                  weekday: recurringRule.weekday,
                  enabled: recurringRule.enabled,
                  lastLoadRef: recurringRule.lastLoadRef,
                } : null}
              />
            ) : null}
            {can(user.role, "loads:write") ? <DuplicateLoadButton loadId={id} /> : null}
            <Link
              href={`/hub/loads/${id}/edit`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </div>
        }
      />

      {/* Status + actions */}
      <Panel className="p-4 md:p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={load.status} className="text-sm px-3 py-1" />
          {invoice ? (
            <Link href={`/hub/money/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/20">
              <FileText className="h-3.5 w-3.5" /> {invoice.number} · {invoice.status}
            </Link>
          ) : null}
          {osdClaim.osdFlagged ? (
            <Link
              href={osdClaim.claim ? `/hub/safety/claims/${osdClaim.claim.id}` : "/hub/safety/claims"}
              className="inline-flex items-center gap-1.5 rounded-full border border-warn-soft bg-warn-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warn hover:border-warn"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {osdClaim.claim ? `OS&D · Claim ${osdClaim.claim.status}` : "OS&D · No claim on file"}
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-2 ml-auto">
            {canInvoice ? <CreateInvoiceButton loadId={id} /> : <AdvanceStatusButton loadId={id} status={load.status} />}
            <CheckCallButton loadId={id} />
            {detentionEstimateCents > existingDetentionCents ? (
              <DetentionButton
                loadId={id}
                estimateCents={detentionEstimateCents}
                recompute={existingDetentionCents > 0}
              />
            ) : null}
            <CancelLoadButton loadId={id} status={load.status} />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Stops timeline */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-4">
              Stops
            </h2>
            {stops.length === 0 ? (
              <p className="text-body-sm text-fg-3">
                No stops on this load yet —{" "}
                <Link href={`/hub/loads/${id}/edit`} className="text-accent-text">edit the load</Link>{" "}
                to add pickup and delivery stops.
              </p>
            ) : null}
            <ol className="space-y-4">
              {stops.map((stop, i) => (
                <li key={stop.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        stop.departed_at
                          ? "border-ok-soft bg-ok-soft text-ok"
                          : stop.arrived_at
                            ? "border-warn-soft bg-warn-soft text-warn"
                            : "border-border-strong bg-surface-2 text-fg-2"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {i < stops.length - 1 ? <span className="w-px flex-1 bg-surface-2 my-1" /> : null}
                  </div>
                  <div className="flex-1 pb-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-fg-3">
                        {stop.type}
                      </span>
                      {stop.fcfs ? (
                        <span className="text-body-xs text-fg-3">FCFS</span>
                      ) : stop.appt_start ? (
                        <span className="text-body-xs text-fg-3">Appt {formatDateTime(stop.appt_start)}</span>
                      ) : null}
                      {stop.pickup_number ? <span className="text-body-xs text-fg-3">PU# {stop.pickup_number}</span> : null}
                      {stop.po_number ? <span className="text-body-xs text-fg-3">PO# {stop.po_number}</span> : null}
                    </div>
                    <p className="font-semibold text-fg">
                      {stop.facility ? `${stop.facility} · ` : ""}
                      {stop.city}, {stop.state} {stop.zip ?? ""}
                    </p>
                    {stop.address ? <p className="text-body-sm text-fg-3">{stop.address}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-body-xs text-fg-3">
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

          {/* Tracking links */}
          <ShareLinkPanel loadId={id} links={shareLinks} />
        </div>

        <div className="space-y-4">
          {/* Money */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Rate</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-fg-2">Linehaul</dt><dd className="text-fg font-semibold">{fmtCentsExact(load.linehaul_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Fuel surcharge</dt><dd className="text-fg font-semibold">{fmtCentsExact(load.fuel_surcharge_cents)}</dd></div>
              {(Array.isArray(load.accessorials) ? load.accessorials : []).map((acc, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-fg-2">{acc.label}</dt>
                  <dd className="text-fg font-semibold">{fmtCentsExact(acc.amount_cents)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-fg font-bold">Total</dt>
                <dd className="text-accent-text font-semibold text-lg">{fmtCents(totalCents)}</dd>
              </div>
              {rpmCents ? (
                <div className="flex justify-between">
                  <dt className="text-fg-2">Rate per mile</dt>
                  <dd className="text-fg font-semibold">${(rpmCents / 100).toFixed(2)}/mi · {load.loaded_miles} mi</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="text-fg-2">{load.loaded_miles ? "Loaded miles" : "Miles not set"}</dt>
                <dd><SuggestMilesButton loadId={id} canWrite={can(user.role, "loads:write")} /></dd>
              </div>
            </dl>
          </Panel>

          <LoadFuelPanel fuel={loadFuel} revenueCents={totalCents} canWrite={can(user.role, "fuel:write")} />

          {/* Assignment & details */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-fg-2">Driver</dt><dd className="text-fg font-semibold">{load.driver_name ?? "Unassigned"}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Truck</dt><dd className="text-fg font-semibold">{load.truck_unit ? `#${load.truck_unit}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Trailer</dt><dd className="text-fg font-semibold">{load.trailer_unit ? `#${load.trailer_unit}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Equipment</dt><dd className="text-fg font-semibold capitalize">{load.equipment.replace("_", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Commodity</dt><dd className="text-fg font-semibold">{load.commodity ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Weight</dt><dd className="text-fg font-semibold">{load.weight_lbs ? `${load.weight_lbs.toLocaleString()} lbs` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Source</dt><dd className="text-fg font-semibold uppercase">{load.source}</dd></div>
            </dl>
            {load.notes ? (
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-body-sm text-fg-2">{load.notes}</p>
            ) : null}
          </Panel>

          {/* Unified event timeline */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Timeline</h2>
            {events.length === 0 ? (
              <p className="text-body-sm text-fg-3">No activity yet — status changes, check calls, and documents land here.</p>
            ) : null}
            <ol className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {[...events].reverse().map((event) => {
                const Icon = eventIcon(event.kind)
                return (
                  <li key={event.id} className="flex items-start gap-2 text-body-sm">
                    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-fg-3" />
                    <div>
                      <p className="text-fg">{eventText(event)}</p>
                      <p className="text-body-xs text-fg-3">
                        {formatDateTime(event.created_at)}{event.actor_name ? ` · ${event.actor_name}` : ""}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>
          <CustomDetailsPanel entity="load" entityId={id} />
        </div>
      </div>
    </div>
  )
}
