import { afterEach, describe, expect, it, vi } from "vitest"
import { getActiveAlerts } from "../weather"

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

describe("getActiveAlerts", () => {
  it("keeps only Severe/Extreme alerts, capped at 3", async () => {
    mockFetchOnce({
      features: [
        { properties: { event: "Winter Storm Warning", severity: "Severe", headline: "A" } },
        { properties: { event: "Flood Advisory", severity: "Minor", headline: "B" } },
        { properties: { event: "Tornado Warning", severity: "Extreme", headline: "C" } },
        { properties: { event: "High Wind Warning", severity: "Severe", headline: "D" } },
        { properties: { event: "Ice Storm Warning", severity: "Extreme", headline: "E" } },
      ],
    })
    const alerts = await getActiveAlerts(47.6062, -122.3321)
    expect(alerts).toHaveLength(3)
    expect(alerts.map((a) => a.event)).toEqual([
      "Winter Storm Warning",
      "Tornado Warning",
      "High Wind Warning",
    ])
  })

  it("requests the NWS endpoint with the point and a User-Agent header", async () => {
    const fetchMock = mockFetchOnce({ features: [] })
    await getActiveAlerts(47.60618, -122.33207)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.weather.gov/alerts/active?point=47.6062,-122.3321",
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.any(String) }) })
    )
  })

  it("defaults missing event/severity/headline fields", async () => {
    mockFetchOnce({ features: [{ properties: { severity: "Extreme" } }] })
    expect(await getActiveAlerts(0, 0)).toEqual([
      { event: "Weather alert", severity: "Extreme", headline: "" },
    ])
  })

  it("returns an empty list when there are no features", async () => {
    mockFetchOnce({})
    expect(await getActiveAlerts(0, 0)).toEqual([])
  })

  it("returns an empty list on a non-ok response", async () => {
    mockFetchOnce({}, { ok: false })
    expect(await getActiveAlerts(0, 0)).toEqual([])
  })

  it("returns an empty list instead of throwing when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    expect(await getActiveAlerts(0, 0)).toEqual([])
  })
})
