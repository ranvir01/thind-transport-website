import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { measuredOperatingCost } from "@/lib/hub/operating-cost"
import { PageHeader } from "@/components/hub/ui"
import { OperatingCostPanel } from "@/components/hub/OperatingCostPanel"

export const dynamic = "force-dynamic"

/** Trailing 90 days: long enough to smooth a quiet week, short enough to move. */
const WINDOW_DAYS = 90

/**
 * Operating cost per mile (P2.4).
 *
 * carrier_settings.costPerMileCents is the single constant behind every margin
 * figure in the product — the dispatch board prices a load as
 * `revenue - miles × cost`, and lanes.ts ranks every lane by it. It shipped as
 * a hardcoded 185¢ with no screen and nothing to check it against.
 *
 * The right-hand panel measures the carrier's own figure from data they already
 * have, so the assumption can be set from their books instead of from any
 * constant — mine included.
 */
export default async function OperatingCostSettingsPage() {
  const user = await requirePermissionPage("money:read")
  const canWrite = can(user.role, "settings:manage")

  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - WINDOW_DAYS)
  const range = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }

  const measured = await measuredOperatingCost(user.carrierId, range)

  return (
    <div>
      <PageHeader
        title="Cost per mile"
        subtitle="The assumption every margin and lane ranking is priced from — and what your own books say it should be."
      />
      <OperatingCostPanel
        canWrite={canWrite}
        view={{
          configuredCpmCents: measured.configuredCpmCents,
          allInCpmCents: measured.allInCpmCents,
          operatingCpmCents: measured.operatingCpmCents,
          varianceCents: measured.varianceCents,
          totalMiles: measured.totalMiles,
          hasDriverPay: measured.hasDriverPay,
          deadheadBlankLoads: measured.deadheadBlankLoads,
          rangeLabel: `the last ${WINDOW_DAYS} days`,
        }}
      />
    </div>
  )
}
