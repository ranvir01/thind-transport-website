import { afterEach, describe, expect, it, vi } from "vitest"
import { getActiveAlerts } from "../weather"

afterEach(() => {
  vi.unstubAllGlobals()
})

function alertFeature(severity: string, event = "Tornado Warning", headline = "Tornado warning issued") {
  return { properties: { event, severity, headline } }
}

describe("getActiveAlerts (NWS point alerts)", () => {
  it("keeps only Severe/Extreme alerts, dropping lower severities", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          features: [alertFeature("Extreme"), alertFeature("Severe"), alertFeature("Minor"), alertFeature("Moderate")],
        }),
      }))
    )
    const alerts = await getActiveAlerts(47.0, -122.0)
    expect(alerts).toHaveLength(2)
    expect(alerts.map((a) => a.severity)).toEqual(["Extreme", "Severe"])
  })

  it("caps results at 3 even when more severe alerts are active", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ features: Array.from({ length: 5 }, () => alertFeature("Severe")) }),
      }))
    )
    await expect(getActiveAlerts(47.0, -122.0)).resolves.toHaveLength(3)
  })

  it("defaults missing event/headline text but keeps severity Severe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ features: [{ properties: { severity: "Severe" } }] }) }))
    )
    const [alert] = await getActiveAlerts(47.0, -122.0)
    expect(alert).toEqual({ event: "Weather alert", severity: "Severe", headline: "" })
  })

  it("returns an empty list when the API responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    await expect(getActiveAlerts(47.0, -122.0)).resolves.toEqual([])
  })

  it("returns an empty list instead of throwing on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    await expect(getActiveAlerts(47.0, -122.0)).resolves.toEqual([])
  })

  it("returns an empty list when the response has no features array", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    await expect(getActiveAlerts(47.0, -122.0)).resolves.toEqual([])
  })

  it("formats lat/lng to 4 decimal places in the query", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ features: [] }) }))
    vi.stubGlobal("fetch", fetchMock)
    await getActiveAlerts(47.123456, -122.987654)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("point=47.1235,-122.9877")
  })
})
