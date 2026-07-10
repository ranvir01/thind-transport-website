import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { geocodeCityState } from "../geocode"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("returns coordinates from a successful Nominatim response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ lat: "47.3809", lon: "-122.2348" }],
      }))
    )
    expect(await geocodeCityState("Kent", "WA")).toEqual({ lat: 47.3809, lng: -122.2348 })
  })

  it("passes an abort signal so a hung geocoder cannot stall load booking", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }))
    vi.stubGlobal("fetch", fetchMock)
    await geocodeCityState("Kent", "WA")
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null when the lookup times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError")
      })
    )
    expect(await geocodeCityState("Kent", "WA")).toBeNull()
  })
})
