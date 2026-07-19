/**
 * geocodeCityState must never stall the load-booking round trip: the
 * Nominatim fetch carries a hard timeout signal, and an aborted/hung
 * lookup degrades to null instead of propagating. Regression target for
 * the 65fad58 backlog item (15-30s createLoadAction stalls under load).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => ({ rows: [] })),
  queryOneMock: vi.fn(async () => null),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock }))

import { geocodeCityState } from "../geocode"

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
  queryMock.mockClear()
  queryOneMock.mockClear()
})

describe("geocodeCityState timeout hardening", () => {
  it("passes an abort signal to the Nominatim fetch", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.38", lon: "-122.23" }],
    })

    const result = await geocodeCityState("Kent", "WA")

    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null when the lookup aborts on timeout", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError")
    )

    await expect(geocodeCityState("Boise", "ID")).resolves.toBeNull()
  })

  it("does NOT cache after a transient failure (timeout must not poison the cache)", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError")
    )

    await expect(geocodeCityState("Yakima", "WA")).resolves.toBeNull()

    expect(queryMock).not.toHaveBeenCalled()
  })

  it("caches a definitive not-found (empty result set) as null", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })

    await expect(geocodeCityState("Nowhere", "ZZ")).resolves.toBeNull()

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.geocode_cache"),
      ["nowhere,ZZ", null, null]
    )
  })

  it("does NOT cache on a non-2xx response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })

    await expect(geocodeCityState("Spokane", "WA")).resolves.toBeNull()

    expect(queryMock).not.toHaveBeenCalled()
  })
})
