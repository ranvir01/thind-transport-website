/**
 * The money a shift is worth.
 *
 * Two halves. The pure half checks that each seat gets the right figure with
 * the right words on it, and that a diff can never read negative — a payment
 * reversal or a voided invoice mid-shift must not tell the player they owe
 * the company money.
 *
 * The database half is the one that matters: it proves the driver's wage is
 * the wage the SETTLEMENT ENGINE would pay, computed here a third way — plain
 * arithmetic straight off the rule (58c per loaded mile for Jordan, 90% of
 * linehaul plus the fuel surcharge for Sam). If someone reimplements pay in
 * the shift reader, or the rule changes and the reader keeps quoting the old
 * one, these numbers stop agreeing and this fails. A seat that quotes a
 * driver a wage the software would not actually pay is worse than a seat
 * that says nothing.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { emptyMetrics, shiftMoney, type ShiftMetrics } from "../sandbox-objectives"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const C = "33333333-3333-3333-3333-333333333333"

const at = (iso: string, over: Partial<ShiftMetrics> = {}): ShiftMetrics => ({
  ...emptyMetrics(iso),
  ...over,
})

describe("shiftMoney — what the seat is worth", () => {
  const base = at("2026-08-14T09:00:00.000Z", {
    myFreightBookedCents: 500_00,
    myPayCents: 100_00,
    myInvoicedCents: 200_00,
    myCashMovedCents: 300_00,
    coDeliveredCents: 10_000_00,
    coBilledCents: 8_000_00,
    coCollectedCents: 5_000_00,
  })
  const cur = at("2026-08-14T10:00:00.000Z", {
    myFreightBookedCents: 900_00,
    myPayCents: 340_00,
    myInvoicedCents: 650_00,
    myCashMovedCents: 720_00,
    myReleasedTruckFreightCents: 4_100_00,
    myHiredDriverFreightCents: 2_600_00,
    coDeliveredCents: 12_500_00,
    coBilledCents: 9_100_00,
    coCollectedCents: 5_400_00,
  })

  it("gives every seat its own honest line", () => {
    expect(shiftMoney("dispatcher", base, cur)).toMatchObject({ personalCents: 400_00, personalLabel: "Freight you booked" })
    expect(shiftMoney("driver", base, cur)).toMatchObject({ personalCents: 240_00, personalLabel: "You earned" })
    expect(shiftMoney("accountant", base, cur)).toMatchObject({ personalCents: 450_00, personalLabel: "You billed" })
    expect(shiftMoney("owner", base, cur)).toMatchObject({ personalCents: 420_00, personalLabel: "Money you moved" })
    expect(shiftMoney("owner_operator", base, cur)).toMatchObject({ personalCents: 240_00, personalLabel: "Your take" })
  })

  it("reads safety and recruiter as standing totals, not shift diffs", () => {
    // Their work pays off on somebody else's wheels and on a longer clock than
    // one shift — diffing would show zero for an hour of real work.
    const safety = shiftMoney("safety", base, cur)
    expect(safety).toMatchObject({ personalCents: 4_100_00, standing: true })
    const recruiter = shiftMoney("recruiter", base, cur)
    expect(recruiter).toMatchObject({ personalCents: 2_600_00, standing: true })
    expect(shiftMoney("dispatcher", base, cur).standing).toBe(false)
  })

  it("carries the company's shift to every seat", () => {
    for (const seat of ["dispatcher", "driver", "safety", "recruiter", "owner"] as const) {
      expect(shiftMoney(seat, base, cur)).toMatchObject({
        deliveredCents: 2_500_00,
        billedCents: 1_100_00,
        collectedCents: 400_00,
      })
    }
  })

  it("reads freight on the road straight, never as a diff", () => {
    // The first minutes of any shift have honestly earned nothing — an
    // arrival is 12 minutes away, not 12 seconds. Rolling freight is the true
    // thing that is never zero, so it is read standing rather than diffed;
    // diffing it would show a LOSS every time a truck delivered.
    const rolling = at("2026-08-14T10:00:00.000Z", { coRollingCents: 48_000_00 })
    const startedHigher = at("2026-08-14T09:00:00.000Z", { coRollingCents: 60_000_00 })
    expect(shiftMoney("dispatcher", startedHigher, rolling).rollingCents).toBe(48_000_00)
    expect(shiftMoney("dispatcher", startedHigher, rolling).deliveredCents).toBe(0)
  })

  it("never tells a player they owe money", () => {
    // An invoice voided or a payment reversed while the shift runs makes the
    // cumulative counter go DOWN. Showing "-$1,200 billed" would read as a
    // punishment for having clocked in.
    const shrunk = at("2026-08-14T10:00:00.000Z", {
      myInvoicedCents: 50_00,
      coCollectedCents: 1_000_00,
    })
    const m = shiftMoney("accountant", base, shrunk)
    expect(m.personalCents).toBe(0)
    expect(m.collectedCents).toBe(0)
    expect(m.deliveredCents).toBe(0)
  })
})

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) console.warn("\n⚠️  sandbox-shift-money.test.ts DB half SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

suite("the driver's wage is the wage the software would pay", () => {
  let query: typeof import("../db").query
  let readShiftMetrics: typeof import("../sandbox-shift").readShiftMetrics
  let lock: PoolClient | null = null

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ readShiftMetrics } = await import("../sandbox-shift"))
    await (await import("../sandbox-seed")).seedSandbox()
  }, 180_000)

  afterAll(async () => {
    await unlockSandboxTenant(lock)
  }, 60_000)

  /** Mark one of the driver's loads delivered so there is a wage to check. */
  async function deliverOneLoadFor(email: string): Promise<string> {
    const [{ id: userId }] = await query<{ id: string }>(
      `SELECT id FROM hub.users WHERE carrier_id = $1 AND email = $2`,
      [C, email]
    )
    const [load] = await query<{ id: string }>(
      `SELECT l.id FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE l.carrier_id = $1 AND d.user_id = $2 AND l.deleted_at IS NULL
        ORDER BY l.reference LIMIT 1`,
      [C, userId]
    )
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'status_change', $3, 'test', '{"to":"delivered"}'::jsonb)`,
      [C, load.id, userId]
    )
    return userId
  }

  it("pays Jordan 58c for every loaded mile he has run", async () => {
    const userId = await deliverOneLoadFor("sandbox.driver@demo.thind")
    const metrics = await readShiftMetrics(userId, "driver")

    // The third opinion: the rule says 58c/loaded mile, loaded only. Compute
    // it straight, with no engine and no reader involved.
    const [{ cents }] = await query<{ cents: string }>(
      `SELECT COALESCE(SUM(l.loaded_miles), 0)::bigint * 58 AS cents
         FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE l.carrier_id = $1 AND d.user_id = $2 AND l.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM hub.load_events e
                       WHERE e.carrier_id = $1 AND e.load_id = l.id
                         AND e.kind = 'status_change' AND e.payload->>'to' = 'delivered')`,
      [C, userId]
    )
    expect(Number(cents)).toBeGreaterThan(0)
    expect(metrics.myPayCents).toBe(Number(cents))
  }, 60_000)

  it("pays Sam 90% of linehaul plus his fuel surcharge", async () => {
    const userId = await deliverOneLoadFor("sandbox.oo@demo.thind")
    const metrics = await readShiftMetrics(userId, "owner_operator")

    // `percent_linehaul` bases on linehaul PLUS accessorials (pay-rules.ts:140),
    // so his detention is 90% his too — the first draft of this check missed
    // that and accused the engine of overpaying him by $54. The engine was
    // right; a percentage owner-operator really does share the detention.
    const [{ cents }] = await query<{ cents: string }>(
      `SELECT COALESCE(SUM(
                ROUND((l.linehaul_cents + COALESCE((SELECT SUM((a->>'amountCents')::int)
                         FROM jsonb_array_elements(l.accessorials) a), 0)) * 0.90)
                + l.fuel_surcharge_cents), 0)::bigint AS cents
         FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE l.carrier_id = $1 AND d.user_id = $2 AND l.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM hub.load_events e
                       WHERE e.carrier_id = $1 AND e.load_id = l.id
                         AND e.kind = 'status_change' AND e.payload->>'to' = 'delivered')`,
      [C, userId]
    )
    expect(Number(cents)).toBeGreaterThan(0)
    expect(metrics.myPayCents).toBe(Number(cents))
  }, 60_000)

  it("shows every seat the company's money", async () => {
    const [{ id: owner }] = await query<{ id: string }>(
      `SELECT id FROM hub.users WHERE carrier_id = $1 AND email = 'sandbox.owner@demo.thind'`,
      [C]
    )
    const metrics = await readShiftMetrics(owner, "owner")
    expect(metrics.coBilledCents).toBeGreaterThan(0)
    expect(metrics.coCollectedCents).toBeGreaterThan(0)
    expect(metrics.coDeliveredCents).toBeGreaterThan(0)
  }, 60_000)
})
