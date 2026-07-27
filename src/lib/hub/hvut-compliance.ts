/**
 * Form 2290 on the compliance wall.
 *
 * Every other item on that wall hangs off a date stored against a driver,
 * truck, or trailer. HVUT does not: it is an annual, fleet-wide, calendar-
 * driven obligation that nobody enters anywhere, which is exactly why it gets
 * missed until a plate renewal is refused for want of a stamped Schedule 1.
 *
 * So it is derived. The tax period opens July 1 and the return is due August
 * 31; if the carrier has already tracked it themselves — an open, done, or
 * waived company item mentioning 2290 — this steps aside rather than showing
 * the same obligation twice.
 *
 * Split from hvut.ts deliberately: that module stays pure and I/O-free so the
 * same arithmetic can run in a browser, a test, or a future public calculator.
 * This is the thin part that talks to the database.
 */
import { query } from "./db"
import type { ComplianceEntry } from "./compliance"
import { fleetHvut, form2290DueDate } from "./hvut"

/** The July-June tax period that the given date falls in, by its opening year. */
export function taxPeriodYear(now: Date): number {
  // getUTCMonth is 0-indexed: 6 is July.
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

/**
 * The pure half, so the wall's behaviour is testable without a database —
 * same split as iftaFilingWallEntries.
 */
export function form2290WallEntries(
  trucks: { unitNumber: string }[],
  alreadyTracked: boolean,
  now: Date
): ComplianceEntry[] {
  if (alreadyTracked || trucks.length === 0) return []

  const periodYear = taxPeriodYear(now)
  const dueOn = form2290DueDate(7, periodYear)
  const { totalCents } = fleetHvut(trucks, { firstUsedMonth: 7 })

  const dueDate = new Date(`${dueOn}T00:00:00Z`)
  const daysOut = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000)
  const color: ComplianceEntry["color"] = daysOut < 0 ? "red" : daysOut <= 45 ? "amber" : "green"

  const dollars = (totalCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return [
    {
      entity: "company",
      entityId: null,
      name: "Company",
      kind:
        `Form 2290 HVUT — ${trucks.length} truck${trucks.length === 1 ? "" : "s"}, ` +
        `about $${dollars} for ${periodYear}-${String(periodYear + 1).slice(2)}`,
      due: dueOn,
      color,
      href: "/hub/compliance",
    },
  ]
}

export async function form2290ComplianceEntries(
  carrierId: string,
  now = new Date()
): Promise<ComplianceEntry[]> {
  const periodYear = taxPeriodYear(now)

  // Has the carrier already got this on the wall themselves? Any status counts
  // — an open manual item is displayed on its own, and done/waived means
  // handled. Scoped to this tax period so last year's filing doesn't hide
  // this year's obligation.
  const tracked = await query<{ id: string }>(
    `SELECT id FROM hub.compliance_items
     WHERE carrier_id = $1 AND entity_type = 'company' AND kind ILIKE '%2290%'
       AND (due_on IS NULL OR due_on >= $2::date)
     LIMIT 1`,
    [carrierId, `${periodYear}-07-01`]
  )

  const trucks = await query<{ unit_number: string }>(
    `SELECT unit_number FROM hub.trucks
     WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'
     ORDER BY unit_number`,
    [carrierId]
  )

  return form2290WallEntries(
    trucks.map((t) => ({ unitNumber: t.unit_number })),
    tracked.length > 0,
    now
  )
}
