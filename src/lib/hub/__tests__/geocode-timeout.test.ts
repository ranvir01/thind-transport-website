import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => ({ rows: [] })),
  queryOne: vi.fn(async () => null),
}))

import { GEOCODER_TIMEOUT_MS, nominatimLookup } from "../geocode"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("nominatimLookup", () => {
  it("passes an abort signal so a hung geocoder cannot stall load booking", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "47.3809", lon: "-122.2348" }],
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await nominatimLookup("Kent", "WA")
    expect(result).toEqual({ lat: 47.3809, lng: -122.2348 })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null instead of throwing when the request times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError")
      })
    )
    await expect(nominatimLookup("Kent", "WA")).resolves.toBeNull()
  })

  it("keeps the timeout within the load-booking budget", () => {
    expect(GEOCODER_TIMEOUT_MS).toBeLessThanOrEqual(5000)
  })
})
