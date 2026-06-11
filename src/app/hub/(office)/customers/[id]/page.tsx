import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { getCustomer, listContacts } from "@/lib/hub/customers"
import { listLoads } from "@/lib/hub/loads"
import { listDocuments } from "@/lib/hub/documents"
import { query } from "@/lib/hub/db"
import { formatMoney, loadTotal } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, StatusBadge } from "@/components/hub/ui"
import { ContactsPanel, CrmNotesPanel, type CrmActivity } from "@/components/hub/CustomerPanels"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"

export const dynamic = "force-dynamic"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id).catch(() => null)
  if (!customer) notFound()

  const [contacts, loads, documents, activities] = await Promise.all([
    listContacts(id),
    listLoads({ customerId: id, status: "all" }),
    listDocuments("customer", id),
    query<CrmActivity>(
      `SELECT id, kind, body, actor_name, created_at FROM hub.crm_activities
       WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 25`,
      [id]
    ),
  ])

  const revenue = loads
    .filter((l) => l.status !== "cancelled")
    .reduce((sum, l) => sum + loadTotal(l), 0)
  const avgRpm = (() => {
    const withMiles = loads.filter((l) => l.loaded_miles && l.status !== "cancelled")
    if (withMiles.length === 0) return null
    const totalRate = withMiles.reduce((sum, l) => sum + loadTotal(l), 0)
    const totalMiles = withMiles.reduce((sum, l) => sum + (l.loaded_miles ?? 0), 0)
    return totalMiles > 0 ? totalRate / totalMiles : null
  })()

  return (
    <div>
      <BackLink href="/hub/customers" label="Customers" />
      <PageHeader
        title={customer.name}
        subtitle={`${customer.type === "broker" ? "Broker" : "Shipper"}${customer.mc_number ? ` · MC ${customer.mc_number}` : ""} · Net ${customer.payment_terms_days}${customer.factored ? " · Factored" : ""}`}
        action={
          <Link
            href={`/hub/customers/${id}/edit`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        }
      />

      {/* Relationship stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Loads</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-white">{loads.length}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Revenue</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-gold">{formatMoney(revenue)}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-steel-300 uppercase">Avg rate/mi</span>
          <p className="mt-1 font-display text-2xl font-extrabold text-white">
            {avgRpm ? `$${avgRpm.toFixed(2)}` : "—"}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <ContactsPanel customerId={id} contacts={contacts} />
          <CrmNotesPanel customerId={id} activities={activities} />
          <DocumentsPanel entityType="customer" entityId={id} documents={documents} />
        </div>

        <Panel className="p-4 md:p-5">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">
            Load history
          </h2>
          {loads.length === 0 ? (
            <p className="text-body-sm text-steel-300">No loads with this customer yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {loads.slice(0, 15).map((load) => (
                <li key={load.id}>
                  <Link href={`/hub/loads/${load.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-white/5 rounded-lg px-2 -mx-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{load.reference}</p>
                      <p className="text-body-xs text-steel-300 truncate">
                        {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"} → {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={load.status} />
                      <span className="font-display font-extrabold text-gold text-sm">{formatMoney(loadTotal(load))}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
