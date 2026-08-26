/**
 * Advance exposure: the number the office needs before approving another pump
 * advance. Outstanding (approved) and pending (requested) both count; applied
 * and cancelled advances are history and must not.
 */
import { describe, expect, it } from "vitest"
import { advanceBalances, type AdvanceLite } from "../advances-core"

const ROWS: AdvanceLite[] = [
  { driver_id: "d1", driver_name: "Amrit S", status: "outstanding", amount_cents: 50000 },
  { driver_id: "d1", driver_name: "Amrit S", status: "outstanding", amount_cents: 25000 },
  { driver_id: "d1", driver_name: "Amrit S", status: "pending", amount_cents: 15000 },
  { driver_id: "d1", driver_name: "Amrit S", status: "applied", amount_cents: 99999 },
  { driver_id: "d2", driver_name: "Bant K", status: "pending", amount_cents: 20000 },
  { driver_id: "d3", driver_name: "Cal R", status: "cancelled", amount_cents: 10000 },
]

describe("advanceBalances — per-driver exposure", () => {
  it("sums outstanding and pending per driver, ignoring applied/cancelled", () => {
    const balances = advanceBalances(ROWS)
    const d1 = balances.find((b) => b.driver_id === "d1")!
    expect(d1.outstanding_cents).toBe(75000)
    expect(d1.pending_cents).toBe(15000)
    expect(d1.exposure_cents).toBe(90000)
  })

  it("drops drivers whose only advances are applied/cancelled", () => {
    const balances = advanceBalances(ROWS)
    expect(balances.some((b) => b.driver_id === "d3")).toBe(false)
  })

  it("orders drivers by exposure, heaviest first", () => {
    const balances = advanceBalances(ROWS)
    expect(balances.map((b) => b.driver_id)).toEqual(["d1", "d2"])
  })

  it("returns nothing for an empty or fully-settled list", () => {
    expect(advanceBalances([])).toEqual([])
    expect(
      advanceBalances([{ driver_id: "d1", status: "applied", amount_cents: 500 }])
    ).toEqual([])
  })
})
