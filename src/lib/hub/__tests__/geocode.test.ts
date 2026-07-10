import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => ({ rows: [] })),
  queryOne: vi.fn(async () => null),
}))

import { geocodeCityState } from "@/lib/hub/geocode"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("returns coordinates from the geocoder and bounds the request with a timeout signal", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.3809", lng: undefined, lon: "-122.2348" }],
    })

    const result = await geocodeCityState("Kent", "WA")
    expect(result).toEqual({ lat: 47.3809, lng: -122.2348 })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null instead of hanging when the geocoder request times out", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })

  it("returns null on a non-OK geocoder response", async () => {
    fetchMock.mockResolvedValue({ ok: false })

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })
})
