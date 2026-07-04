/**
 * dispatchLegality is the gate the dispatch board shows AND the server
 * enforces (advanceLoadStatusAction refuses booked→dispatched on hard stops,
 * same as the planner assignment path). Pin the stop/warning split.
 */
import { describe, expect, it } from "vitest"
import { dispatchLegality } from "../drivers"

const NOW = new Date("2026-07-04T12:00:00Z")
const day = (offset: number) =>
  new Date(NOW.getTime() + offset * 86400000).toISOString()

const driver = (over: Partial<Parameters<typeof dispatchLegality>[0] & object> = {}) => ({
  first_name: "Amrit",
  last_name: "Bains",
  cdl_expiry: day(365),
  medical_card_expiry: day(365),
  ...over,
})

const truck = (status = "active") => ({ status, unit_number: "105" })

describe("dispatchLegality", () => {
  it("is legal with valid credentials and an active truck", () => {
    const result = dispatchLegality(driver(), truck(), NOW)
    expect(result.legal).toBe(true)
    expect(result.stops).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("hard-stops on expired medical card", () => {
    const result = dispatchLegality(driver({ medical_card_expiry: day(-1) }), truck(), NOW)
    expect(result.legal).toBe(false)
    expect(result.stops).toEqual(["Amrit Bains: medical card expired"])
  })

  it("hard-stops on expired CDL", () => {
    const result = dispatchLegality(driver({ cdl_expiry: day(-30) }), truck(), NOW)
    expect(result.legal).toBe(false)
    expect(result.stops).toEqual(["Amrit Bains: CDL expired"])
  })

  it("hard-stops on truck in the shop or retired", () => {
    expect(dispatchLegality(driver(), truck("shop"), NOW).legal).toBe(false)
    expect(dispatchLegality(driver(), truck("retired"), NOW).legal).toBe(false)
  })

  it("expiring within 14 days warns but stays legal", () => {
    const result = dispatchLegality(driver({ cdl_expiry: day(7) }), truck(), NOW)
    expect(result.legal).toBe(true)
    expect(result.warnings).toEqual(["Amrit Bains: CDL expires soon"])
  })

  it("missing expiry dates warn but stay legal", () => {
    const result = dispatchLegality(
      driver({ cdl_expiry: null, medical_card_expiry: null }),
      truck(),
      NOW
    )
    expect(result.legal).toBe(true)
    expect(result.warnings).toHaveLength(2)
  })

  it("no driver and no truck assigned is legal (nothing to check)", () => {
    expect(dispatchLegality(null, null, NOW).legal).toBe(true)
  })

  it("collects multiple stops across driver and truck", () => {
    const result = dispatchLegality(
      driver({ cdl_expiry: day(-1), medical_card_expiry: day(-1) }),
      truck("shop"),
      NOW
    )
    expect(result.legal).toBe(false)
    expect(result.stops).toHaveLength(3)
  })
})
