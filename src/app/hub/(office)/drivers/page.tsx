import Link from "next/link"
import { Plus } from "lucide-react"
import { listDriversWithExpiry } from "@/lib/hub/drivers"
import { requireOfficeUser } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill, EmptyState, Pill, btnPrimaryCls } from "@/components/hub/ui"
import type { PillTone } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

/** Tone is data: on the roster / off it / still in recruiting. */
const STATUS_TONE: Record<string, PillTone> = {
  active: "ok",
  inactive: "neutral",
  applicant: "info",
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Add driver
          </Link>
        }
      />

      {drivers.length === 0 ? (
        <EmptyState
          title="No drivers yet"
          hint="Add your roster to start assigning loads."
          action={
            <Link href="/hub/drivers/new" className={btnPrimaryCls}>
              <Plus className="h-4 w-4" /> Add driver
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drivers.map((driver) => (
            <Link key={driver.id} href={`/hub/drivers/${driver.id}`}>
              <Panel className="p-4 h-full hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-fg text-base">
                    {driver.first_name} {driver.last_name}
                  </span>
                  <Pill tone={STATUS_TONE[driver.status] ?? "neutral"} size="xs" className="uppercase tracking-wider">
                    {driver.status}
                  </Pill>
                </div>
                <p className="text-body-sm text-fg-2 mt-1">
                  {driver.pay_type === "percentage"
                    ? `${Math.round(Number(driver.pay_rate) * 100)}% commission`
                    : `$${Number(driver.pay_rate).toFixed(2)}/mile`}
                  {driver.phone ? ` · ${driver.phone}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-fg-3">
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
