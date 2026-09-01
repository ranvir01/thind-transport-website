import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { listDriverPayRules } from "@/lib/hub/pay-rules-db"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader } from "@/components/hub/ui"
import { PayRulesPanel } from "@/components/hub/PayRulesPanel"
import { DriverRunPayToggle } from "@/components/hub/DriverRunPayToggle"

export const dynamic = "force-dynamic"

/**
 * Driver pay programs (P3.1).
 *
 * hub.pay_rules has been fully modelled since migration 005 and the settlement
 * engine has consumed it all along — there was simply no screen. The only way
 * to express a driver's pay was the two simple fields on the driver form, so
 * anything real (per-mile plus stop pay, a percentage with a weekly deduction)
 * could not be entered at all. OWNER-CHECKLIST.md §3B calls driver pay "the
 * most important answer on this page".
 *
 * Read is money:read so any office role can see how drivers are paid; writing
 * needs drivers:write, the same authority the driver form already requires to
 * change a pay rate.
 */
export default async function PayRulesSettingsPage() {
  const user = await requirePermissionPage("money:read")
  const canWrite = can(user.role, "drivers:write")
  const [drivers, settings] = await Promise.all([
    listDriverPayRules(user.carrierId),
    getCarrierSettings(user.carrierId),
  ])

  return (
    <div>
      <PageHeader
        title="Driver pay"
        subtitle="What each driver earns per load, and what comes off each week. Used by every settlement drafted from here on."
      />
      <DriverRunPayToggle showRunPay={settings.driverApp.showRunPay} canWrite={canWrite} />
      <PayRulesPanel drivers={drivers} canWrite={canWrite} />
    </div>
  )
}
