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
  let lock: PoolClient | null = null

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ readSimScenario } = await import("../sandbox-shift"))
    ;({ applySandboxScenario } = await import("../sandbox-seed"))
  }, 60_000)

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
