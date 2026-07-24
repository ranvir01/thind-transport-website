/**
 * suggestMiles had zero direct coverage: routing-core.test.ts only exercises
 * the pure estimateRoadMiles/milesSourceLabel helpers, never the provider
 * ladder in routing.ts (go-worker -> OSRM -> Mapbox -> great-circle estimate
 * -> null) that dispatch actually calls to fill in lane miles feeding pay,
 * rate-per-mile, and IFTA.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../geocode", () => ({ geocodeCityState: vi.fn() }))
vi.mock("../sidecars", () => ({ goWorkerRouteMiles: vi.fn() }))
vi.mock("../mapbox", () => ({ hasMapbox: vi.fn(), drivingMiles: vi.fn() }))

import { geocodeCityState } from "../geocode"
import { goWorkerRouteMiles } from "../sidecars"
import { hasMapbox, drivingMiles } from "../mapbox"
import { suggestMiles } from "../routing"

const geocodeMock = vi.mocked(geocodeCityState)
const workerMock = vi.mocked(goWorkerRouteMiles)
const hasMapboxMock = vi.mocked(hasMapbox)
const drivingMilesMock = vi.mocked(drivingMiles)

const ORIGIN = { city: "Kent", state: "WA" }
const DEST = { city: "Portland", state: "OR" }
// Kent, WA -> Portland, OR: real coordinates, ~150mi great-circle.
const A = { lat: 47.3809, lng: -122.2348 }
const B = { lat: 45.5152, lng: -122.6784 }

describe("suggestMiles", () => {
  beforeEach(() => {
    geocodeMock.mockReset().mockResolvedValue(null)
    workerMock.mockReset().mockResolvedValue(null)
    hasMapboxMock.mockReset().mockReturnValue(false)
    drivingMilesMock.mockReset().mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
  })

  it("returns null without geocoding either endpoint when a city/state is missing", async () => {
    await expect(suggestMiles({ city: null, state: "WA" }, DEST)).resolves.toBeNull()
    expect(geocodeMock).not.toHaveBeenCalled()
  })

  it("returns null when either endpoint fails to geocode", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(null)
    await expect(suggestMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("prefers the self-hosted go-worker when it answers", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(173)
    await expect(suggestMiles(ORIGIN, DEST)).resolves.toEqual({ miles: 173, source: "go-worker" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("falls back to OSRM when the go-worker has nothing", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(null)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ routes: [{ distance: 241350 }] }) }))
    )
    const result = await suggestMiles(ORIGIN, DEST)
    expect(result).toEqual({ miles: Math.round(241350 / 1609.344), source: "osrm" })
  })

  it("falls back to Mapbox when go-worker and OSRM both come up empty", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    hasMapboxMock.mockReturnValue(true)
    drivingMilesMock.mockResolvedValue(178)
    await expect(suggestMiles(ORIGIN, DEST)).resolves.toEqual({ miles: 178, source: "mapbox" })
  })

  it("falls back to the great-circle estimate when every provider is unavailable", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    hasMapboxMock.mockReturnValue(false)
    const result = await suggestMiles(ORIGIN, DEST)
    expect(result?.source).toBe("estimate")
    expect(result?.miles).toBeGreaterThan(0)
  })

  it("ignores a zero/negative go-worker reading and continues down the ladder", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(0)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ routes: [{ distance: 241350 }] }) }))
    )
    const result = await suggestMiles(ORIGIN, DEST)
    expect(result?.source).toBe("osrm")
  })

  it("returns null (never throws) when OSRM fetch itself rejects and nothing else is configured", async () => {
    geocodeMock.mockResolvedValueOnce(A).mockResolvedValueOnce(B)
    workerMock.mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    hasMapboxMock.mockReturnValue(false)
    const result = await suggestMiles(ORIGIN, DEST)
    expect(result?.source).toBe("estimate")
  })
})
