/**
 * The dispatch card's alert strips, pinned as a pure function (#66).
 *
 * A grounded truck used to reach the board only as "Truck #N is in the shop"
 * through dispatchLegality — true, but it hid the defect and the page that
 * certifies the repair. These cases pin the merge: grounded leads with the
 * reason and a link, the duplicate "in the shop" stop is dropped, every other
 * stop still shows, and a warning shows only when nothing is stopping the load.
 */
import { describe, expect, it } from "vitest"
import { dispatchCardAlerts, groundedAlertText, groundedByTruck } from "../dispatch-alerts"
import type { GroundedTruck } from "../dvir"
import type { LegalityCheck } from "../drivers"

const grounded = (over: Partial<GroundedTruck> = {}): GroundedTruck => ({
  dvir_id: "dvir-1",
  truck_id: "truck-1",
  truck_unit: "105",
  driver_name: "Amrit Bains",
  created_at: "2026-09-10T08:00:00Z",
  defects: [{ label: "Service brakes", note: "pulls left" }],
  ...over,
})

const legality = (over: Partial<LegalityCheck> = {}): LegalityCheck => ({
  legal: true,
  warnings: [],
  stops: [],
  ...over,
})

describe("groundedByTruck", () => {
  it("keys the grounded list by truck id", () => {
    const map = groundedByTruck([grounded(), grounded({ dvir_id: "dvir-2", truck_id: "truck-2", truck_unit: "106" })])
    expect(map.size).toBe(2)
    expect(map.get("truck-2")?.truck_unit).toBe("106")
    expect(map.get("truck-9")).toBeUndefined()
  })
})

describe("dispatchCardAlerts", () => {
  it("a clean card has no strips", () => {
    expect(dispatchCardAlerts({ legality: legality(), grounded: null })).toEqual([])
  })

  it("a grounded truck leads with the defect and links to the truck page", () => {
    const alerts = dispatchCardAlerts({ legality: legality(), grounded: grounded() })
    expect(alerts).toEqual([
      { tone: "bad", text: "Unit 105 grounded — Service brakes · certify repair", href: "/hub/fleet/trucks/truck-1" },
    ])
  })

  it("drops the bare 'in the shop' stop when the grounding explains it", () => {
    const alerts = dispatchCardAlerts({
      legality: legality({ legal: false, stops: ["Truck #105 is in the shop"] }),
      grounded: grounded(),
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].href).toBe("/hub/fleet/trucks/truck-1")
  })

  it("keeps the 'in the shop' stop when the truck is not grounded on a DVIR", () => {
    const alerts = dispatchCardAlerts({
      legality: legality({ legal: false, stops: ["Truck #105 is in the shop"] }),
      grounded: null,
    })
    expect(alerts).toEqual([{ tone: "bad", text: "Truck #105 is in the shop" }])
  })

  it("shows every other hard stop after the grounding, grounding first", () => {
    const alerts = dispatchCardAlerts({
      legality: legality({ legal: false, stops: ["Amrit Bains: CDL expired", "Truck #105 is in the shop"] }),
      grounded: grounded(),
    })
    expect(alerts.map((a) => a.text)).toEqual([
      "Unit 105 grounded — Service brakes · certify repair",
      "Amrit Bains: CDL expired",
    ])
    expect(alerts.every((a) => a.tone === "bad")).toBe(true)
  })

  it("shows the first warning only when nothing is stopping the load", () => {
    const warned = dispatchCardAlerts({
      legality: legality({ warnings: ["Amrit Bains: CDL expires soon", "Amrit Bains: medical card expires soon"] }),
      grounded: null,
    })
    expect(warned).toEqual([{ tone: "warn", text: "Amrit Bains: CDL expires soon" }])

    const stopped = dispatchCardAlerts({
      legality: legality({ legal: false, warnings: ["Amrit Bains: CDL expires soon"], stops: ["Amrit Bains: medical card expired"] }),
      grounded: null,
    })
    expect(stopped.map((a) => a.tone)).toEqual(["bad"])
  })

  it("falls back to 'Defect' when the DVIR carries no defect rows", () => {
    expect(groundedAlertText(grounded({ defects: [] }))).toBe("Unit 105 grounded — Defect · certify repair")
  })
})
