import { notFound } from "next/navigation"
import { getDriver } from "@/lib/hub/drivers"
import { listDocuments } from "@/lib/hub/documents"
import { listLoads } from "@/lib/hub/loads"
import { PageHeader, BackLink, Panel, StatusBadge } from "@/components/hub/ui"
import { DriverForm, type DriverFormState } from "@/components/hub/DriverForm"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { requireOfficeUser } from "@/lib/hub/session"
import { fmtCents, loadTotalCents } from "@/lib/hub/types"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const driver = await getDriver(user.carrierId, id).catch(() => null)
  if (!driver) notFound()
  const [documents, loads] = await Promise.all([
    listDocuments("driver", id),
    listLoads(user.carrierId, { driverId: id, status: "all" }),
  ])

  const initial: DriverFormState = {
    first_name: driver.first_name,
    last_name: driver.last_name,
    phone: driver.phone ?? "",
    email: driver.email ?? "",
    cdl_number: driver.cdl_number ?? "",
    cdl_state: driver.cdl_state ?? "",
    cdl_expiry: driver.cdl_expiry?.toString().slice(0, 10) ?? "",
    medical_card_expiry: driver.medical_card_expiry?.toString().slice(0, 10) ?? "",
    hire_date: driver.hire_date?.toString().slice(0, 10) ?? "",
    pay_type: driver.pay_type,
    pay_rate: Number(driver.pay_rate).toString(),
    pay_loaded_miles_only: driver.pay_loaded_miles_only,
    escrow_weekly: (driver.escrow_weekly_cents / 100).toFixed(2),
    insurance_weekly: (driver.insurance_weekly_cents / 100).toFixed(2),
    status: driver.status,
    emergency_contact_name: driver.emergency_contact_name ?? "",
    emergency_contact_phone: driver.emergency_contact_phone ?? "",
    notes: driver.notes ?? "",
  }

  return (
    <div>
      <BackLink href="/hub/drivers" label="Drivers" />
      <PageHeader title={`${driver.first_name} ${driver.last_name}`} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DriverForm driverId={id} initial={initial} />
        <div className="space-y-4 max-w-2xl">
          <DocumentsPanel entityType="driver" entityId={id} documents={documents} />
          <Panel className="p-4 md:p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">
              Recent loads
            </h2>
            {loads.length === 0 ? (
              <p className="text-body-sm text-steel-300">No loads yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {loads.slice(0, 8).map((load) => (
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
                        <span className="font-display font-extrabold text-gold text-sm">{fmtCents(loadTotalCents(load))}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
