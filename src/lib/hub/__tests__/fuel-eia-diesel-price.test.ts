/**
 * eiaDieselPriceCents (fuel.ts) had zero direct coverage: the env-var-unset
 * null short-circuit, the non-OK/exception fallbacks, and the value*100
 * cents rounding were all untested despite feeding the fuel-vs-market-price
 * comparison shown to owners.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { eiaDieselPriceCents } from "../fuel"

const ORIGINAL_KEY = process.env.EIA_API_KEY

beforeEach(() => {
  process.env.EIA_API_KEY = "test-key"
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.EIA_API_KEY
  else process.env.EIA_API_KEY = ORIGINAL_KEY
  vi.unstubAllGlobals()
})

describe("eiaDieselPriceCents", () => {
  it("returns null without calling fetch when EIA_API_KEY is unset", async () => {
    delete process.env.EIA_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(eiaDieselPriceCents()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("converts a dollars-per-gallon value to rounded cents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ response: { data: [{ value: "3.899" }] } }),
      }))
    )
    // 3.899 * 100 = 389.9 -> rounds away from zero to 390
    await expect(eiaDieselPriceCents()).resolves.toBe(390)
  })

  it("returns null when the response has no data rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ response: { data: [] } }) }))
    )
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null when the API responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null instead of throwing on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null instead of throwing when the response body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token")
        },
      }))
    )
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("includes the API key and series facet in the request URL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ response: { data: [{ value: "4" }] } }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    await eiaDieselPriceCents()

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("api_key=test-key")
    expect(url).toContain("EMD_EPD2D_PTE_NUS_DPG")
  })
})
