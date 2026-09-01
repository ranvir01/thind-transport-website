import "server-only"
import { query } from "./db"
import { SANDBOX_CARRIER_ID } from "./sandbox"

/**
 * Invariants the simulated world must satisfy after every tick.
 *
 * A simulation that runs for hours without anyone watching is exactly the
 * place a slow corruption hides: a truck double-booked, a player's load
 * quietly finished by the autopilot, money going negative. Deterministic
 * simulation testing gets its value from asserting properties continuously,
 * not from the world merely continuing to move — so the tick checks itself.
 *
 * These are cheap aggregate queries, all carrier-scoped to the sandbox, run
 * once per tick that actually did something. A violation is logged with the
 * offending ids and returned on the tick result; it never throws, because
 * halting the demo world is worse for the person playing it than a logged
 * inconsistency — but it is visible, and the e2e smoke fails on it.
 */

const C = SANDBOX_CARRIER_ID

export interface InvariantViolation {
  rule: string
  detail: string
}

export async function checkSandboxInvariants(): Promise<InvariantViolation[]> {
  const violations: InvariantViolation[] = []

  const [doubleBooked, playerFinished, negativeBalance, orphanRolling, deadEnded] = await Promise.all([
    // A truck can only pull one load at a time.
    query<{ truck_id: string; n: number }>(
      `SELECT truck_id, COUNT(*)::int AS n
         FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL AND truck_id IS NOT NULL
          AND status IN ('dispatched','at_pickup','in_transit')
        GROUP BY truck_id HAVING COUNT(*) > 1`,
      [C]
    ),
    // The sim must never complete a human's load. The autopilot signs its
    // work, so a player-driven load carrying an autopilot delivery is proof
    // the ownership clamp broke.
    query<{ id: string; reference: string }>(
      `SELECT DISTINCT l.id, l.reference
         FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
         JOIN hub.load_events e ON e.load_id = l.id AND e.carrier_id = $1
        WHERE l.carrier_id = $1 AND d.user_id IS NOT NULL
          AND e.kind = 'status_change'
          AND e.payload->>'to' IN ('delivered','pod_received')
          AND e.actor_name = 'Blue Ridge autopilot'`,
      [C]
    ),
    // Payments must never exceed what was invoiced.
    query<{ id: string; number: string; over: number }>(
      `SELECT i.id, i.number,
              (COALESCE(SUM(p.amount_cents), 0) - i.amount_cents)::int AS over
         FROM hub.invoices i
         LEFT JOIN hub.payments p ON p.invoice_id = i.id AND p.carrier_id = $1
        WHERE i.carrier_id = $1
        GROUP BY i.id, i.number, i.amount_cents
       HAVING COALESCE(SUM(p.amount_cents), 0) > i.amount_cents`,
      [C]
    ),
    // Anything rolling needs a driver and a truck, or the map lies.
    query<{ id: string; reference: string }>(
      `SELECT id, reference FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'in_transit'
          AND (driver_id IS NULL OR truck_id IS NULL)`,
      [C]
    ),
    // Nothing the simulation does to a player may leave them stuck.
    //
    // The sim can now cause trouble — a receiver holding a truck, and more to
    // come. "Recoverable" is the promise that makes it safe to hand this to a
    // stranger: every problem has a way out that the player can reach from the
    // screen they are on. A held load must still have the crew that lets
    // someone mark it departed (which is also what bills the detention), and
    // an active load must never sit without a driver AND without being on the
    // board to assign one. This is the rule that keeps "recoverable" honest in
    // code instead of in a comment.
    query<{ id: string; reference: string; status: string }>(
      `SELECT id, reference, status FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL
          AND status IN ('dispatched','at_pickup','in_transit')
          AND (driver_id IS NULL OR truck_id IS NULL)`,
      [C]
    ),
  ])

  if (doubleBooked.length > 0) {
    violations.push({
      rule: "one-load-per-truck",
      detail: doubleBooked.map((r) => `truck ${r.truck_id} on ${r.n} active loads`).join("; "),
    })
  }
  if (playerFinished.length > 0) {
    violations.push({
      rule: "player-load-never-auto-completed",
      detail: playerFinished.map((r) => r.reference).join(", "),
    })
  }
  if (negativeBalance.length > 0) {
    violations.push({
      rule: "no-overpaid-invoice",
      detail: negativeBalance.map((r) => `${r.number} over by ${r.over}c`).join("; "),
    })
  }
  if (deadEnded.length > 0) {
    violations.push({
      rule: "no-dead-ended-load",
      detail: deadEnded.map((r) => `${r.reference} (${r.status}) has no crew to act with`).join(", "),
    })
  }
  if (orphanRolling.length > 0) {
    violations.push({
      rule: "rolling-load-has-crew",
      detail: orphanRolling.map((r) => r.reference).join(", "),
    })
  }

  return violations
}
