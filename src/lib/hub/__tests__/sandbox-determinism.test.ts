/**
 * "Reset now rebuilds the identical company every time."
 *
 * OWNER-TEST-DRIVE.md makes that promise to the owner in as many words, and
 * then makes a bigger one on top of it: "hit Reset and do the same steps
 * again — it will happen the same way, which means I can reproduce it from
 * your description instead of guessing." Every bug report from a test drive
 * depends on it being true.
 *
 * It was NOT true for most of this sandbox's life. The generator's PRNG was
 * seeded once at module load, so the second seed in a process drew from wherever
 * the first one left off — the "deterministic seeding" comment above it had
 * been false since it was written. The fix was a resetRandom() at the top of
 * seedSandbox(); this is the test that would have caught the original.
 *
 * Deliberately fingerprints only what a person could NOTICE and describe: the
 * loads, their money, the drivers and their pay, the trucks, the invoices.
 * Generated uuids and NOW()-derived timestamps are excluded because they are
 * expected to differ and are not what "the identical company" means.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) console.warn("\n⚠️  sandbox-determinism.test.ts SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("a reset rebuilds the identical company", () => {
  let query: typeof import("../db").query
  let seedSandbox: typeof import("../sandbox-seed").seedSandbox
  let lock: PoolClient | null = null

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ seedSandbox } = await import("../sandbox-seed"))
  }, 60_000)

  afterAll(async () => {
    await unlockSandboxTenant(lock)
  }, 60_000)

  /** What a person could see and describe back to me. */
  async function fingerprint() {
    const [loads, drivers, trucks, invoices] = await Promise.all([
      query(
        `SELECT reference, status, commodity, equipment, linehaul_cents, fuel_surcharge_cents,
                loaded_miles, deadhead_miles, accessorials::text AS accessorials
           FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL ORDER BY reference`,
        [C]
      ),
      query(
        `SELECT first_name, last_name, pay_type, pay_rate FROM hub.drivers
          WHERE carrier_id = $1 AND deleted_at IS NULL ORDER BY first_name, last_name`,
        [C]
      ),
      query(
        `SELECT unit_number, status FROM hub.trucks WHERE carrier_id = $1 ORDER BY unit_number`,
        [C]
      ),
      query(
        `SELECT number, status, amount_cents FROM hub.invoices WHERE carrier_id = $1 ORDER BY number`,
        [C]
      ),
    ])
    return { loads, drivers, trucks, invoices }
  }

  it("draws the same world on the second and third reset, not just the first", async () => {
    // Three seeds, not two. The original defect was a module-level PRNG that
    // was never re-seeded, so run N+1 continued the stream from run N — a
    // two-seed test comparing runs 2 and 3 could still pass by coincidence of
    // where the stream happened to be. Comparing 1≡2 and 2≡3 pins the stream
    // to its starting point every time.
    await seedSandbox()
    const first = await fingerprint()
    await seedSandbox()
    const second = await fingerprint()
    await seedSandbox()
    const third = await fingerprint()

    // Guard against a vacuous pass on an empty sandbox.
    expect(first.loads.length).toBeGreaterThan(100)
    expect(first.drivers.length).toBeGreaterThan(5)

    expect(second).toEqual(first)
    expect(third).toEqual(second)
  }, 300_000)

  it("keeps the money identical, load for load", async () => {
    // The narrower claim the owner is most likely to test by eye: same loads,
    // same rates. Asserted separately so a failure says WHICH promise broke.
    const money = () =>
      query<{ reference: string; cents: number }>(
        `SELECT reference, linehaul_cents + fuel_surcharge_cents AS cents
           FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL ORDER BY reference`,
        [C]
      )
    await seedSandbox()
    const before = await money()
    await seedSandbox()
    const after = await money()
    expect(before.length).toBeGreaterThan(100)
    expect(after).toEqual(before)
  }, 300_000)
})
