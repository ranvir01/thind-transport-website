import "server-only"
import { query } from "./db"
import { SANDBOX_CARRIER_ID } from "./sandbox"
import type { ShiftMetrics } from "./sandbox-objectives"

/**
 * Shift Mode's metric readers: a handful of cheap carrier-scoped counts,
 * snapshot at clock-in (baseline) and again on demand (live objectives,
 * clock-out recap). Player attribution rides the audit trails the domain
 * functions already write — load_events.actor_id for status moves,
 * audit_log.actor_id for invoices — so NPC activity never pads a score.
 */

const C = SANDBOX_CARRIER_ID

/**
 * Bump a shift telemetry counter (review A2) — the weekly audit reads
 * settings.sim.telemetry to see whether demo users actually play. The seat
 * key is validated by callers (isShiftSeat) and scrubbed here anyway; the
 * inner jsonb_set materializes the telemetry object so the bump works on a
 * freshly-seeded world that has never ticked.
 */
export async function bumpShiftCounter(kind: "shiftsStarted" | "shiftsCompleted", seat: string): Promise<void> {
  const key = `${kind}_${seat}`.replace(/[^a-zA-Z_]/g, "")
  await query(
    `UPDATE hub.carrier_settings
        SET settings = jsonb_set(
              jsonb_set(settings, '{sim,telemetry}', COALESCE(settings->'sim'->'telemetry', '{}'::jsonb), true),
              '{sim,telemetry,${key}}',
              to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'${key}')::int, 0) + 1), true)
      WHERE carrier_id = $1 AND settings ? 'sim'`,
    [C]
  )
}

/** Current sim epoch — a reset mints a new one, voiding in-flight shifts. */
export async function readSimEpoch(): Promise<string | null> {
  const rows = await query<{ epoch: string | null }>(
    `SELECT settings->'sim'->>'epoch' AS epoch FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  return rows[0]?.epoch ?? null
}

export async function readShiftMetrics(userId: string, now = new Date()): Promise<ShiftMetrics> {
  const [moves, boards, arrivals, invoices, payments] = await Promise.all([
    query<{ to_status: string | null; n: number }>(
      `SELECT payload->>'to' AS to_status, COUNT(*)::int AS n
         FROM hub.load_events
        WHERE carrier_id = $1 AND kind = 'status_change' AND actor_id = $2
        GROUP BY 1`,
      [C, userId]
    ),
    query<{ quoted: number; unbilled: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'quoted')::int AS quoted,
              COUNT(*) FILTER (WHERE status = 'pod_received')::int AS unbilled
         FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL`,
      [C]
    ),
    query<{ arrivals: number; on_time: number }>(
      `SELECT COUNT(*)::int AS arrivals,
              COUNT(*) FILTER (WHERE s.appt_start IS NULL
                OR s.arrived_at <= s.appt_start + interval '30 minutes')::int AS on_time
         FROM hub.stops s
         JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = $1
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE s.carrier_id = $1 AND s.type = 'delivery' AND s.arrived_at IS NOT NULL
          AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number; cents: string }>(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(i.amount_cents), 0)::bigint AS cents
         FROM hub.audit_log a
         JOIN hub.invoices i ON i.carrier_id = $1 AND i.id::text = a.entity_id
        WHERE a.carrier_id = $1 AND a.entity_type = 'invoice' AND a.action = 'create'
          AND a.actor_id = $2`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.payments WHERE carrier_id = $1`,
      [C]
    ),
  ])

  const byStatus = new Map(moves.map((m) => [m.to_status ?? "", m.n]))
  const totalMoves = moves.reduce((s, m) => s + m.n, 0)
  return {
    at: now.toISOString(),
    myBookings: byStatus.get("booked") ?? 0,
    myDispatches: byStatus.get("dispatched") ?? 0,
    quotedCount: boards[0]?.quoted ?? 0,
    myStatusMoves: totalMoves,
    myPodsSubmitted: byStatus.get("pod_received") ?? 0,
    myArrivals: arrivals[0]?.arrivals ?? 0,
    myOnTimeArrivals: arrivals[0]?.on_time ?? 0,
    myInvoices: invoices[0]?.n ?? 0,
    myInvoicedCents: Number(invoices[0]?.cents ?? 0),
    paymentsRecorded: payments[0]?.n ?? 0,
    unbilledCount: boards[0]?.unbilled ?? 0,
  }
}
