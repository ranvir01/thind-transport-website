/**
 * eiaDieselPriceCents (fuel.ts) had zero coverage: the env-var-unset null
 * path (never calls fetch), the fetch-failure/non-OK paths, and the
 * value*100 half-away-from-zero rounding into cents were all unverified.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { eiaDieselPriceCents } from "../fuel"

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("eiaDieselPriceCents", () => {
  it("returns null without calling fetch when EIA_API_KEY is unset", async () => {
    vi.stubEnv("EIA_API_KEY", "")
    const result = await eiaDieselPriceCents()
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns null on a non-OK response", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key")
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null instead of throwing on network failure", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key")
    vi.mocked(fetch).mockRejectedValue(new Error("network down"))
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("returns null when the response has no data value", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key")
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ response: { data: [] } }),
    } as Response)
    await expect(eiaDieselPriceCents()).resolves.toBeNull()
  })

  it("converts dollars/gal to cents, rounding half away from zero", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key")
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ response: { data: [{ value: 3.859 }] } }),
    } as Response)
    // 3.859 * 100 = 385.9 -> rounds to 386
    await expect(eiaDieselPriceCents()).resolves.toBe(386)
  })

  it("includes the API key in the request URL", async () => {
    vi.stubEnv("EIA_API_KEY", "shh-secret")
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ response: { data: [{ value: 4 }] } }),
    } as Response)
    await eiaDieselPriceCents()
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("api_key=shh-secret")
    expect(url).toContain("frequency=weekly")
  })
})
