import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, FileText } from "lucide-react"
import { requirePortalUser } from "@/lib/hub/session"
import { portalLoad, portalLoadDocuments } from "@/lib/hub/portal"
import { DOCUMENT_KIND_LABELS, type LoadStatus } from "@/lib/hub/types"
import { StopTimeline } from "@/components/hub/StopTimeline"
// publicStatus folds the carrier's money states (POD received, invoiced,
// paid, settled) to "Delivered" — a customer's shipment, not the books.
import { LoadProgressBar, publicStatus } from "@/components/hub/LoadProgressBar"

export const dynamic = "force-dynamic"

const SECTION_HEADING = "mb-2 text-[13px] font-semibold text-steel-300"

function fmtWhen(value: string): string {
  return new Date(value).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

/** Plain-language document name; the raw kind is the fallback for anything the label map does not know. */
function documentLabel(kind: string): string {
  return (DOCUMENT_KIND_LABELS as Record<string, string>)[kind] ?? kind
}

/** A signed POD photographed on a phone — show the picture, not a generic file icon. */
function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp)(\?.*)?$/i.test(url)
}

export default async function PortalLoadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortalUser()
  const { id } = await params
  // Scoped fetch: the load must belong to THIS portal customer.
  const load = await portalLoad(user.carrierId, user.customerId, id).catch(() => null)
  if (!load) notFound()
  const documents = await portalLoadDocuments(user.carrierId, user.customerId, id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/hub/portal" aria-label="Back"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-white/15 text-steel-100 hover:bg-white/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 truncate font-mono text-xl font-semibold tabular-nums text-white">
          {load.reference}
        </h1>
        <span
          className="ml-auto shrink-0 rounded-pill border px-2.5 py-0.5 text-[11px] font-bold text-[color:var(--portal-accent)]"
          style={{
            borderColor: "color-mix(in srgb, var(--portal-accent) 40%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--portal-accent) 10%, transparent)",
          }}
        >
          {publicStatus(load.status as LoadStatus).label}
        </span>
      </div>

      <section className="driver-card p-4 space-y-2">
        <p className="text-sm text-steel-100">
          <span className="font-semibold text-white">{load.origin_city}, {load.origin_state}</span>
          {" → "}
          <span className="font-semibold text-white">{load.dest_city}, {load.dest_state}</span>
        </p>
        <LoadProgressBar status={load.status as LoadStatus} className="py-1" />
        {load.pickup_at ? (
          <p className="text-[13px] text-steel-300">Pickup {fmtWhen(load.pickup_at)}</p>
        ) : null}
        {load.delivery_at ? (
          <p className="text-[13px] text-steel-300">Delivery {fmtWhen(load.delivery_at)}</p>
        ) : null}
        {load.position_hint ? (
          <p className="text-body-sm text-[color:var(--portal-accent)]">{load.position_hint}</p>
        ) : null}
        {load.customer_reference ? (
          <p className="text-[13px] text-steel-300">Your reference: {load.customer_reference}</p>
        ) : null}
      </section>

      {load.stops.length > 0 ? (
        <section className="driver-card p-4">
          <h2 className="mb-3 text-[13px] font-semibold text-steel-300">Stops</h2>
          <StopTimeline stops={load.stops} />
        </section>
      ) : null}

      <section>
        <h2 className={SECTION_HEADING}>Documents</h2>
        {documents.length === 0 ? (
          <p className="driver-card driver-card--well px-4 py-3 text-body-sm text-steel-300">
            The signed POD appears here the moment the driver uploads it.
          </p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.url} target="_blank" rel="noreferrer"
                  className="driver-card flex min-h-[56px] items-center gap-3 p-3.5 hover:bg-driver-surface-2"
                >
                  {isImageUrl(doc.url) ? (
                    // Plain <img>: the file route serves the customer's own POD
                    // scan, and a 64px thumbnail needs no optimizer round-trip.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.url}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-control bg-white/[0.06] object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-[color:var(--portal-accent)]" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{documentLabel(doc.kind)}</span>
                    <span className="block text-[13px] text-steel-300 truncate">{doc.file_name}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
