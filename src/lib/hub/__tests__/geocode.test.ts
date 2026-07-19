import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { geocodeCityState } from "../geocode"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("passes a timeout AbortSignal to the geocoder fetch", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.3809", lon: "-122.2348" }],
    })

    const result = await geocodeCityState("Kent", "WA")

    expect(result).toEqual({ lat: 47.3809, lng: -122.2348 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal.aborted).toBe(false)
  })

  it("returns null instead of propagating when the geocoder times out", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })

  it("returns null on non-ok responses", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => [] })

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })

  it("serves cached coordinates without hitting the network", async () => {
    queryOneMock.mockResolvedValue({ lat: 47.38, lng: -122.23 })

    const result = await geocodeCityState("Kent", "WA")

    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("caches a null result so a failed lookup is not retried on every call", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })

    await expect(geocodeCityState("Nowhere", "ZZ")).resolves.toBeNull()

    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.geocode_cache"))
    expect(insert).toBeDefined()
    expect(insert?.[1]).toEqual(["nowhere,ZZ", null, null])
  })
})
