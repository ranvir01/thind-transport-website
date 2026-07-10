import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { queryOne } from "../db"
import { geocodeCityState } from "../geocode"

const queryOneMock = vi.mocked(queryOne)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("geocodeCityState", () => {
  it("passes an abort signal so a hung geocoder cannot stall load booking", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.38", lon: "-122.23" }],
    })

    const result = await geocodeCityState("Kent", "WA")

    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null when the lookup times out instead of throwing", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))

    await expect(geocodeCityState("Kent", "WA")).resolves.toBeNull()
  })

  it("serves cached coordinates without hitting the network", async () => {
    queryOneMock.mockResolvedValue({ lat: 47.38, lng: -122.23 })

    const result = await geocodeCityState("Kent", "WA")

    expect(result).toEqual({ lat: 47.38, lng: -122.23 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
