import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { geocodeCityState } from "../geocode"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("returns coordinates from a successful lookup", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.3809", lon: "-122.2348" }],
    })
    expect(await geocodeCityState("Kent", "WA")).toEqual({ lat: 47.3809, lng: -122.2348 })
  })

  it("passes an abort signal so a hung geocoder cannot stall load booking", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })
    await geocodeCityState("Kent", "WA")
    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null when the lookup times out instead of throwing", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))
    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })
})
