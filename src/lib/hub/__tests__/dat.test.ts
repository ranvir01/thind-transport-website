import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { getCredentials, hasCredentials } from "../credentials"
import { datSource, normalizeDatLoad } from "../integrations/dat"

const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "33333333-3333-3333-3333-333333333333"

describe("normalizeDatLoad (pure — the one place the assumed posting shape is read)", () => {
  it("maps the assumed DAT posting shape into a DatLoadRow", () => {
    const row = normalizeDatLoad({
      postingId: "DAT-9001",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      equipmentType: "Reefer",
      rateTotal: 1850.5,
      tripMiles: 490,
      postedAt: "2026-06-15T08:30:00Z",
    })
    expect(row).toEqual({
      external_id: "DAT-9001",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      equipmentType: "Reefer",
      rateTotalCents: 185050,
      miles: 490,
      postedAt: "2026-06-15T08:30:00Z",
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeDatLoad({ postingId: "DAT-1", originState: "WA" })
    expect(row.external_id).toBe("DAT-1")
    expect(row.originCity).toBeNull()
    expect(row.destCity).toBeNull()
    expect(row.destState).toBeNull()
    expect(row.equipmentType).toBeNull()
    expect(row.rateTotalCents).toBeNull()
    expect(row.miles).toBeNull()
  })
})

describe("datSource (LoadSource<DatLoadRow> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and search refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = datSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/not connected/)
  })

  it("searches and normalizes postings once credentials + the API both resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "svc@carrier.com", password: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          postings: [
            { postingId: "A", originState: "WA", destState: "ID", rateTotal: 1000, tripMiles: 200 },
            { postingId: "B", originState: "WA", destState: "OR", rateTotal: 800, tripMiles: 150 },
          ],
        }),
      }))
    )
    const source = datSource(CARRIER)
    const rows = await source.search({ originState: "WA" })
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("surfaces a non-OK search response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "svc@carrier.com", password: "p" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = datSource(CARRIER)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/503/)
  })
})
