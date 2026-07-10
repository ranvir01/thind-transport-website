import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { geocodeCityState } from "../geocode"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const originalFetch = global.fetch

describe("geocodeCityState", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([] as never)
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue(null as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns coordinates from Nominatim and passes an abort signal to fetch", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ lat: "47.38", lon: "-122.23" }]), { status: 200 })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await geocodeCityState("Kent", "WA")
    expect(result).toEqual({ lat: 47.38, lng: -122.23 })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null instead of throwing when the geocoder times out", async () => {
    // AbortSignal.timeout rejects the fetch with a TimeoutError DOMException.
    global.fetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError")
    }) as unknown as typeof fetch

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })

  it("serves a cache hit without calling the geocoder", async () => {
    queryOneMock.mockResolvedValue({ lat: 47.38, lng: -122.23 } as never)
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await geocodeCityState("Kent", "WA")
    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("caches a null result so a failed lookup is not retried on every call", async () => {
    global.fetch = vi.fn(async () => new Response("[]", { status: 200 })) as unknown as typeof fetch

    await expect(geocodeCityState("Nowhere", "ZZ")).resolves.toBeNull()

    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.geocode_cache"))
    expect(insert).toBeDefined()
    expect(insert?.[1]).toEqual(["nowhere,ZZ", null, null])
  })
})
