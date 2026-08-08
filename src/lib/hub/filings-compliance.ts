/**
 * The database half of filings.ts — reads the carrier's USDOT number and the
 * company items that record MCS-150 / UCR filings, then lets the pure module
 * decide what belongs on the wall. Split exactly like hvut.ts /
 * hvut-compliance.ts so the derivation stays testable without a database.
 */
import { query, queryOne } from "./db"
import type { ComplianceEntry } from "./compliance"
import { mcs150WallEntries, ucrWallEntries } from "./filings"

export async function filingsComplianceEntries(
  carrierId: string,
  now = new Date()
): Promise<ComplianceEntry[]> {
  const carrier = await queryOne<{ dot_number: string | null }>(
    `SELECT dot_number FROM hub.carriers WHERE id = $1`,
    [carrierId]
  )

  // Any status counts (open renders on its own via the manual-items loop;
  // done/waived means handled) — same step-aside contract as Form 2290.
  const mcsItems = await query<{ due_on: string | null }>(
    `SELECT due_on FROM hub.compliance_items
     WHERE carrier_id = $1 AND entity_type = 'company'
       AND (kind ILIKE '%mcs-150%' OR kind ILIKE '%mcs150%' OR kind ILIKE '%biennial%')`,
    [carrierId]
  )
  const ucrItems = await query<{ due_on: string | null }>(
    `SELECT due_on FROM hub.compliance_items
     WHERE carrier_id = $1 AND entity_type = 'company'
       AND (kind ILIKE '%ucr%' OR kind ILIKE '%unified carrier%')`,
    [carrierId]
  )

  return [
    ...mcs150WallEntries(carrier?.dot_number ?? null, mcsItems.map((i) => i.due_on), now),
    ...ucrWallEntries(ucrItems.map((i) => i.due_on), now),
  ]
}
