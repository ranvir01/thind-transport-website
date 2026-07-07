import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { comdataSource, normalizeComdataRow, runComdataSync } from "../integrations/comdata"

const queryMock = vi.mocked(query)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "33333333-3333-3333-3333-333333333333"

describe("Comdata feed row normalization", () => {
  it("maps the documented feed shape into cents-based, carrier-schema fields", () => {
    const row = normalizeComdataRow({
      transactionId: "CD-5001",
      postedDate: "2026-07-02T09:15:00Z",
      truckNumber: "T-220",
      merchant: "Loves #88",
      city: "Cheyenne",
      state: "wy",
      quantity: 98.2,
      unitPrice: 3.649,
      amount: 358.35,
      odometer: 301220,
    })
    expect(row).toEqual({
      external_id: "CD-5001",
      ts: "2026-07-02T09:15:00Z",
      unitHint: "T-220",
      merchant: "Loves #88",
      city: "Cheyenne",
      jurisdiction: "WY",
      gallons: 98.2,
      unitPriceCents: 365,
      totalCents: 35835,
      odometer: 301220,
    })
  })

  it("falls back safely when optional fields are missing or malformed", () => {
    const row = normalizeComdataRow({ id: "CD-1", amount: "not-a-number" })
    expect(row.external_id).toBe("CD-1")
    expect(row.unitHint).toBeNull()
    expect(row.jurisdiction).toBeNull()
    expect(row.gallons).toBe(0)
    expect(row.unitPriceCents).toBeNull()
    expect(row.totalCents).toBe(0)
    expect(row.odometer).toBeNull()
  })

  it("prefers unitId when truckNumber is absent", () => {
    const row = normalizeComdataRow({ transactionId: "CD-2", unitId: "U-9" })
    expect(row.unitHint).toBe("U-9")
  })
})

describe("comdataSource (SyncSource<ComdataTransaction> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = comdataSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })

  it("pulls and normalizes rows once credentials + feed both resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k", apiSecret: "s" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          transactions: [
            { transactionId: "A", postedDate: "2026-06-01T00:00:00Z", quantity: 10, amount: 40 },
            { transactionId: "B", postedDate: "2026-06-02T00:00:00Z", quantity: 20, amount: 80 },
          ],
        }),
      }))
    )
    const source = comdataSource(CARRIER)
    const rows = await source.pull()
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("sends the Api-Key/Api-Secret headers the registry's credential fields promise", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k-1", apiSecret: "s-1" })
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ transactions: [] }) }))
    vi.stubGlobal("fetch", fetchMock)
    await comdataSource(CARRIER).pull()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/transactions"),
      expect.objectContaining({ headers: { "Api-Key": "k-1", "Api-Secret": "s-1" } })
    )
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k", apiSecret: "s" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ transactions: [{ transactionId: "A", quantity: 5, amount: 20 }] }),
      }))
    )
    const source = comdataSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "comdata", await source.pull())
    const replay = sink.ingest(CARRIER, "comdata", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK feed response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k", apiSecret: "s" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = comdataSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/503/)
  })
})

describe("runComdataSync", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    queryMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("short-circuits when the carrier hasn't connected Comdata", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await expect(runComdataSync(CARRIER)).resolves.toEqual({ connected: false })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("ingests matched + unmatched rows and reports unit hints it couldn't match", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k", apiSecret: "s" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          transactions: [
            { transactionId: "A", truckNumber: "220", quantity: 10, amount: 40 },
            { transactionId: "B", truckNumber: "999", quantity: 5, amount: 20 },
          ],
        }),
      }))
    )
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return [{ id: "truck-1", unit_number: "220" }]
      if (sql.includes("INSERT INTO hub.fuel_transactions")) return [{ id: "row-1" }]
      return []
    })
    const result = await runComdataSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 2, skipped: 0, unmatched: ["999"] })
  })

  it("skips rows with no external id or non-positive amount instead of inserting a blank transaction", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "k", apiSecret: "s" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          transactions: [{ quantity: 5, amount: 20 }, { transactionId: "C", quantity: 1, amount: 0 }],
        }),
      }))
    )
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return []
      return []
    })
    const result = await runComdataSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: [] })
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO hub.fuel_transactions"), expect.anything())
  })
})
