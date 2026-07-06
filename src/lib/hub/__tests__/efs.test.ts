import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { efsSource, normalizeEfsRecord, runEfsSync } from "../integrations/efs"

const queryMock = vi.mocked(query)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("normalizeEfsRecord (pure — the one place the assumed feed shape is read)", () => {
  it("maps the assumed EFS transaction shape into an EfsFuelRow", () => {
    const row = normalizeEfsRecord({
      TransactionId: "TXN-9001",
      TransactionDateTime: "2026-06-01T12:00:00Z",
      UnitNumber: "104",
      MerchantName: "Flying J #221",
      MerchantCity: "Laramie",
      MerchantState: "WY",
      Quantity: 112.4,
      PricePerGallon: 3.899,
      TotalAmount: 438.22,
      Odometer: 245102,
    })
    expect(row).toEqual({
      external_id: "TXN-9001",
      ts: "2026-06-01T12:00:00Z",
      unitHint: "104",
      merchant: "Flying J #221",
      city: "Laramie",
      jurisdiction: "WY",
      gallons: 112.4,
      unitPriceCents: 390,
      totalCents: 43822,
      odometer: 245102,
      raw: expect.any(Object),
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeEfsRecord({ TransactionId: "TXN-1" })
    expect(row.external_id).toBe("TXN-1")
    expect(row.unitHint).toBeNull()
    expect(row.gallons).toBe(0)
    expect(row.unitPriceCents).toBeNull()
    expect(row.totalCents).toBe(0)
    expect(row.odometer).toBeNull()
  })
})

describe("efsSource (SyncSource<EfsFuelRow> contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull refuses instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = efsSource(CARRIER)
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
    const source = efsSource(CARRIER)
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
    const source = efsSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "efs", await source.pull())
    const replay = sink.ingest(CARRIER, "efs", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK feed response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = efsSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/503/)
  })
})

describe("runEfsSync", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    queryMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("short-circuits when the carrier hasn't connected EFS", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await expect(runEfsSync(CARRIER)).resolves.toEqual({ connected: false })
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
            { TransactionId: "A", UnitNumber: "104", Quantity: 10, TotalAmount: 40 },
            { TransactionId: "B", UnitNumber: "999", Quantity: 5, TotalAmount: 20 },
          ],
        }),
      }))
    )
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return [{ id: "truck-1", unit_number: "104" }]
      if (sql.includes("INSERT INTO hub.fuel_transactions")) return [{ id: "row-1" }]
      return []
    })
    const result = await runEfsSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 2, skipped: 0, unmatched: ["999"] })
  })
})
