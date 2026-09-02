import Link from "next/link"
import { FileText, Package, Truck } from "lucide-react"
import { requirePortalUser } from "@/lib/hub/session"
import { portalInvoices, portalLoads, portalPacketDocuments } from "@/lib/hub/portal"
import { getCarrier } from "@/lib/hub/settings"
import { fmtCents, type LoadStatus } from "@/lib/hub/types"
import { PortalQuoteForm } from "@/components/hub/PortalQuoteForm"
// publicStatus, not STATUS_LABELS: "POD received", "Invoiced", "Paid" and
// "Settled" are the carrier's back-office states, and a customer reading
// "Settled" on their shipment is being told when the driver got paid.
// Outside the office a delivered load is "Delivered" and nothing more.
import { LoadProgressBar, publicStatus } from "@/components/hub/LoadProgressBar"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const INVOICE_STATUS_COPY: Record<string, { label: string; cls: string; accent?: boolean }> = {
  draft: { label: "Preparing", cls: "border-white/15 bg-white/5 text-steel-300" },
  sent: { label: "Awaiting payment", cls: "text-[color:var(--portal-accent)]", accent: true },
  partial: { label: "Partially paid", cls: "text-[color:var(--portal-accent)]", accent: true },
  paid: { label: "Paid — thank you", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  overdue: { label: "Past due", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  disputed: { label: "In review", cls: "border-white/15 bg-white/5 text-steel-300" },
}

/** Invoices the customer still owes something on — everything issued and not yet paid. */
const OPEN_INVOICE_STATUSES = new Set(["sent", "partial", "overdue", "disputed"])

/** Same border/background mix the load detail page and StopTimeline use for --portal-accent chrome. */
const ACCENT_PILL_STYLE = {
  borderColor: "color-mix(in srgb, var(--portal-accent) 40%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--portal-accent) 10%, transparent)",
} as const

/**
 * Status pill on a moving load. Colour is data, not decoration: a dispatched
 * load is neutral (nothing has happened yet), at-pickup takes the carrier's
 * accent (the driver is on site), and only a load actually rolling or
 * delivered earns green.
 */
function movingPillCls(status: string): string {
  if (status === "dispatched") return "border-white/10 bg-white/[0.08] text-steel-200"
  if (status === "at_pickup") return "border-white/10 bg-white/[0.06] text-[color:var(--portal-accent)]"
  return "border-green-500/40 bg-green-500/10 text-green-400"
}

const SECTION_HEADING = "mb-2 text-[13px] font-semibold text-steel-300"

function fmtDay(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function PortalHomePage() {
  const user = await requirePortalUser()
  const [carrier, loads, invoices, packet] = await Promise.all([
    getCarrier(user.carrierId),
    portalLoads(user.carrierId, user.customerId),
    user.portalRole === "broker" ? portalInvoices(user.carrierId, user.customerId) : Promise.resolve([]),
    portalPacketDocuments(user.carrierId),
  ])
  const inTransit = loads.filter((l) => ["dispatched", "at_pickup", "in_transit"].includes(l.status))
  const recent = loads.filter((l) => !["dispatched", "at_pickup", "in_transit"].includes(l.status))
  const openInvoices = invoices.filter((i) => OPEN_INVOICE_STATUSES.has(i.status))
  const openCents = openInvoices.reduce((sum, i) => sum + i.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-white">
          Hi {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-body-sm text-steel-300">
          Live freight, documents, and payment status from {carrier?.name ?? "your carrier"} — no checking calls needed.
        </p>
      </div>

      {user.portalRole === "shipper" ? <PortalQuoteForm /> : null}

      {/* Moving now */}
      <section>
        <h2 className={SECTION_HEADING}>
          Moving now ({inTransit.length})
        </h2>
        {inTransit.length === 0 ? (
          <EmptyStateDark title="Nothing on the road right now." icon={<Truck className="h-5 w-5" />} />
        ) : (
          <ul className="space-y-3">
            {inTransit.map((load) => (
              <li key={load.id}>
                <Link
                  href={`/hub/portal/loads/${load.id}`}
                  className="driver-card block p-4 hover:bg-driver-surface-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 font-semibold text-white">
                      <span className="font-mono tabular-nums">{load.reference}</span>
                      {load.customer_reference ? <span className="text-steel-300 font-normal"> · your ref {load.customer_reference}</span> : null}
                    </p>
                    <span className={cn("shrink-0 rounded-pill border px-2.5 py-0.5 text-[11px] font-bold", movingPillCls(load.status))}>
                      {publicStatus(load.status as LoadStatus).label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-body-sm text-steel-200">
                    {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
                  </p>
                  <LoadProgressBar status={load.status as LoadStatus} className="mt-2.5" />
                  {load.position_hint ? (
                    <p className="mt-1.5 text-body-xs text-[color:var(--portal-accent)]">{load.position_hint}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invoices (brokers) */}
      {user.portalRole === "broker" && invoices.length > 0 ? (
        <section>
          <h2 className={SECTION_HEADING}>Invoices</h2>
          {/* AR at a glance, from the same rows listed below — no second query. */}
          <div className="driver-card driver-card--well mb-3 flex items-end justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-steel-300">Open invoices</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-white">{fmtCents(openCents)}</p>
            </div>
            <p className="text-[13px] tabular-nums text-steel-300">
              {openInvoices.length} of {invoices.length} open
            </p>
          </div>
          <ul className="driver-card divide-y divide-white/5">
            {invoices.map((invoice) => {
              const status = INVOICE_STATUS_COPY[invoice.status] ?? INVOICE_STATUS_COPY.sent
              return (
                <li key={invoice.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      <span className="font-mono tabular-nums">{invoice.number}</span> · {invoice.load_reference}
                    </p>
                    <p className="text-[13px] text-steel-300">
                      Due {fmtDay(invoice.due_on)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn("rounded-pill border px-2.5 py-0.5 text-[11px] font-bold", status.cls)}
                      style={status.accent ? ACCENT_PILL_STYLE : undefined}
                    >
                      {status.label}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[color:var(--portal-accent)]">
                      {fmtCents(invoice.amount_cents)}
                    </span>
                    {invoice.pdf_url ? (
                      <a href={invoice.pdf_url} target="_blank" rel="noreferrer" aria-label="Download invoice"
                        className="flex h-12 w-12 items-center justify-center rounded-control border border-white/15 text-steel-200 hover:bg-white/5">
                        <FileText className="h-5 w-5" />
                      </a>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {/* History */}
      {recent.length > 0 ? (
        <section>
          <h2 className={SECTION_HEADING}>
            Recent shipments
          </h2>
          <ul className="driver-card overflow-hidden divide-y divide-white/5">
            {recent.slice(0, 10).map((load) => {
              const when = load.delivery_at ?? load.pickup_at
              return (
                <li key={load.id}>
                  <Link href={`/hub/portal/loads/${load.id}`} className="block p-3.5 hover:bg-driver-surface-2">
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-mono text-sm font-semibold tabular-nums text-white">{load.reference}</span>
                      <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-steel-300">
                        <Package className="h-3.5 w-3.5" /> {publicStatus(load.status as LoadStatus).label}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-3 text-[13px] text-steel-300">
                      <span className="min-w-0 truncate">{load.origin_city} → {load.dest_city}</span>
                      {when ? <span className="shrink-0 tabular-nums text-steel-300">{fmtDay(when)}</span> : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {/* Carrier paperwork */}
      {packet.length > 0 ? (
        <section>
          <h2 className={SECTION_HEADING}>
            Carrier paperwork
          </h2>
          <div className="flex flex-wrap gap-3">
            {packet.map((doc) => (
              <a
                key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-white/15 px-4 text-[13px] font-semibold text-steel-200 hover:bg-white/5"
              >
                <FileText className="h-4 w-4" />
                {doc.kind === "insurance" ? "Certificate of insurance" : doc.kind === "w9" ? "W-9" : "Authority letter"}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
