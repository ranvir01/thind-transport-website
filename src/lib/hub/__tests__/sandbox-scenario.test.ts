/**
 * Which world is loaded, and whether the app can say so.
 *
 * "Crunch day" deliberately breaks the morning: pickups four hours late, a
 * truck dead at inspection, invoices past terms. A player who does not know
 * they are in it reads the wreckage as the software being broken — which is
 * the exact opposite of what the scenario is for. So the name has to survive
 * the seed that writes it and be readable afterwards.
 *
 * The trap this guards: seedSandbox REPLACES the whole settings blob, and
 * applySandboxScenario calls it first. Stamp the scenario before that call and
 * it is silently thrown away, leaving every crunch day labelled "Steady week".
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) console.warn("\n⚠️  sandbox-scenario.test.ts SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("the loaded scenario has a name the app can read", () => {
  let query: typeof import("../db").query
  let readSimScenario: typeof import("../sandbox-shift").readSimScenario
  let applySandboxScenario: typeof import("../sandbox-seed").applySandboxScenario
  let tickSandboxSim: typeof import("../sandbox-sim").tickSandboxSim
  let lock: PoolClient | null = null

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ readSimScenario } = await import("../sandbox-shift"))
    ;({ applySandboxScenario } = await import("../sandbox-seed"))
    ;({ tickSandboxSim } = await import("../sandbox-sim"))
  }, 60_000)

  /**
   * The overlay's own two loads — it leaves a "driver no-show" note on each —
   * that are STILL booked, unassigned, un-arrived and hours past their
   * appointment. Keyed on the note rather than on a raw count: the steady seed
   * books a couple of loads for "this morning", so by the afternoon a bare
   * count of late unassigned pickups picks those up too and the test would
   * pass or fail by the clock on the wall.
   */
  const latePickups = async () =>
    (
      await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n
           FROM hub.loads l
           JOIN hub.stops s ON s.load_id = l.id AND s.carrier_id = l.carrier_id AND s.type = 'pickup'
          WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
            AND EXISTS (SELECT 1 FROM hub.load_events e
                         WHERE e.carrier_id = $1 AND e.load_id = l.id AND e.kind = 'note'
                           AND e.payload->>'text' LIKE 'Driver no-show%')
            AND l.status = 'booked' AND l.driver_id IS NULL
            AND s.arrived_at IS NULL AND s.appt_start < NOW() - interval '3 hours'`,
        [C]
      )
    )[0].n

  it("keeps crunch day's late pickups late through the autopilot's first tick", async () => {
    // The overlay used to leave the two late loads 'dispatched' with a driver.
    // The first tick converged them — stamped an arrival AT the appointment
    // and rolled them — so the lateness the scenario promised was gone before
    // the dispatcher's page loaded. The drill only exists if it survives.
    await applySandboxScenario("crunch")
    expect(await latePickups()).toBe(2)
    const tick = await tickSandboxSim(null, new Date())
    expect(tick.reason).not.toBe("unseeded")
    expect(await latePickups()).toBe(2)
    // And the steady week has none — the lateness is the scenario's, not the seed's.
    await applySandboxScenario("steady")
    expect(await latePickups()).toBe(0)
  }, 300_000)

  afterAll(async () => {
    // Leave the shared sandbox in the state every other suite expects.
    await applySandboxScenario("steady")
    await unlockSandboxTenant(lock)
  }, 240_000)

  it("stamps crunch day, and survives the seed that runs first", async () => {
    await applySandboxScenario("crunch")
    expect(await readSimScenario()).toBe("crunch")
  }, 240_000)

  it("goes back to the steady week when the steady week is loaded", async () => {
    await applySandboxScenario("steady")
    expect(await readSimScenario()).toBe("steady")
  }, 240_000)

  it("reads a sandbox seeded before the key existed as the steady week", async () => {
    // A bare seed IS the steady week, so the absent key has a true answer.
    // Returning null and rendering nothing would teach a player less.
    await query(
      `UPDATE hub.carrier_settings SET settings = settings #- '{sim,scenario}' WHERE carrier_id = $1`,
      [C]
    )
    expect(await readSimScenario()).toBe("steady")
  }, 60_000)

  it("never invents a third world out of junk in the column", async () => {
    await query(
      `UPDATE hub.carrier_settings
          SET settings = jsonb_set(settings, '{sim,scenario}', '"chaos"'::jsonb, TRUE)
        WHERE carrier_id = $1`,
      [C]
    )
    expect(await readSimScenario()).toBe("steady")
  }, 60_000)
})
