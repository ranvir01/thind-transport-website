import { describe, expect, it } from "vitest"
import { estimateRoadMiles, milesSourceLabel, ROAD_WINDING_FACTOR } from "../routing-core"

describe("estimateRoadMiles", () => {
  it("applies the road winding factor and rounds", () => {
    expect(estimateRoadMiles(100)).toBe(Math.round(100 * ROAD_WINDING_FACTOR))
    expect(estimateRoadMiles(250)).toBe(300)
  })

  it("never returns negative or NaN for junk input", () => {
    expect(estimateRoadMiles(0)).toBe(0)
    expect(estimateRoadMiles(-40)).toBe(0)
    expect(estimateRoadMiles(Number.NaN)).toBe(0)
  })

  it("honors a custom factor", () => {
    expect(estimateRoadMiles(100, 1.0)).toBe(100)
  })
})

describe("milesSourceLabel", () => {
  it("labels each provider", () => {
    expect(milesSourceLabel("osrm")).toMatch(/OSRM/)
    expect(milesSourceLabel("mapbox")).toMatch(/Mapbox/)
    expect(milesSourceLabel("estimate")).toMatch(/estimate/)
  })
})
