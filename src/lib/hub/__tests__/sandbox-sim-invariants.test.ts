/**
 * The invariant checks, proven to fire.
 *
 * An assertion nobody has ever seen fail is indistinguishable from an
 * assertion that cannot fail, so each rule here is tested by *breaking* the
 * world in the specific way it exists to catch, confirming it reports, then
 * putting the world back. The clean-world case runs first and last so a
 * leaked fixture shows up as a failure rather than as silence.
 *
 * Requires POSTGRES_URL; skips cleanly otherwise. Holds the shared sandbox
 * tenant lock, because it deliberately corrupts that tenant mid-test.
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
if (!hasDb) console.warn("\n⚠️  sandbox-sim-invariants.test.ts SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("sandbox invariant checks fire on a broken world", () => {
  let query: typeof import("../db").query
  let checkSandboxInvariants: typeof import("../sandbox-sim-invariants").checkSandboxInvariants
  let lock: PoolClient | null = null

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ checkSandboxInvariants } = await import("../sandbox-sim-invariants"))
    await (await import("../sandbox-seed")).seedSandbox()
  }, 180_000)

  afterAll(async () => {
    // Leave the tenant as we found it, then release for the other suites.
    if (hasDb) await (await import("../sandbox-seed")).seedSandbox().catch(() => {})
    await unlockSandboxTenant(lock)
  }, 180_000)

  it("a freshly seeded world satisfies every rule", async () => {
    expect(await checkSandboxInvariants()).toEqual([])
  })

  it("catches one truck pulling two loads", async () => {
    const [{ truck_id: truck }] = await query<{ truck_id: string }>(
      `SELECT truck_id FROM hub.loads
        WHERE carrier_id = $1 AND truck_id IS NOT NULL AND status = 'in_transit' LIMIT 1`,
      [C]
    )
    const [{ id: victim }] = await query<{ id: string }>(
      `SELECT id FROM hub.loads
        WHERE carrier_id = $1 AND status = 'booked' AND truck_id IS DISTINCT FROM $2 LIMIT 1`,
      [C, truck]
    )
    await query(`UPDATE hub.loads SET truck_id = $2, status = 'in_transit' WHERE carrier_id = $1 AND id = $3`,
      [C, truck, victim])
    const rules = (await checkSandboxInvariants()).map((v) => v.rule)
    expect(rules).toContain("one-load-per-truck")
  })

  it("catches the autopilot finishing a player's load", async () => {
    const [{ id: playerLoad }] = await query<{ id: string }>(
      `SELECT l.id FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE l.carrier_id = $1 AND d.user_id IS NOT NULL LIMIT 1`,
      [C]
    )
    // The exact footprint the ownership clamp exists to prevent.
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'status_change', NULL, 'Blue Ridge autopilot', '{"to":"delivered"}'::jsonb)`,
      [C, playerLoad]
    )
    const rules = (await checkSandboxInvariants()).map((v) => v.rule)
    expect(rules).toContain("player-load-never-auto-completed")
  })

  it("catches an invoice paid beyond its face value", async () => {
    const [{ id: invoice, amount_cents: amount }] = await query<{ id: string; amount_cents: number }>(
      `SELECT id, amount_cents FROM hub.invoices WHERE carrier_id = $1 LIMIT 1`,
      [C]
    )
    await query(
      `INSERT INTO hub.payments (carrier_id, invoice_id, amount_cents, paid_on, method, reference)
       VALUES ($1, $2, $3, CURRENT_DATE, 'ACH', 'INVARIANT-TEST')`,
      [C, invoice, amount * 3]
    )
    const rules = (await checkSandboxInvariants()).map((v) => v.rule)
    expect(rules).toContain("no-overpaid-invoice")
  })

  it("catches a load rolling with no crew", async () => {
    await query(
      `UPDATE hub.loads SET driver_id = NULL WHERE carrier_id = $1 AND status = 'in_transit'
        AND id = (SELECT id FROM hub.loads WHERE carrier_id = $1 AND status = 'in_transit' LIMIT 1)`,
      [C]
    )
    const rules = (await checkSandboxInvariants()).map((v) => v.rule)
    expect(rules).toContain("rolling-load-has-crew")
  })

  it("is clean again once the world is rebuilt", async () => {
    await (await import("../sandbox-seed")).seedSandbox()
    expect(await checkSandboxInvariants()).toEqual([])
  }, 180_000)

  /**
   * Reset has to mean reset.
   *
   * The seed's PRNG was module-level, so the second reset in a process
   * continued the stream and quietly built a *different* company — which is
   * how a driverless in-transit load could appear on one reset and not the
   * next, and why it went unnoticed for so long. The fingerprint deliberately
   * excludes timestamps (those are relative to wall-clock now) and database
   * ids (server-generated), and compares the parts the PRNG chooses: who is on
   * what load, in which truck, hauling what, for how much.
   */
  it("builds the same company every single reset", async () => {
    const { seedSandbox } = await import("../sandbox-seed")
    const fingerprint = async () =>
      (
        await query<{ fp: string }>(
          `SELECT md5(string_agg(
                    l.reference || l.status
                    || COALESCE(d.first_name || d.last_name, '-')
                    || COALESCE(t.unit_number, '-')
                    || l.linehaul_cents || l.fuel_surcharge_cents
                    || COALESCE(l.commodity, '') || COALESCE(l.loaded_miles, 0),
                    ',' ORDER BY l.reference)) AS fp
             FROM hub.loads l
             LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
             LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = $1
            WHERE l.carrier_id = $1`,
          [C]
        )
      )[0].fp

    await seedSandbox()
    const first = await fingerprint()
    await seedSandbox()
    expect(await fingerprint()).toBe(first)
  }, 180_000)
})
