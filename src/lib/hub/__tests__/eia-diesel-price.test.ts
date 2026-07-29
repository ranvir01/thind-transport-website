/**
 * eiaDieselPriceCents (fuel.ts) had zero test coverage: the env-var-unset
 * short-circuit, a failed/thrown fetch, and the value*100 rounding into
 * cents were all unexercised.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { eiaDieselPriceCents } from "../fuel"

const ORIGINAL_KEY = process.env.EIA_API_KEY

afterEach(() => {
  vi.unstubAllGlobals()
  if (ORIGINAL_KEY === undefined) delete process.env.EIA_API_KEY
  else process.env.EIA_API_KEY = ORIGINAL_KEY
})

describe("eiaDieselPriceCents", () => {
  it("returns null without hitting the network when EIA_API_KEY is unset", async () => {
    delete process.env.EIA_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("converts a dollars-per-gallon value to rounded cents", async () => {
    process.env.EIA_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ response: { data: [{ value: 3.859 }] } }),
      }))
    )
    await expect(eiaDieselPriceCents()).resolves.toBe(386)
  })

  it("rounds half-away-from-zero at the exact .5-cent boundary", async () => {
    process.env.EIA_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ response: { data: [{ value: 3.865 }] } }),
      }))
    )
    await expect(eiaDieselPriceCents()).resolves.toBe(387)
  })

  it("returns null when the API responds non-OK", async () => {
    process.env.EIA_API_KEY = "test-key"
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null instead of throwing on network failure", async () => {
    process.env.EIA_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null when the response has no data rows", async () => {
    process.env.EIA_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ response: { data: [] } }) }))
    )
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("includes the API key in the request URL", async () => {
    process.env.EIA_API_KEY = "secret-123"
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ response: { data: [{ value: 4.0 }] } }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    await eiaDieselPriceCents()
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("api_key=secret-123")
  })
})
