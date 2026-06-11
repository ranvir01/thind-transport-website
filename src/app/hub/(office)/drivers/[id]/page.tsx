import { notFound } from "next/navigation"
import { getDriver } from "@/lib/hub/drivers"
import { listDocuments } from "@/lib/hub/documents"
import { listLoads } from "@/lib/hub/loads"
import { PageHeader, BackLink, Panel, StatusBadge } from "@/components/hub/ui"
import { DriverForm, type DriverFormState } from "@/components/hub/DriverForm"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { requireOfficeUser } from "@/lib/hub/session"
import { getActivePayRules } from "@/lib/hub/pay-rules-db"
import { describePayRules } from "@/lib/hub/pay-rules"
import { openDocumentRequests } from "@/lib/hub/driver-app"
import { listTimeOff } from "@/lib/hub/timeoff"
import { RequestDocumentPanel, TimeOffDecisionPanel } from "@/components/hub/DriverOfficePanels"
import { fmtCents, loadTotalCents } from "@/lib/hub/types"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const driver = await getDriver(user.carrierId, id).catch(() => null)
  if (!driver) notFound()
  const [documents, loads, payRules, openRequests, timeOff] = await Promise.all([
    listDocuments("driver", id),
    listLoads(user.carrierId, { driverId: id, status: "all" }),
    getActivePayRules(user.carrierId, id),
    openDocumentRequests(user.carrierId, id),
    listTimeOff(user.carrierId, { driverId: id, status: "requested" }),
  ])
  const payDescription = payRules ? describePayRules(payRules) : null

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
          <TimeOffDecisionPanel requests={timeOff} />
          <RequestDocumentPanel
            driverId={id}
            loads={loads
              .filter((l) => !["settled", "cancelled"].includes(l.status))
              .slice(0, 20)
              .map((l) => ({ id: l.id, reference: l.reference }))}
            openRequests={openRequests}
          />
          {payDescription ? (
            <Panel className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
                  How {driver.first_name} gets paid
                </h2>
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                  {payRules!.isAuto ? "Standard plan" : "Custom plan"}
                </span>
              </div>
              <ul className="space-y-1.5">
                {payDescription.earnings.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-body-sm text-steel-100">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> {line}
                  </li>
                ))}
              </ul>
              {payDescription.deductions.length > 0 ? (
                <>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-steel-300">Comes out each settlement</p>
                  <ul className="mt-1 space-y-1.5">
                    {payDescription.deductions.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-body-sm text-steel-200">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" /> {line}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="mt-3 text-body-xs text-steel-400">
                {payRules!.isAuto
                  ? "Set by the pay fields on this page — settlements always follow this plan."
                  : "This driver settles under a custom pay plan; the simple pay fields are ignored."}
              </p>
            </Panel>
          ) : null}
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
