import { describe, expect, it } from "vitest"
import { haversineMiles, jurisdictionMilesFromPings, stateForPoint } from "../geo"

describe("haversineMiles", () => {
  it("returns zero for the same point", () => {
    expect(haversineMiles(47.6062, -122.3321, 47.6062, -122.3321)).toBe(0)
  })

  it("computes great-circle distance between two known cities", () => {
    // Kent, WA -> Denver, CO
    expect(haversineMiles(47.3809, -122.2348, 39.7392, -104.9903)).toBeCloseTo(1008.69, 1)
  })

  it("is symmetric", () => {
    const a = haversineMiles(47.6062, -122.3321, 41.8781, -87.6298)
    const b = haversineMiles(41.8781, -87.6298, 47.6062, -122.3321)
    expect(a).toBeCloseTo(b, 9)
  })
})

describe("stateForPoint", () => {
  it("resolves known cities to their state", () => {
    expect(stateForPoint(47.6062, -122.3321)).toBe("WA") // Seattle
    expect(stateForPoint(47.3809, -122.2348)).toBe("WA") // Kent (HQ)
    expect(stateForPoint(39.7392, -104.9903)).toBe("CO") // Denver
    expect(stateForPoint(41.8781, -87.6298)).toBe("IL") // Chicago
  })

  it("returns null over open ocean", () => {
    expect(stateForPoint(30, -150)).toBeNull() // mid-Pacific
    expect(stateForPoint(35, -40)).toBeNull() // mid-Atlantic
  })
})

describe("jurisdictionMilesFromPings", () => {
  const kentWA = { lat: 47.3809, lng: -122.2348, ts: "2026-01-01T00:00:00Z" }
  const spokaneWA = { lat: 47.6588, lng: -117.426, ts: "2026-01-01T01:00:00Z" }
  const coeurDAleneID = { lat: 47.6777, lng: -116.7805, ts: "2026-01-01T02:00:00Z" }

  it("accumulates miles into the midpoint's jurisdiction", () => {
    const result = jurisdictionMilesFromPings([spokaneWA, coeurDAleneID])
    expect(result).toEqual({ WA: 30.06 })
  })

  it("sorts pings by timestamp before allocating, regardless of input order", () => {
    const inOrder = jurisdictionMilesFromPings([spokaneWA, coeurDAleneID])
    const shuffled = jurisdictionMilesFromPings([coeurDAleneID, spokaneWA])
    expect(shuffled).toEqual(inOrder)
  })

  it("skips segments longer than maxSegmentMiles as GPS glitches", () => {
    // Kent -> Spokane is ~225mi, well over the 120mi default
    const result = jurisdictionMilesFromPings([kentWA, spokaneWA, coeurDAleneID])
    expect(result).toEqual({ WA: 30.06 })
  })

  it("honors a custom maxSegmentMiles threshold", () => {
    expect(jurisdictionMilesFromPings([spokaneWA, coeurDAleneID], 25)).toEqual({})
    expect(
      jurisdictionMilesFromPings([kentWA, spokaneWA, coeurDAleneID], 300)
    ).toEqual({ WA: 255.23 })
  })

  it("drops zero-distance segments (duplicate pings)", () => {
    const same = { lat: 47.6062, lng: -122.3321, ts: "2026-01-01T00:00:00Z" }
    const result = jurisdictionMilesFromPings([same, { ...same, ts: "2026-01-01T00:05:00Z" }])
    expect(result).toEqual({})
  })

  it("drops segments that never resolve to a jurisdiction (fully over water)", () => {
    const result = jurisdictionMilesFromPings([
      { lat: 30, lng: -150, ts: "2026-01-01T00:00:00Z" },
      { lat: 31, lng: -151, ts: "2026-01-01T00:05:00Z" },
    ])
    expect(result).toEqual({})
  })

  it("returns an empty object for fewer than two pings", () => {
    expect(jurisdictionMilesFromPings([])).toEqual({})
    expect(jurisdictionMilesFromPings([kentWA])).toEqual({})
  })
})
