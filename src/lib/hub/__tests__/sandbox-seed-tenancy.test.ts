/**
 * Regression for the crunch-scenario DVIR overlay in sandbox-seed.ts:
 * the INSERT selected the assigned driver's name via `JOIN hub.drivers d
 * ON d.id = t.assigned_driver_id` with only `t.carrier_id = $1` in WHERE.
 * A same-id driver row from another tenant would supply the signed_name
 * (and, if assigned_driver_id ever collided, the insert would attach a
 * foreign driver_id). Pin the join the same way fleet/planner/today do.
 *
 * Source-shape rather than a live seed: applySandboxScenario always calls
 * seedSandbox first (bcrypt + hundreds of inserts), which is the live
 * sandbox-sim-* suite's job, not a tenancy pin.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SOURCE = readFileSync(join(__dirname, "../sandbox-seed.ts"), "utf-8")

describe("sandbox crunch DVIR insert pins the driver join on both sides", () => {
  it("joins hub.drivers on assigned_driver_id AND carrier_id, not id alone", () => {
    const dvirInsert = SOURCE.match(
      /INSERT INTO hub\.dvirs[\s\S]*?JOIN hub\.drivers d ON[^\n]+/
    )
    expect(dvirInsert?.[0]).toBeDefined()
    expect(dvirInsert![0]).toContain(
      "JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id"
    )
    expect(dvirInsert![0]).not.toMatch(
      /JOIN hub\.drivers d ON d\.id = t\.assigned_driver_id\s*$/
    )
  })
})

describe("sandbox crunch afternoon overlay leaves the late pickups late", () => {
  it("excludes the no-show load ids from the this-afternoon appt bump", () => {
    const afternoon = SOURCE.match(
      /UPDATE hub\.stops SET appt_start = NOW\(\) \+ interval '3 hours'[\s\S]*?LIMIT 3/
    )
    expect(afternoon?.[0]).toBeDefined()
    expect(afternoon![0]).toContain("AND NOT (id = ANY($2::uuid[]))")
    expect(afternoon![0]).toContain("ORDER BY reference")
    expect(afternoon![0]).not.toMatch(
      /AND load_id IN \(SELECT id FROM hub\.loads WHERE carrier_id = \$1 AND status = 'booked' LIMIT 3\)/
    )
  })
})
