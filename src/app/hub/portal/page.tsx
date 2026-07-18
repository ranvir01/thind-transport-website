import Link from "next/link"
import { FileText, Package } from "lucide-react"
import { requirePortalUser } from "@/lib/hub/session"
import { portalInvoices, portalLoads, portalPacketDocuments } from "@/lib/hub/portal"
import { getCarrier } from "@/lib/hub/settings"
import { fmtCents, STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"
import { PortalQuoteForm } from "@/components/hub/PortalQuoteForm"
import { LoadProgressBar } from "@/components/hub/LoadProgressBar"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const INVOICE_STATUS_COPY: Record<string, { label: string; cls: string }> = {
  draft: { label: "Preparing", cls: "border-white/15 bg-white/5 text-steel-400" },
  sent: { label: "Awaiting payment", cls: "border-gold/40 bg-gold/10 text-gold" },
  partial: { label: "Partially paid", cls: "border-gold/40 bg-gold/10 text-gold" },
  paid: { label: "Paid — thank you", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  overdue: { label: "Past due", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  disputed: { label: "In review", cls: "border-white/15 bg-white/5 text-steel-400" },
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
          Hi {user.name.split(" ")[0]}
        </h1>
        <p className="text-body-sm text-steel-400">
          Live freight, documents, and payment status from {carrier?.name ?? "your carrier"} — no checking calls needed.
        </p>
      </div>

      {user.portalRole === "shipper" ? <PortalQuoteForm /> : null}

      {/* Moving now */}
      <section>
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-[color:var(--portal-accent)]">
          Moving now ({inTransit.length})
        </h2>
        {inTransit.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-navy-800/80 px-4 py-3 text-body-sm text-steel-400">
            Nothing on the road right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {inTransit.map((load) => (
              <li key={load.id}>
                <Link
                  href={`/hub/portal/loads/${load.id}`}
                  className="block rounded-2xl border border-white/10 bg-navy-800/80 p-4 hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">
                      {load.reference}
                      {load.customer_reference ? <span className="text-steel-400 font-normal"> · your ref {load.customer_reference}</span> : null}
                    </p>
                    <span className="shrink-0 rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-bold text-green-400">
                      {STATUS_LABELS[load.status as LoadStatus] ?? load.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-body-sm text-steel-200">
                    {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
                  </p>
                  <LoadProgressBar status={load.status as LoadStatus} className="mt-2.5" />
                  {load.position_hint ? (
                    <p className="mt-1.5 text-body-xs text-gold">{load.position_hint}</p>
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
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-[color:var(--portal-accent)]">Invoices</h2>
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-800/80">
            {invoices.map((invoice) => {
              const status = INVOICE_STATUS_COPY[invoice.status] ?? INVOICE_STATUS_COPY.sent
              return (
                <li key={invoice.id} className="flex items-center justify-between gap-2 p-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{invoice.number} · {invoice.load_reference}</p>
                    <p className="text-body-xs text-steel-400">
                      Due {new Date(invoice.due_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", status.cls)}>
                      {status.label}
                    </span>
                    <span className="font-display font-extrabold text-gold">{fmtCents(invoice.amount_cents)}</span>
                    {invoice.pdf_url ? (
                      <a href={invoice.pdf_url} target="_blank" rel="noreferrer" aria-label="Download invoice"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-steel-200 hover:bg-white/5">
                        <FileText className="h-4 w-4" />
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
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-steel-400">
            Recent shipments
          </h2>
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-800/80">
            {recent.slice(0, 10).map((load) => (
              <li key={load.id}>
                <Link href={`/hub/portal/loads/${load.id}`} className="flex items-center justify-between gap-2 p-3.5 hover:bg-white/5">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-white">{load.reference}</span>
                    <span className="text-steel-400"> · {load.origin_city} → {load.dest_city}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-steel-400">
                    <Package className="h-3.5 w-3.5" /> {STATUS_LABELS[load.status as LoadStatus] ?? load.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Carrier paperwork */}
      {packet.length > 0 ? (
        <section>
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-steel-400">
            Carrier paperwork
          </h2>
          <div className="flex flex-wrap gap-2">
            {packet.map((doc) => (
              <a
                key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-body-xs font-semibold text-steel-200 hover:bg-white/5"
              >
                <FileText className="h-3.5 w-3.5" />
                {doc.kind === "insurance" ? "Certificate of insurance" : doc.kind === "w9" ? "W-9" : "Authority letter"}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
