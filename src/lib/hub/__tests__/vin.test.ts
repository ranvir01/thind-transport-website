import { afterEach, describe, expect, it, vi } from "vitest"
import { decodeVin } from "../vin"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("decodeVin (NHTSA vPIC)", () => {
  it("maps a decoded row to year/make/model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          Results: [{ ModelYear: "2019", Make: "FREIGHTLINER", Model: "CASCADIA" }],
        }),
      }))
    )
    await expect(decodeVin("1FUJGLDR8CLBP1234")).resolves.toEqual({
      year: 2019,
      make: "FREIGHTLINER",
      model: "CASCADIA",
    })
  })

  it("nulls out fields vPIC left blank instead of guessing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ Results: [{ ModelYear: "0", Make: "", Model: "" }] }),
      }))
    )
    await expect(decodeVin("BADVIN")).resolves.toEqual({ year: null, make: null, model: null })
  })

  it("returns null when the API responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    await expect(decodeVin("1FUJGLDR8CLBP1234")).resolves.toBeNull()
  })

  it("returns null when the API returns no Results row", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ Results: [] }) })))
    await expect(decodeVin("1FUJGLDR8CLBP1234")).resolves.toBeNull()
  })

  it("returns null instead of throwing on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    await expect(decodeVin("1FUJGLDR8CLBP1234")).resolves.toBeNull()
  })

  it("URL-encodes the VIN into the vPIC path", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ Results: [] }) }))
    vi.stubGlobal("fetch", fetchMock)
    await decodeVin("VIN WITH SPACE")
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain(encodeURIComponent("VIN WITH SPACE"))
  })
})
