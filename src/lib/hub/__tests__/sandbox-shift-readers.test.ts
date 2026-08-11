/**
 * Every seat's metrics reader, executed against a real Postgres.
 *
 * Pure unit tests cannot catch a typo'd column, a table that doesn't exist,
 * or a GROUP BY that Postgres rejects — and each shift seat added its own
 * hand-written SQL. This suite runs all of them for real. It asserts shape
 * and non-negativity rather than exact counts (the sandbox's contents move
 * with the sim), because the failure it exists to catch is "this query does
 * not run", which is exactly what a green unit suite would otherwise hide.
 *
 * Runs when POSTGRES_URL is available (reads .env.local like the scripts
 * do); skips cleanly otherwise so CI without a database stays green.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

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
  console.warn("\n⚠️  sandbox-shift-readers.test.ts SKIPPED — no POSTGRES_URL.\n")
}
const suite = hasDb ? describe : describe.skip

const NUMERIC_KEYS = [
  "myBookings", "myDispatches", "quotedCount", "myStatusMoves", "myPodsSubmitted",
  "myArrivals", "myOnTimeArrivals", "myInvoices", "myInvoicedCents", "paymentsRecorded",
  "unbilledCount", "mySettlementApprovals", "mySettlementPayouts", "myAdvances",
  "myPayments", "draftSettlements", "myIncidents", "myIncidentsClosed", "myRepairCerts",
  "myRandomTestResults", "openIncidents", "myStageAdvances", "myOffersSigned", "myHires",
  "applicantsWaiting", "myReceipts", "myAdvanceRequests", "myDvirs",
] as const

suite("every shift seat's metrics reader executes", () => {
  let readShiftMetrics: typeof import("../sandbox-shift").readShiftMetrics
  let SHIFT_SEATS: typeof import("../sandbox-objectives").SHIFT_SEATS
  let evaluateShift: typeof import("../sandbox-objectives").evaluateShift

  beforeAll(async () => {
    ;({ readShiftMetrics } = await import("../sandbox-shift"))
    ;({ SHIFT_SEATS, evaluateShift } = await import("../sandbox-objectives"))
  })

  it("runs for every seat without a SQL error, on a user that may not exist", async () => {
    // A random uuid stands in for "a seat nobody has played yet": the SQL
    // must still execute and come back zeroed, never throw.
    const ghost = "00000000-0000-4000-8000-000000000000"
    for (const seat of SHIFT_SEATS) {
      const m = await readShiftMetrics(ghost, seat)
      expect(m.at, seat).toBeTruthy()
      for (const key of NUMERIC_KEYS) {
        expect(Number.isFinite(m[key]), `${seat}.${key}`).toBe(true)
        expect(m[key], `${seat}.${key}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("produces a scoreable shift for every seat", async () => {
    const ghost = "00000000-0000-4000-8000-000000000000"
    for (const seat of SHIFT_SEATS) {
      const baseline = await readShiftMetrics(ghost, seat)
      const current = await readShiftMetrics(ghost, seat)
      const ev = evaluateShift(seat, baseline, current)
      expect(ev.objectives.length, seat).toBeGreaterThan(0)
      expect(ev.score, seat).toBeGreaterThanOrEqual(0)
      expect(ev.score, seat).toBeLessThanOrEqual(100)
      // Nobody did anything between the two snapshots, so nothing counted.
      // This is the property that catches an objective written as an
      // absolute board condition instead of a diff — that kind reads as
      // already-won at clock-in and scores nothing the player did.
      const counted = ev.objectives.filter((o) => o.progress > 0)
      expect(counted.map((o) => o.key), `${seat} scored work nobody did`).toEqual([])
    }
  })
})
