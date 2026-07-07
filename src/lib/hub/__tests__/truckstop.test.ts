import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { normalizeTruckstopPosting, truckstopSource } from "../integrations/truckstop"

const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("normalizeTruckstopPosting (pure — the one place the assumed posting shape is read)", () => {
  it("maps the assumed Truckstop.com posting shape into a TruckstopLoadPosting", () => {
    const row = normalizeTruckstopPosting({
      postingId: "POST-1",
      postedDate: "2026-06-01T12:00:00Z",
      equipment: "Van",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      miles: 420,
      totalRate: 1250.5,
      pickupDate: "2026-06-02",
      contactPhone: "555-0100",
    })
    expect(row).toEqual({
      external_id: "POST-1",
      postedAt: "2026-06-01T12:00:00Z",
      equipment: "Van",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      miles: 420,
      rateTotalCents: 125050,
      pickupDate: "2026-06-02",
      contactPhone: "555-0100",
      raw: expect.any(Object),
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeTruckstopPosting({ postingId: "POST-2" })
    expect(row.external_id).toBe("POST-2")
    expect(row.equipment).toBeNull()
    expect(row.miles).toBeNull()
    expect(row.rateTotalCents).toBeNull()
  })
})

describe("truckstopSource (SyncSource<TruckstopLoadPosting> + search contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull/search refuse instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = truckstopSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/not connected/)
  })

  it("searches and normalizes postings once credentials resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key-123" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          postings: [
            { postingId: "A", originState: "WA", destState: "ID", miles: 400 },
            { postingId: "B", originState: "WA", destState: "OR", miles: 180 },
          ],
        }),
      }))
    )
    const source = truckstopSource(CARRIER)
    const rows = await source.search({ originState: "WA", equipment: "Van" })
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("carries the search criteria into the query string", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key-123" })
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ postings: [] }) }))
    vi.stubGlobal("fetch", fetchMock)
    const source = truckstopSource(CARRIER)
    await source.search({ originCity: "Kent", originState: "WA", destState: "ID", equipment: "Reefer", radiusMiles: 50 })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("originCity=Kent")
    expect(url).toContain("originState=WA")
    expect(url).toContain("destState=ID")
    expect(url).toContain("equipment=Reefer")
    expect(url).toContain("radiusMiles=50")
  })

  it("sends the API key as a bearer token", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key-123" })
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ postings: [] }) }))
    vi.stubGlobal("fetch", fetchMock)
    const source = truckstopSource(CARRIER)
    await source.search({})
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key-123")
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key-123" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ postings: [{ postingId: "A", miles: 100 }] }) }))
    )
    const source = truckstopSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "truckstop", await source.pull())
    const replay = sink.ingest(CARRIER, "truckstop", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK search response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "key-123" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = truckstopSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/503/)
  })
})
