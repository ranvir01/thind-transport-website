import Link from "next/link"
import { Plus } from "lucide-react"
import { listDriversWithExpiry } from "@/lib/hub/drivers"
import { requireOfficeUser } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  inactive: "bg-steel-700/60 text-steel-200 border-steel-500/40",
  applicant: "bg-sky-500/15 text-sky-300 border-sky-400/30",
}

export default async function DriversPage() {
  const user = await requireOfficeUser()
  const drivers = await listDriversWithExpiry(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Roster, pay setup, and qualification files."
        action={
          <Link
            href="/hub/drivers/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" /> Add driver
          </Link>
        }
      />

      {drivers.length === 0 ? (
        <EmptyState title="No drivers yet" hint="Add your roster to start assigning loads." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drivers.map((driver) => (
            <Link key={driver.id} href={`/hub/drivers/${driver.id}`}>
              <Panel className="p-4 h-full hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-base">
                    {driver.first_name} {driver.last_name}
                  </span>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[driver.status])}>
                    {driver.status}
                  </span>
                </div>
                <p className="text-body-sm text-steel-200 mt-1">
                  {driver.pay_type === "percentage"
                    ? `${Math.round(Number(driver.pay_rate) * 100)}% commission`
                    : `$${Number(driver.pay_rate).toFixed(2)}/mile`}
                  {driver.phone ? ` · ${driver.phone}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-steel-300">
                  <span className="flex items-center gap-1">CDL <ExpiryPill date={driver.cdl_expiry} /></span>
                  <span className="flex items-center gap-1">Med <ExpiryPill date={driver.medical_card_expiry} /></span>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
