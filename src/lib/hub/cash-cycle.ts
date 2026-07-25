/**
 * The real cash cycle, measured (AGENT_TASKS Wave 1, Task 2 / TOP_10 #9).
 *
 * avgDaysToPay (vetting.ts) measures invoice issued → paid only, which
 * excludes the POD → invoice leg — the part the OFFICE controls. Migration
 * 022 stamped delivered_at / pod_received_at on hub.loads, so the whole
 * delivered → POD → invoice → paid chain is measurable per load. Medians are
 * the headline (cashCycleStats in money.ts); loads are excluded from any leg
 * they have not completed rather than counted as zero.
 *
 * Also surfaces the failure this screen exists to catch: loads sitting past
 * delivery with no invoice — and how many of those were already settled to
 * the driver, i.e. money out the door with nothing billed against it.
 */
import { query, queryOne } from "./db"
import { cashCycleStats, type CashCycleStats } from "./money"

export interface UnbilledSummary {
  count: number
  totalCents: number
  /** Of those, already paid to the driver — the worst combination. */
  settledCount: number
  settledCents: number
}

export interface CashCycleReport {
  stats: CashCycleStats
  /** Loads with a delivered_at inside the window (basis of the stats). */
  sampleSize: number
  windowDays: number
  unbilled: UnbilledSummary
}

interface CycleRow {
  delivered_at: string | null
  pod_received_at: string | null
  issued_on: string | null
  paid_on: string | null
}

export async function getCashCycle(carrierId: string, windowDays = 90): Promise<CashCycleReport> {
  // One row per delivered load in the window. The invoice join carries
  // carrier_id on both sides; the payment date only counts once the invoice
  // actually reached 'paid' (a partial payment doesn't end the cycle).
  const rows = await query<CycleRow>(
    `SELECT l.delivered_at, l.pod_received_at, i.issued_on,
       CASE WHEN i.status = 'paid' THEN
         (SELECT MAX(p.paid_on) FROM hub.payments p
           WHERE p.invoice_id = i.id AND p.carrier_id = i.carrier_id)
       END AS paid_on
     FROM hub.loads l
     LEFT JOIN hub.invoices i ON i.load_id = l.id AND i.carrier_id = l.carrier_id
     WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
       AND l.delivered_at IS NOT NULL
       AND l.delivered_at > NOW() - ($2 || ' days')::interval`,
    [carrierId, String(windowDays)]
  )

  const toDate = (v: string | null) => (v ? new Date(v) : null)
  const stats = cashCycleStats(
    rows.map((r) => ({
      deliveredAt: toDate(r.delivered_at),
      podReceivedAt: toDate(r.pod_received_at),
      invoiceIssuedOn: toDate(r.issued_on),
      paidOn: toDate(r.paid_on),
    }))
  )

  // Unbilled-past-delivery is NOT windowed — an old unbilled load is more
  // alarming, not less. Same total math as the Today screen's unbilled panel.
  const unbilled = await queryOne<{
    count: string
    total_cents: string
    settled_count: string
    settled_cents: string
  }>(
    `SELECT COUNT(*) AS count,
       COALESCE(SUM(t.total_cents), 0) AS total_cents,
       COUNT(*) FILTER (WHERE t.settlement_id IS NOT NULL) AS settled_count,
       COALESCE(SUM(t.total_cents) FILTER (WHERE t.settlement_id IS NOT NULL), 0) AS settled_cents
     FROM (
       SELECT l.settlement_id,
         (l.linehaul_cents + l.fuel_surcharge_cents +
          COALESCE((SELECT SUM((a->>'amount_cents')::bigint) FROM jsonb_array_elements(l.accessorials) a), 0))::bigint AS total_cents
       FROM hub.loads l
       WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
         AND l.status IN ('delivered', 'pod_received')
         AND NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id)
     ) t`,
    [carrierId]
  )

  return {
    stats,
    sampleSize: rows.length,
    windowDays,
    unbilled: {
      count: Number(unbilled?.count ?? 0),
      totalCents: Number(unbilled?.total_cents ?? 0),
      settledCount: Number(unbilled?.settled_count ?? 0),
      settledCents: Number(unbilled?.settled_cents ?? 0),
    },
  }
}
