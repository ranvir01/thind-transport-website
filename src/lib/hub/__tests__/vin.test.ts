import { afterEach, describe, expect, it, vi } from "vitest"
import { decodeVin } from "../vin"

function mockFetchOnce(body: unknown, init?: { ok?: boolean }) {
  const fn = vi.fn(async () => ({
    ok: init?.ok ?? true,
    json: async () => body,
  }))
  vi.stubGlobal("fetch", fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("decodeVin", () => {
  it("parses year/make/model from the first result row", async () => {
    mockFetchOnce({
      Results: [{ ModelYear: "2019", Make: "FREIGHTLINER", Model: "Cascadia" }],
    })
    expect(await decodeVin("1FUJGLDR8CLBP1234")).toEqual({
      year: 2019,
      make: "FREIGHTLINER",
      model: "Cascadia",
    })
  })

  it("requests the NHTSA vPIC endpoint with the encoded VIN", async () => {
    const fetchMock = mockFetchOnce({ Results: [{ ModelYear: "2020", Make: "Kenworth", Model: "T680" }] })
    await decodeVin("1XKAD49X7KJ123456")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1XKAD49X7KJ123456?format=json",
      expect.anything()
    )
  })

  it("nulls out a non-numeric or implausible model year", async () => {
    mockFetchOnce({ Results: [{ ModelYear: "", Make: "Volvo", Model: "VNL" }] })
    expect((await decodeVin("VIN1"))?.year).toBeNull()

    mockFetchOnce({ Results: [{ ModelYear: "1899", Make: "Volvo", Model: "VNL" }] })
    expect((await decodeVin("VIN2"))?.year).toBeNull()
  })

  it("nulls out missing make/model fields", async () => {
    mockFetchOnce({ Results: [{ ModelYear: "2021" }] })
    expect(await decodeVin("VIN3")).toEqual({ year: 2021, make: null, model: null })
  })

  it("returns null when the Results array is empty", async () => {
    mockFetchOnce({ Results: [] })
    expect(await decodeVin("BADVIN")).toBeNull()
  })

  it("returns null on a non-ok response", async () => {
    mockFetchOnce({}, { ok: false })
    expect(await decodeVin("BADVIN")).toBeNull()
  })

  it("returns null instead of throwing when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    expect(await decodeVin("VIN")).toBeNull()
  })

  it("returns null instead of throwing on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad json")
        },
      }))
    )
    expect(await decodeVin("VIN")).toBeNull()
  })
})
