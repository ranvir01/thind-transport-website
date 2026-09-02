/**
 * What the driver's phone is allowed to know.
 *
 * Two separate promises, and the second is the one that rots quietly:
 *
 *  1. The wage on the load card is the wage the SETTLEMENT ENGINE would pay.
 *     It is checked here a third way — plain arithmetic off the rule itself
 *     (58c per loaded mile for Jordan; 90% of linehaul PLUS accessorials, plus
 *     the fuel surcharge, for Sam) — so a reimplementation in the driver app
 *     breaks the build rather than quietly quoting a number payroll disagrees
 *     with.
 *
 *  2. The driver's page payload carries no margin. driver-app.ts has always
 *     CLAIMED this ("enforced here at the query layer, not in the UI") while
 *     doing `SELECT l.*` and handing the whole row to a client component. A
 *     comment cannot enforce anything; this test can.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) console.warn("\n⚠️  driver-payday.test.ts SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("the driver app tells the truth about money", () => {
  let query: typeof import("../db").query
  let driverActiveLoads: typeof import("../driver-app").driverActiveLoads
  let driverRunPay: typeof import("../driver-app").driverRunPay
  let driverUnsettledPay: typeof import("../driver-app").driverUnsettledPay
  let lock: PoolClient | null = null

  /** driver row + user id for a sandbox seat driver. */
  async function seat(email: string) {
    const [row] = await query<{ user_id: string; driver_id: string }>(
      `SELECT u.id AS user_id, d.id AS driver_id
         FROM hub.users u JOIN hub.drivers d ON d.user_id = u.id AND d.carrier_id = $1
        WHERE u.carrier_id = $1 AND u.email = $2`,
      [C, email]
    )
    return row
  }

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ driverActiveLoads, driverRunPay, driverUnsettledPay } = await import("../driver-app"))
    await (await import("../sandbox-seed")).seedSandbox()
  }, 180_000)

  afterAll(async () => {
    await unlockSandboxTenant(lock)
  }, 60_000)

  it("never ships the linehaul to the phone", async () => {
    // The whole point: this object is serialised into the page payload of a
    // client component. Anything on it, the driver has.
    const { driver_id } = await seat("sandbox.driver@demo.thind")
    const loads = await driverActiveLoads(C, driver_id)
    expect(loads.length).toBeGreaterThan(0)
    for (const load of loads) {
      const keys = Object.keys(load)
      expect(keys).not.toContain("linehaul_cents")
      expect(keys).not.toContain("fuel_surcharge_cents")
      expect(keys).not.toContain("accessorials")
    }
  }, 60_000)

  it("still gives the card everything it renders", async () => {
    // Narrowing a SELECT is only safe if it kept what the UI reads. If this
    // fails, the leak fix took a field the card needs with it.
    const { driver_id } = await seat("sandbox.driver@demo.thind")
    const [load] = await driverActiveLoads(C, driver_id)
    for (const field of ["id", "reference", "status", "equipment", "commodity", "notes", "acknowledged_at"]) {
      expect(load).toHaveProperty(field)
    }
    expect(Array.isArray(load.stops)).toBe(true)
  }, 60_000)

  it("pays Jordan 58c a loaded mile, and says so", async () => {
    const { user_id: _u, driver_id } = await seat("sandbox.driver@demo.thind")
    const loads = await driverActiveLoads(C, driver_id)
    const pay = await driverRunPay(C, driver_id, loads.map((l) => l.id))
    expect(pay.size).toBeGreaterThan(0)

    for (const load of loads) {
      const got = pay.get(load.id)
      if (!got) continue
      const [{ cents }] = await query<{ cents: string }>(
        `SELECT (COALESCE(loaded_miles, 0) * 58)::bigint AS cents
           FROM hub.loads WHERE carrier_id = $1 AND id = $2`,
        [C, load.id]
      )
      expect(got.cents).toBe(Number(cents))
      // The engine's own words — the driver can check the arithmetic.
      expect(got.label).toMatch(/mi × \$0\.58\/mi/)
    }
  }, 60_000)

  it("pays Sam 90% of linehaul plus accessorials, plus his fuel surcharge", async () => {
    const { driver_id } = await seat("sandbox.oo@demo.thind")
    const loads = await driverActiveLoads(C, driver_id)
    const pay = await driverRunPay(C, driver_id, loads.map((l) => l.id))
    expect(pay.size).toBeGreaterThan(0)

    for (const load of loads) {
      const got = pay.get(load.id)
      if (!got) continue
      const [{ cents }] = await query<{ cents: string }>(
        `SELECT (ROUND((linehaul_cents + COALESCE((SELECT SUM((a->>'amount_cents')::int)
                    FROM jsonb_array_elements(accessorials) a), 0)) * 0.90)
                 + fuel_surcharge_cents)::bigint AS cents
           FROM hub.loads WHERE carrier_id = $1 AND id = $2`,
        [C, load.id]
      )
      expect(got.cents).toBe(Number(cents))
    }
  }, 60_000)

  it("never captions a total with arithmetic that does not produce it", async () => {
    // Sam is paid 90% of linehaul PLUS a fuel-surcharge passthrough — two
    // earning lines. Captioning the gross with the FIRST line's label read
    // "$513.70 · 90% of $503.00", and 90% of $503 is $452.70. A driver checks
    // that sort of thing. With more than one earning line the caption has to
    // describe the whole formula, not one term of it.
    const { driver_id } = await seat("sandbox.oo@demo.thind")
    const loads = await driverActiveLoads(C, driver_id)
    const pay = await driverRunPay(C, driver_id, loads.map((l) => l.id))
    for (const got of pay.values()) {
      const claimed = got.label.match(/^(\d+)% of \$([\d,]+(?:\.\d\d)?)$/)
      if (!claimed) continue // a formula summary, which asserts no single sum
      const pctOf = Math.round(Number(claimed[2].replace(/,/g, "")) * 100 * (Number(claimed[1]) / 100))
      expect(got.cents).toBe(pctOf)
    }
  }, 60_000)

  it("counts every delivered load payroll has not picked up yet", async () => {
    // The rule is `settlement_id IS NULL` and nothing else. The first draft
    // ALSO required delivered_at to be past the last settlement's period_end,
    // which sounds like "since your last settlement" and behaves like a way to
    // hide money: the sandbox seeds Jordan a settlement whose period ends in
    // the FUTURE, so every real unpaid load of his fell outside the window and
    // his phone showed nothing at all.
    const { driver_id } = await seat("sandbox.driver@demo.thind")
    const unsettled = await driverUnsettledPay(C, driver_id)

    // Third opinion, straight off the schema: he has delivered work nobody has
    // PAID him for — no settlement, or one still in draft. If this is zero the
    // assertion below is vacuous.
    const [{ n }] = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.loads l
         LEFT JOIN hub.settlements s ON s.id = l.settlement_id AND s.carrier_id = l.carrier_id
        WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
          AND (l.settlement_id IS NULL OR s.status = 'draft')
          AND l.status IN ('delivered','pod_received','invoiced','paid')`,
      [C, driver_id]
    )
    expect(n).toBeGreaterThan(0)
    expect(unsettled).toBeGreaterThan(0)

    // And it must stay that way no matter where the last settlement's period
    // lands. Push it a year out — the money he is owed does not move.
    await query(
      `UPDATE hub.settlements SET period_end = period_end + INTERVAL '1 year'
        WHERE carrier_id = $1 AND driver_id = $2`,
      [C, driver_id]
    )
    try {
      expect(await driverUnsettledPay(C, driver_id)).toBe(unsettled)
    } finally {
      await query(
        `UPDATE hub.settlements SET period_end = period_end - INTERVAL '1 year'
          WHERE carrier_id = $1 AND driver_id = $2`,
        [C, driver_id]
      )
    }
  }, 60_000)

  it("says nothing rather than guessing when a driver has no pay rule", async () => {
    // Every seeded driver has a rule, so deactivate one for the length of the
    // test rather than writing an assertion that can only ever pass vacuously.
    const { driver_id } = await seat("sandbox.driver@demo.thind")
    const loads = await driverActiveLoads(C, driver_id)
    const loadIds = loads.map((l) => l.id)
    expect((await driverRunPay(C, driver_id, loadIds)).size).toBeGreaterThan(0)

    await query(`UPDATE hub.pay_rules SET active = FALSE WHERE carrier_id = $1 AND driver_id = $2`, [C, driver_id])
    try {
      // An invented wage is worse than an honest blank.
      expect((await driverRunPay(C, driver_id, loadIds)).size).toBe(0)
    } finally {
      await query(`UPDATE hub.pay_rules SET active = TRUE WHERE carrier_id = $1 AND driver_id = $2`, [C, driver_id])
    }
    expect((await driverRunPay(C, driver_id, loadIds)).size).toBeGreaterThan(0)
  }, 60_000)
})

suite("the carrier's switch actually reaches the driver's phone", () => {
  let query: typeof import("../db").query
  let getCarrierSettings: typeof import("../settings").getCarrierSettings
  let lock: PoolClient | null = null

  /**
   * The exact upsert setDriverRunPayAction runs. Written out rather than
   * calling the action because the action needs a session; the SQL is the part
   * that can silently do nothing — jsonb_set returns its target UNCHANGED when
   * a parent key is missing, so a carrier who has never touched this setting
   * is precisely the case where a naive write is a no-op and the toggle springs
   * back on the next page load.
   */
  const write = (show: boolean) =>
    query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, jsonb_build_object('driverApp', jsonb_build_object('showRunPay', $2::boolean)))
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = jsonb_set(
           jsonb_set(hub.carrier_settings.settings, '{driverApp}',
             COALESCE(hub.carrier_settings.settings->'driverApp', '{}'::jsonb), TRUE),
           '{driverApp,showRunPay}', to_jsonb($2::boolean), TRUE),
         updated_at = NOW()`,
      [C, show]
    )

  const clear = () =>
    query(
      `UPDATE hub.carrier_settings SET settings = settings #- '{driverApp}' WHERE carrier_id = $1`,
      [C]
    )

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ getCarrierSettings } = await import("../settings"))
  }, 60_000)

  afterAll(async () => {
    await clear()
    await unlockSandboxTenant(lock)
  }, 60_000)

  it("defaults to showing pay when the carrier has never set it", async () => {
    await clear()
    expect((await getCarrierSettings(C)).driverApp.showRunPay).toBe(true)
  }, 60_000)

  it("turns off, and stays off across a re-read", async () => {
    await clear()
    await write(false)
    expect((await getCarrierSettings(C)).driverApp.showRunPay).toBe(false)
    // `showRunPay !== false` is the page's gate, so a stored `false` must
    // survive the merge against DEFAULT_SETTINGS rather than being overwritten
    // by the default it is meant to override.
    expect((await getCarrierSettings(C)).driverApp.showRunPay).toBe(false)
  }, 60_000)

  it("turns back on without wiping the carrier's other settings", async () => {
    await write(false)
    const before = await getCarrierSettings(C)
    await write(true)
    const after = await getCarrierSettings(C)
    expect(after.driverApp.showRunPay).toBe(true)
    // The upsert seeds a parent key; a botched one replaces the whole settings
    // blob and silently resets detention, factoring and branding with it.
    expect(after.detention).toEqual(before.detention)
    expect(after.factoring).toEqual(before.factoring)
    expect(after.branding).toEqual(before.branding)
  }, 60_000)
})
