/**
 * The sim's state-commit invariant, proven against a real Postgres:
 * a tick must never clobber writes made by the OTHER two writers of
 * `carrier_settings.settings->'sim'`.
 *
 * This is the concurrency the design deliberately does NOT serialize:
 * `touchPresence` (every tick POST, before the freshness gate) and
 * `bumpShiftCounter` (clock in / end shift) are single-statement autocommit
 * updates that never take the seed's advisory lock — so they land freely
 * during the multi-second window a catch-up tick spends applying ops. An
 * earlier revision committed the whole '{sim}' subtree from the snapshot it
 * read at the top of the tick, silently erasing both. The fix is disjoint
 * write sets (per-key jsonb_set + SQL-side counter increments); this suite
 * is what keeps it that way.
 *
 * Runs when POSTGRES_URL is available (reads .env.local like the scripts
 * do); skips cleanly otherwise so CI without a database stays green.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import type { PoolClient } from "pg"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadEnvLocal()

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) {
  console.warn(
    "\n⚠️  sandbox-sim-concurrency.test.ts SKIPPED — no POSTGRES_URL.\n" +
      "   This is the proof that a tick cannot erase presence or telemetry.\n"
  )
}
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("sim state commit keeps disjoint write sets", () => {
  let query: typeof import("../db").query
  let hubDb: typeof import("../db").hubDb
  let bumpShiftCounter: typeof import("../sandbox-shift").bumpShiftCounter
  let tickSandboxSim: typeof import("../sandbox-sim").tickSandboxSim

  let tenantLock: PoolClient | null = null

  beforeAll(async () => {
    // Hold the tenant for this suite's duration: the live-sim suite reseeds
    // the same carrier, and vitest runs files in parallel workers.
    tenantLock = await lockSandboxTenant()
    ;({ query, hubDb } = await import("../db"))
    ;({ bumpShiftCounter } = await import("../sandbox-shift"))
    ;({ tickSandboxSim } = await import("../sandbox-sim"))
    // A carrier_settings row with a sim block is all these writers need; the
    // tick's world snapshot is allowed to come back empty.
    await query(
      `INSERT INTO hub.carriers (id, name) VALUES ($1, 'Sim Concurrency Fixture')
       ON CONFLICT (id) DO NOTHING`,
      [C]
    )
    await query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings) VALUES ($1, $2)
       ON CONFLICT (carrier_id) DO UPDATE SET settings = EXCLUDED.settings`,
      [
        C,
        JSON.stringify({
          invoice: { prefix: "SIM-", nextNumber: 1 },
          sim: { epoch: "test-epoch", lastTickAt: null, nextDropAt: null, activeSeats: {} },
        }),
      ]
    )
  })

  afterAll(async () => {
    if (!hasDb) return
    // Leave the fixture carrier's settings behind — the row is inert, and the
    // sandbox seed owns this carrier id anyway (it upserts wholesale).
    await query(`DELETE FROM hub.carrier_settings WHERE carrier_id = $1`, [C]).catch(() => {})
    await unlockSandboxTenant(tenantLock)
  })

  const readSim = async () =>
    (
      await query<{ sim: Record<string, unknown> }>(
        `SELECT settings->'sim' AS sim FROM hub.carrier_settings WHERE carrier_id = $1`,
        [C]
      )
    )[0].sim as {
      epoch: string
      lastTickAt: string | null
      activeSeats: Record<string, string>
      telemetry?: Record<string, number>
    }

  /**
   * Forces the ONLY interleaving that can lose data: a write that commits
   * after the tick has read `settings->'sim'` but before the tick's own
   * UPDATE. A blocking transaction pins the row so the tick reaches its
   * UPDATE and waits; releasing it makes Postgres re-evaluate the tick's SET
   * expression against the newly committed row (READ COMMITTED / EvalPlanQual).
   * Per-key jsonb_set survives that re-evaluation; a wholesale '{sim}' write
   * built from the stale snapshot does not — which is the regression this
   * pins. (Verified by mutation: restoring the wholesale commit fails here.)
   */
  it("a write committed mid-tick survives the tick's own commit", async () => {
    await bumpShiftCounter("shiftsStarted", "dispatcher") // before the tick: the easy case
    const before = (await readSim()).telemetry ?? {}

    const blocker = await hubDb().connect()
    let ticking: Promise<unknown>
    try {
      await blocker.query("BEGIN")
      // Presence + a counter, uncommitted: this holds the row lock.
      await blocker.query(
        `UPDATE hub.carrier_settings
            SET settings = jsonb_set(
                  jsonb_set(settings, '{sim,activeSeats,driver}', to_jsonb($2::text), true),
                  '{sim,telemetry,shiftsCompleted_accountant}',
                  to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'shiftsCompleted_accountant')::int, 0) + 1),
                  true)
          WHERE carrier_id = $1`,
        [C, "2026-01-15T18:00:00.000Z"]
      )
      // seatKey null so the tick's own presence write doesn't block first.
      ticking = tickSandboxSim(null, new Date())
      // Let the tick read state and reach its UPDATE, where it now waits.
      await new Promise((r) => setTimeout(r, 800))
      await blocker.query("COMMIT")
    } finally {
      blocker.release()
    }
    await ticking

    const sim = await readSim()
    expect(sim.epoch).toBe("test-epoch") // the tick owns neither the epoch…
    expect(sim.activeSeats.driver).toBe("2026-01-15T18:00:00.000Z") // …nor presence
    expect(sim.telemetry?.shiftsCompleted_accountant).toBe(1) // …nor shift counters
    expect(sim.telemetry?.shiftsStarted_dispatcher).toBe((before.shiftsStarted_dispatcher ?? 0))
    expect(sim.lastTickAt).toBeTruthy() // it DOES own its own clock
    expect(sim.telemetry?.ticks).toBeGreaterThanOrEqual(1) // and its own counters
  })

  it("counters accumulate across ticks instead of being overwritten", async () => {
    const before = (await readSim()).telemetry ?? {}
    await bumpShiftCounter("shiftsStarted", "dispatcher")
    // Move lastTickAt back so the 20s freshness gate lets a second tick run.
    await query(
      `UPDATE hub.carrier_settings
          SET settings = jsonb_set(settings, '{sim,lastTickAt}', to_jsonb($2::text), true)
        WHERE carrier_id = $1`,
      [C, new Date(Date.now() - 120_000).toISOString()]
    )
    await tickSandboxSim(null, new Date())

    const after = await readSim()
    expect(after.telemetry?.shiftsStarted_dispatcher).toBe((before.shiftsStarted_dispatcher ?? 0) + 1)
    expect(after.telemetry?.ticks).toBeGreaterThan(before.ticks ?? 0)
  })

  it("a hostile seat key cannot escape its json path or inject sql", async () => {
    // touchPresence and bumpShiftCounter both interpolate a key; both scrub.
    await bumpShiftCounter("shiftsStarted", "dispatcher'}, '{invoice}', '\"pwned\"'::jsonb) --")
    const row = await query<{ settings: Record<string, unknown> }>(
      `SELECT settings FROM hub.carrier_settings WHERE carrier_id = $1`,
      [C]
    )
    // The invoice block is untouched and the sim block is still an object.
    expect((row[0].settings as { invoice: { prefix: string } }).invoice.prefix).toBe("SIM-")
    const sim = await readSim()
    expect(typeof sim).toBe("object")
  })
})
