import { CustomDetailsPanel } from "@/components/hub/CustomDetailsPanel"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { getCustomer, listContacts, listCrmActivities } from "@/lib/hub/customers"
import { listLoads } from "@/lib/hub/loads"
import { listDocuments } from "@/lib/hub/documents"
import { requireOfficeUser } from "@/lib/hub/session"
import { fmtCents, loadTotalCents } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, StatusBadge, moneyCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"
import { ContactsPanel, CrmNotesPanel } from "@/components/hub/CustomerPanels"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { VettingPanel } from "@/components/hub/VettingPanel"
import { AgreementSignPanel } from "@/components/hub/PacketPanels"
import { PortalAccessPanel } from "@/components/hub/PortalAccessPanel"
import { listPortalUsers } from "@/lib/hub/portal"
import { avgDaysToPay, fmcsaConfigured, latestVetting } from "@/lib/hub/vetting"

export const dynamic = "force-dynamic"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const customer = await getCustomer(user.carrierId, id).catch(() => null)
  if (!customer) notFound()

  const [contacts, loads, documents, activities, vetting, paySpeed] = await Promise.all([
    listContacts(user.carrierId, id),
    listLoads(user.carrierId, { customerId: id, status: "all" }),
    listDocuments(user.carrierId, "customer", id),
    listCrmActivities(user.carrierId, id),
    latestVetting(user.carrierId, id),
    avgDaysToPay(user.carrierId, id),
  ])
  const portalUsers = await listPortalUsers(user.carrierId, id)

  const revenue = loads
    .filter((l) => l.status !== "cancelled")
    .reduce((sum, l) => sum + loadTotalCents(l), 0)
  const avgRpm = (() => {
    const withMiles = loads.filter((l) => l.loaded_miles && l.status !== "cancelled")
    if (withMiles.length === 0) return null
    const totalRate = withMiles.reduce((sum, l) => sum + loadTotalCents(l), 0)
    const totalMiles = withMiles.reduce((sum, l) => sum + (l.loaded_miles ?? 0), 0)
    return totalMiles > 0 ? totalRate / 100 / totalMiles : null
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        }
      />

      {/* Relationship stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Loads</span>
          <p className={cn(moneyCls, "mt-1 text-2xl")}>{loads.length}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Revenue</span>
          <p className={cn(moneyCls, "mt-1 text-2xl")}>{fmtCents(revenue)}</p>
        </Panel>
        <Panel className="p-4">
          <span className="text-label text-fg-3 uppercase">Avg rate/mi</span>
          <p className={cn(moneyCls, "mt-1 text-2xl")}>
            {avgRpm ? `$${avgRpm.toFixed(2)}` : "—"}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <VettingPanel
            customerId={id}
            view={{
              configured: fmcsaConfigured(),
              snapshot: vetting
                ? {
                    allowed_to_operate: vetting.allowed_to_operate,
                    authority_status: vetting.authority_status,
                    legal_name: vetting.legal_name,
                    risk_score: vetting.risk_score,
                    risk_reasons: Array.isArray(vetting.risk_reasons) ? vetting.risk_reasons : [],
                    checked_at: String(vetting.checked_at),
                  }
                : null,
              paySpeed,
            }}
          />
          <PortalAccessPanel
            customerId={id}
            customerType={customer.type}
            users={portalUsers}
          />
          <AgreementSignPanel
            customerId={id}
            existingAgreement={(() => {
              const agreement = documents.find((d) => d.kind === "agreement")
              return agreement
                ? { file_name: agreement.file_name, url: agreement.url, created_at: String(agreement.created_at) }
                : null
            })()}
          />
          <ContactsPanel customerId={id} contacts={contacts} />
          <CrmNotesPanel customerId={id} activities={activities} />
          <DocumentsPanel entityType="customer" entityId={id} documents={documents} />
        </div>

        <Panel className="p-4 md:p-5">
          <h2 className="text-[13.5px] font-semibold text-fg mb-3">
            Load history
          </h2>
          {loads.length === 0 ? (
            <p className="text-body-sm text-fg-3">No loads with this customer yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {loads.slice(0, 15).map((load) => (
                <li key={load.id}>
                  <Link href={`/hub/loads/${load.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-hover rounded-control px-2 -mx-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{load.reference}</p>
                      <p className="text-body-xs text-fg-3 truncate">
                        {load.origin_city ? `${load.origin_city}, ${load.origin_state}` : "—"} → {load.dest_city ? `${load.dest_city}, ${load.dest_state}` : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={load.status} />
                      <span className={cn(moneyCls, "text-sm text-accent-text")}>{fmtCents(loadTotalCents(load))}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <CustomDetailsPanel entity="customer" entityId={id} />
      </div>
    </div>
  )
}
