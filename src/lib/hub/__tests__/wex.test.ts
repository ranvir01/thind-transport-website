import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { normalizeWexRecord, runWexSync, wexSource } from "../integrations/wex"

const queryMock = vi.mocked(query)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "22222222-2222-2222-2222-222222222222"

describe("normalizeWexRecord (pure — the one place the assumed feed shape is read)", () => {
  it("maps the assumed WEX transaction shape into a WexFuelRow", () => {
    const row = normalizeWexRecord({
      TransactionId: "WX-7001",
      TransactionDateTime: "2026-06-15T08:30:00Z",
      UnitNumber: "212",
      MerchantName: "Pilot #445",
      MerchantCity: "North Platte",
      MerchantState: "ne",
      Quantity: 87.6,
      PricePerGallon: 3.719,
      TotalAmount: 325.79,
      Odometer: 198430,
    })
    expect(row).toEqual({
      external_id: "WX-7001",
      ts: "2026-06-15T08:30:00Z",
      unitHint: "212",
      merchant: "Pilot #445",
      city: "North Platte",
      jurisdiction: "NE",
      gallons: 87.6,
      unitPriceCents: 372,
      totalCents: 32579,
      odometer: 198430,
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeWexRecord({ TransactionId: "WX-1" })
    expect(row.external_id).toBe("WX-1")
    expect(row.unitHint).toBeNull()
    expect(row.jurisdiction).toBeNull()
    expect(row.gallons).toBe(0)
    expect(row.unitPriceCents).toBeNull()
    expect(row.totalCents).toBe(0)
    expect(row.odometer).toBeNull()
  })
})

describe("wexSource (SyncSource<WexFuelRow> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = wexSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })

  it("pulls and normalizes rows once credentials + feed both resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          transactions: [
            { TransactionId: "A", TransactionDateTime: "2026-06-01T00:00:00Z", Quantity: 10, TotalAmount: 40 },
            { TransactionId: "B", TransactionDateTime: "2026-06-02T00:00:00Z", Quantity: 20, TotalAmount: 80 },
          ],
        }),
      }))
    )
    const source = wexSource(CARRIER)
    const rows = await source.pull()
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ transactions: [{ TransactionId: "A", Quantity: 5, TotalAmount: 20 }] }),
      }))
    )
    const source = wexSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "wex", await source.pull())
    const replay = sink.ingest(CARRIER, "wex", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK feed response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = wexSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/503/)
  })

  it("treats a feed response without a transactions array as an empty pull", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    const source = wexSource(CARRIER)
    await expect(source.pull()).resolves.toEqual([])
  })
})

describe("runWexSync", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    queryMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("short-circuits when the carrier hasn't connected WEX", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await expect(runWexSync(CARRIER)).resolves.toEqual({ connected: false })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("ingests matched + unmatched rows and reports unit hints it couldn't match", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          transactions: [
            { TransactionId: "A", UnitNumber: "212", Quantity: 10, TotalAmount: 40 },
            { TransactionId: "B", UnitNumber: "999", Quantity: 5, TotalAmount: 20 },
          ],
        }),
      }))
    )
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return [{ id: "truck-1", unit_number: "212" }]
      if (sql.includes("INSERT INTO hub.fuel_transactions")) return [{ id: "row-1" }]
      return []
    })
    const result = await runWexSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 2, skipped: 0, unmatched: ["999"] })
  })

  it("skips rows with no external id instead of inserting a blank transaction", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ transactions: [{ Quantity: 5, TotalAmount: 20 }] }),
      }))
    )
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return []
      return []
    })
    const result = await runWexSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 0, unmatched: [] })
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO hub.fuel_transactions"), expect.anything())
  })

  it("counts a replayed transaction as skipped and lands hintless rows with truck_id NULL", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ transactions: [{ TransactionId: "WX-1", Quantity: 10, TotalAmount: 40 }] }),
      }))
    )
    // ON CONFLICT DO NOTHING returns no row for a duplicate — the [] default
    queryMock.mockResolvedValue([])
    const result = await runWexSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 1, unmatched: [] })
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.fuel_transactions"))
    expect(insert?.[1]?.[2]).toBeNull()
  })
})
