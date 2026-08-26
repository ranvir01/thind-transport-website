/**
 * Live-database simulation harness — the tests that only a real world can
 * fail. Contributed by an outside test buddy (2026-08-11) and adapted to the
 * current seat-aware metrics reader.
 *
 * The unit suites prove the planner is correct in isolation; this proves the
 * world it produces is one you'd want to play. It drives `tickSandboxSim`
 * with an explicit `now`, so hours of wall time pass in milliseconds, and
 * asserts the properties the design promises: the world moves, the player's
 * job stays the player's, catch-up is bounded, the board neither floods nor
 * starves, and the accountant's backlog converges instead of running away.
 *
 * The single most valuable case here is the player-ownership clamp: a future
 * change that lets the sim finish a human's load would pass every unit test
 * and ruin the seat, and this is the only thing that would notice.
 *
 * Requires POSTGRES_URL. Skips itself when absent, so it is safe on the unit
 * job and meaningful on the DB-backed one. It reseeds the sandbox, so it
 * owns that tenant for the duration.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const MIN = 60_000
const hasDb = Boolean(process.env.POSTGRES_URL)
const suite = hasDb ? describe : describe.skip

if (!hasDb) {
  console.warn(
    "\n⚠️  sandbox-sim-live SKIPPED — no POSTGRES_URL. The planner unit tests still\n" +
      "   ran, but nothing proved the world actually moves. Set POSTGRES_URL to\n" +
      "   exercise it.\n"
  )
}

suite("sandbox simulation, against a live world", () => {
  let C: string
  let query: typeof import("../db").query
  let queryOne: typeof import("../db").queryOne
  let SANDBOX_SEATS: typeof import("../sandbox").SANDBOX_SEATS
  let tickSandboxSim: typeof import("../sandbox-sim").tickSandboxSim
  let readShiftMetrics: typeof import("../sandbox-shift").readShiftMetrics
  let evaluateShift: typeof import("../sandbox-objectives").evaluateShift

  const userIdFor = async (email: string) =>
    (
      await queryOne<{ id: string }>(
        `SELECT id FROM hub.users WHERE lower(email) = lower($1) AND carrier_id = $2`,
        [email, C]
      )
    )?.id ?? null

  /** Loads the player owns and still has work on — the set the sim must not touch. */
  const playerOpenLoads = async () =>
    (
      await query<{ id: string }>(
        `SELECT l.id FROM hub.loads l
           JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
          WHERE l.carrier_id = $1 AND d.user_id IS NOT NULL
            AND l.status NOT IN ('delivered','invoiced','paid','cancelled')`,
        [C]
      )
    )
      .map((r) => r.id)
      .sort()

  const countLoads = async (statuses: string[]) =>
    Number(
      (
        await queryOne<{ n: string }>(
          `SELECT COUNT(*)::text n FROM hub.loads WHERE carrier_id = $1 AND status = ANY($2)`,
          [C, statuses]
        )
      )?.n ?? 0
    )

  const countPings = async () =>
    Number(
      (
        await queryOne<{ n: string }>(
          `SELECT COUNT(*)::text n FROM hub.position_pings WHERE carrier_id = $1`,
          [C]
        )
      )?.n ?? 0
    )

  let tenantLock: PoolClient | null = null

  afterAll(async () => {
    await unlockSandboxTenant(tenantLock)
  })

  beforeAll(async () => {
    tenantLock = await lockSandboxTenant() // this suite reseeds — nobody else touches the tenant meanwhile
    ;({ query, queryOne } = await import("../db"))
    ;({ SANDBOX_SEATS } = await import("../sandbox"))
    C = (await import("../sandbox")).SANDBOX_CARRIER_ID
    ;({ tickSandboxSim } = await import("../sandbox-sim"))
    ;({ readShiftMetrics } = await import("../sandbox-shift"))
    ;({ evaluateShift } = await import("../sandbox-objectives"))
    await (await import("../sandbox-seed")).seedSandbox()
  }, 180_000)

  it("seeds a world that is already in motion", async () => {
    expect(await countLoads(["quoted"]), "dispatcher opens to an empty board").toBeGreaterThan(0)
    expect(await countLoads(["in_transit"]), "nothing is rolling, so the map is dead").toBeGreaterThan(0)
  })

  it("moves trucks and progresses NPC loads over four hours", async () => {
    const before = await countPings()
    for (let i = 1; i <= 8; i++) await tickSandboxSim(null, new Date(Date.now() + i * 30 * MIN))
    expect(await countPings(), "no new position pings — the live map would sit still").toBeGreaterThan(before)
  }, 240_000)

  it("never does the player's job for them", async () => {
    const before = await playerOpenLoads()
    for (let i = 1; i <= 8; i++) await tickSandboxSim(null, new Date(Date.now() + (240 + i * 30) * MIN))
    const after = await playerOpenLoads()
    for (const id of before) {
      expect(after.includes(id), `the sim completed player-owned load ${id}`).toBe(true)
    }
  }, 240_000)

  it("catches up after a long gap without exploding", async () => {
    const started = Date.now()
    const r = await tickSandboxSim(null, new Date(Date.now() + (480 + 14 * 60) * MIN))
    expect(Date.now() - started, "catch-up must stay inside serverless limits").toBeLessThan(20_000)
    if (r.advanced && typeof r.ops === "number") {
      expect(r.ops, "op budget blown on a realistic overnight gap").toBeLessThanOrEqual(200)
    }
  }, 120_000)

  it("bounds MOVE when the whole fleet is rolling", async () => {
    // The worst case the whole-fleet ping budget exists for.
    await query(
      `UPDATE hub.loads SET status = 'in_transit'
        WHERE carrier_id = $1 AND status IN ('booked','dispatched','at_pickup') AND truck_id IS NOT NULL`,
      [C]
    )
    const started = Date.now()
    const r = await tickSandboxSim(null, new Date(Date.now() + 24 * 60 * MIN))
    if (r.advanced && typeof r.ops === "number") {
      expect(r.ops, "whole-fleet MOVE is unbounded again").toBeLessThanOrEqual(200)
    }
    expect(Date.now() - started).toBeLessThan(20_000)
  }, 120_000)

  it("keeps the quoted board between starvation and flood", async () => {
    const samples: number[] = []
    for (let h = 1; h <= 6; h++) {
      await tickSandboxSim(null, new Date(Date.now() + (24 * 60 + h * 45) * MIN))
      samples.push(await countLoads(["quoted"]))
    }
    expect(Math.min(...samples), "board starved — dispatcher has nothing to book").toBeGreaterThan(0)
    expect(Math.max(...samples), "board flooded").toBeLessThanOrEqual(12)
  }, 240_000)

  it("does not let the accountant's backlog run away", async () => {
    const uid = await userIdFor("sandbox.books@demo.thind")
    expect(uid).toBeTruthy()
    const series: number[] = []
    for (let h = 1; h <= 12; h++) {
      await tickSandboxSim(null, new Date(Date.now() + (28 * 60 + h * 60) * MIN))
      series.push((await readShiftMetrics(uid!, "accountant")).unbilledCount)
    }
    expect(
      series[series.length - 1],
      `unbilled backlog looks unbounded: ${series.join("→")}`
    ).toBeLessThan(120)
  }, 300_000)

  it("credits the player for their work and none of the simulation's", async () => {
    const uid = await userIdFor("sandbox.dispatch@demo.thind")
    expect(uid).toBeTruthy()
    const baseline = await readShiftMetrics(uid!, "dispatcher")
    for (let i = 1; i <= 6; i++) await tickSandboxSim(null, new Date(Date.now() + (40 * 60 + i * 40) * MIN))
    const evaluation = evaluateShift("dispatcher", baseline, await readShiftMetrics(uid!, "dispatcher"))
    expect(evaluation.score, "an idle player scored points the simulation earned").toBe(0)
  }, 240_000)

  it("gives every seat a real user to sign in as", async () => {
    for (const seat of SANDBOX_SEATS) {
      expect(await userIdFor(seat.email), `seat ${seat.key} (${seat.email}) has no user row`).toBeTruthy()
    }
  })
})
