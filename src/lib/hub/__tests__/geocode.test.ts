import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { geocodeCityState } from "../geocode"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue(null)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("returns the cached hit without calling the geocoder", async () => {
    queryOneMock.mockResolvedValue({ lat: 47.38, lng: -122.23 })
    const result = await geocodeCityState("Kent", "wa")
    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns null for a cached negative entry without calling the geocoder", async () => {
    queryOneMock.mockResolvedValue({ lat: null, lng: null })
    expect(await geocodeCityState("Nowhere", "ZZ")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("looks up Nominatim on a cache miss and writes the cache row", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "39.7392", lon: "-104.9903" }],
    })
    const result = await geocodeCityState("Denver", "CO")
    expect(result).toEqual({ lat: 39.7392, lng: -104.9903 })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.geocode_cache"),
      ["denver,CO", 39.7392, -104.9903]
    )
  })

  it("passes an abort signal so a hung geocoder cannot stall load booking", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })
    await geocodeCityState("Denver", "CO")
    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null (and caches the miss) when the fetch aborts on timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))
    expect(await geocodeCityState("Denver", "CO")).toBeNull()
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.geocode_cache"),
      ["denver,CO", null, null]
    )
  })

  it("returns null on a non-OK geocoder response", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => [] })
    expect(await geocodeCityState("Denver", "CO")).toBeNull()
  })
})
