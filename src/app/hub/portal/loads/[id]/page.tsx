import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, FileText } from "lucide-react"
import { requirePortalUser } from "@/lib/hub/session"
import { portalLoad, portalLoadDocuments } from "@/lib/hub/portal"
import { STATUS_LABELS, type LoadStatus } from "@/lib/hub/types"

export const dynamic = "force-dynamic"

function fmt(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
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
      <div className="flex items-center gap-2">
        <Link
          href="/hub/portal" aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-steel-100 hover:bg-white/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-extrabold uppercase tracking-wide text-white">
          {load.reference}
        </h1>
        <span className="ml-auto rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold text-gold">
          {STATUS_LABELS[load.status as LoadStatus] ?? load.status}
        </span>
      </div>

      <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 space-y-2">
        <p className="text-sm text-steel-100">
          <span className="font-semibold text-white">{load.origin_city}, {load.origin_state}</span>
          {" → "}
          <span className="font-semibold text-white">{load.dest_city}, {load.dest_state}</span>
        </p>
        {load.pickup_at ? (
          <p className="text-body-xs text-steel-300">
            Pickup {new Date(load.pickup_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        ) : null}
        {load.delivery_at ? (
          <p className="text-body-xs text-steel-300">
            Delivery {new Date(load.delivery_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        ) : null}
        {load.position_hint ? <p className="text-body-sm text-gold">{load.position_hint}</p> : null}
        {load.customer_reference ? (
          <p className="text-body-xs text-steel-400">Your reference: {load.customer_reference}</p>
        ) : null}
      </section>

      {load.stops.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-steel-300">Stops</h2>
          <ol className="space-y-4">
            {load.stops.map((stop, i) => (
              <li key={stop.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      stop.departed_at
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                        : stop.arrived_at
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-white/15 bg-white/5 text-steel-200"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < load.stops.length - 1 ? <span className="w-px flex-1 bg-white/10 my-1" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{stop.type}</p>
                  <p className="font-semibold text-white">{stop.city}, {stop.state}</p>
                  <p className="text-body-xs text-steel-300">
                    {stop.fcfs ? "FCFS" : stop.appt_start ? `Appt ${fmt(stop.appt_start)}` : ""}
                    {stop.arrived_at ? ` · Arrived ${fmt(stop.arrived_at)}` : ""}
                    {stop.departed_at ? ` · Departed ${fmt(stop.departed_at)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-steel-300">Documents</h2>
        {documents.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-navy-800/80 px-4 py-3 text-body-sm text-steel-300">
            The signed POD appears here the moment the driver uploads it.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-800/80 p-3.5 hover:bg-white/5"
                >
                  <FileText className="h-5 w-5 shrink-0 text-gold" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white uppercase">{doc.kind}</span>
                    <span className="block text-body-xs text-steel-300 truncate">{doc.file_name}</span>
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
