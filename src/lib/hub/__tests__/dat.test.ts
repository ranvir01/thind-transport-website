import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { datSource, normalizeDatPosting } from "../integrations/dat"

const queryMock = vi.mocked(query)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "33333333-3333-3333-3333-333333333333"

describe("normalizeDatPosting (pure — the one place the assumed search-result shape is read)", () => {
  it("maps the assumed DAT match shape into a DatLoadPosting", () => {
    const row = normalizeDatPosting({
      postingId: "DAT-9001",
      postedDateTime: "2026-07-01T12:00:00Z",
      origin: { city: "Kent", state: "WA" },
      destination: { city: "Boise", state: "ID" },
      equipmentType: "Van",
      tripMiles: 500,
      rateTotal: 1250,
      contactName: "Jane Broker",
      contactPhone: "555-0100",
    })
    expect(row).toEqual({
      external_id: "DAT-9001",
      postedAt: "2026-07-01T12:00:00Z",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      equipment: "Van",
      miles: 500,
      rateTotalCents: 125000,
      ratePerMileCents: 250,
      contactName: "Jane Broker",
      contactPhone: "555-0100",
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeDatPosting({ postingId: "DAT-1" })
    expect(row.external_id).toBe("DAT-1")
    expect(row.originCity).toBeNull()
    expect(row.destCity).toBeNull()
    expect(row.equipment).toBeNull()
    expect(row.miles).toBeNull()
    expect(row.rateTotalCents).toBeNull()
    expect(row.ratePerMileCents).toBeNull()
  })

  it("omits rate-per-mile when miles are unknown, instead of dividing by zero", () => {
    const row = normalizeDatPosting({ postingId: "DAT-2", rateTotal: 800 })
    expect(row.rateTotalCents).toBe(80000)
    expect(row.ratePerMileCents).toBeNull()
  })
})

describe("datSource (SyncSource<DatLoadPosting> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    queryMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = datSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })

  it("returns no rows when the carrier has no lane history to search yet", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "ops@carrier.com", password: "p" })
    queryMock.mockResolvedValue([])
    const source = datSource(CARRIER)
    await expect(source.pull()).resolves.toEqual([])
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("searches the carrier's top lane by margin and normalizes matches", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "ops@carrier.com", password: "p" })
    queryMock.mockResolvedValue([
      { origin_city: "Kent", origin_state: "WA", dest_city: "Boise", dest_state: "ID" },
    ])
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("originCity=Kent")
        expect(url).toContain("destState=ID")
        return {
          ok: true,
          json: async () => ({
            matches: [
              { postingId: "A", rateTotal: 1000, tripMiles: 500 },
              { postingId: "B", rateTotal: 900, tripMiles: 450 },
            ],
          }),
        }
      })
    )
    const source = datSource(CARRIER)
    const rows = await source.pull()
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "ops@carrier.com", password: "p" })
    queryMock.mockResolvedValue([
      { origin_city: "Kent", origin_state: "WA", dest_city: "Boise", dest_state: "ID" },
    ])
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ matches: [{ postingId: "A", rateTotal: 500 }] }) }))
    )
    const source = datSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "dat", await source.pull())
    const replay = sink.ingest(CARRIER, "dat", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK search response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "ops@carrier.com", password: "p" })
    queryMock.mockResolvedValue([
      { origin_city: "Kent", origin_state: "WA", dest_city: "Boise", dest_state: "ID" },
    ])
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429 })))
    const source = datSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/429/)
  })
})
