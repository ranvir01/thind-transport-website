import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { isEventOutcomeFinal } from "../integrations/webhooks"
import { efsSource, normalizeEfsRecord, processEfsEvent, runEfsSync } from "../integrations/efs"
import { parseFuelFeedCsv } from "../integrations/fuel-feed-csv"

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

  it("falls back to an empty external id when TransactionId is absent (ingest layer rejects it)", () => {
    expect(normalizeEfsRecord({}).external_id).toBe("")
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

  it("treats a feed response without a transactions array as an empty pull", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    const source = efsSource(CARRIER)
    await expect(source.pull()).resolves.toEqual([])
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

  it("counts a replayed transaction as skipped and lands hintless rows with truck_id NULL", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ feedUser: "u", feedPassword: "p" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ transactions: [{ TransactionId: "A", Quantity: 10, TotalAmount: 40 }] }),
      }))
    )
    // ON CONFLICT DO NOTHING returns no row for a duplicate — the [] default
    queryMock.mockResolvedValue([])
    const result = await runEfsSync(CARRIER)
    expect(result).toEqual({ connected: true, imported: 0, skipped: 1, unmatched: [] })
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.fuel_transactions"))
    expect(insert?.[1]?.[2]).toBeNull()
  })
})

describe("parseFuelFeedCsv (pure — daily feed file → assumed record shape, shared by EFS + WEX)", () => {
  it("passes through the assumed header names unchanged", () => {
    const records = parseFuelFeedCsv(
      "TransactionId,TransactionDateTime,UnitNumber,MerchantName,MerchantCity,MerchantState,Quantity,PricePerGallon,TotalAmount,Odometer\n" +
        'TXN-1,2026-06-01T12:00:00Z,104,"Flying J #221, I-80",Laramie,WY,112.4,3.899,438.22,245102\n'
    )
    expect(records).toHaveLength(1)
    const row = normalizeEfsRecord(records[0])
    expect(row.external_id).toBe("TXN-1")
    expect(row.unitHint).toBe("104")
    expect(row.merchant).toBe("Flying J #221, I-80")
    expect(row.jurisdiction).toBe("WY")
    expect(row.gallons).toBe(112.4)
    expect(row.unitPriceCents).toBe(390)
    expect(row.totalCents).toBe(43822)
    expect(row.odometer).toBe(245102)
  })

  it("maps variant headers (spacing, casing, synonyms) onto the same keys", () => {
    const records = parseFuelFeedCsv(
      "Transaction Number,Tran Date,Truck #,Merchant,City,State,Gallons,Unit Price,Total,Odometer Reading\n" +
        "9001,2026-06-02,88,Pilot 442,Ogden,UT,95.1,$3.75,$356.63,188002\n"
    )
    const row = normalizeEfsRecord(records[0])
    expect(row.external_id).toBe("9001")
    expect(row.ts).toBe("2026-06-02")
    expect(row.unitHint).toBe("88")
    expect(row.merchant).toBe("Pilot 442")
    expect(row.city).toBe("Ogden")
    expect(row.jurisdiction).toBe("UT")
    expect(row.gallons).toBe(95.1)
    expect(row.unitPriceCents).toBe(375)
    expect(row.totalCents).toBe(35663)
    expect(row.odometer).toBe(188002)
  })

  it("keeps unrecognized columns under their original header so raw loses nothing", () => {
    const records = parseFuelFeedCsv("TransactionId,DriverPin\nTXN-2,4471\n")
    expect(records[0].DriverPin).toBe("4471")
  })

  it("skips blank lines and returns [] for an empty or header-only file", () => {
    expect(parseFuelFeedCsv("")).toEqual([])
    expect(parseFuelFeedCsv("TransactionId,Gallons\n")).toEqual([])
    expect(parseFuelFeedCsv("TransactionId,Gallons\nTXN-1,10\n,\nTXN-2,20\n")).toHaveLength(2)
  })

  it("drops a non-numeric odometer instead of passing a string the normalizers would discard", () => {
    const records = parseFuelFeedCsv("TransactionId,Odometer\nTXN-1,n/a\n")
    expect(records[0].Odometer).toBeUndefined()
  })
})

describe("processEfsEvent (file-drop webhook processor)", () => {
  beforeEach(() => {
    queryMock.mockReset()
  })
  const event = (payload: Record<string, unknown>, kind: string | null = "fuel.batch") => ({
    external_id: "drop-1", kind, payload,
  })

  it("refuses unknown event kinds with a FINAL outcome (never stuck pending)", async () => {
    const outcome = await processEfsEvent(CARRIER, event({ csv: "x" }, "position.updated"))
    expect(outcome).toEqual({ applied: false, reason: "unhandled event kind: position.updated" })
    expect(isEventOutcomeFinal(outcome)).toBe(true)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("reports an empty payload as a non-final miss, storing nothing", async () => {
    const outcome = await processEfsEvent(CARRIER, event({}))
    expect(outcome).toEqual({ applied: false, reason: "no fuel rows in payload" })
    expect(isEventOutcomeFinal(outcome)).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("refuses rows with no transaction id rather than colliding them on an empty key", async () => {
    const outcome = await processEfsEvent(CARRIER, event({ csv: "Gallons,Total\n10,40\n20,80\n" }))
    expect(outcome).toEqual({ applied: false, invalid: 2, reason: "rows missing transaction ids" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("ingests a CSV drop through the same idempotent path as the cron sync", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return [{ id: "truck-1", unit_number: "104" }]
      if (sql.includes("INSERT INTO hub.fuel_transactions")) return [{ id: "row-1" }]
      return []
    })
    const csv =
      "TransactionId,UnitNumber,Quantity,TotalAmount\nTXN-1,104,10,40\nTXN-2,999,5,20\n"
    const outcome = await processEfsEvent(CARRIER, event({ csv }))
    expect(outcome).toEqual({ applied: true, imported: 2, skipped: 0, unmatched: ["999"] })
    expect(isEventOutcomeFinal(outcome)).toBe(true)
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.fuel_transactions"))
    expect(insert?.[1]?.[2]).toBe("truck-1")
  })

  it("accepts pre-parsed transactions arrays and counts replays as skipped", async () => {
    // ON CONFLICT DO NOTHING returns no row for a duplicate
    queryMock.mockResolvedValue([])
    const outcome = await processEfsEvent(
      CARRIER,
      event({ transactions: [{ TransactionId: "TXN-1", Quantity: 10, TotalAmount: 40 }] })
    )
    expect(outcome).toEqual({ applied: true, imported: 0, skipped: 1, unmatched: [] })
  })

  it("still applies partial batches, reporting the id-less rows it refused", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.fuel_transactions")) return [{ id: "row-1" }]
      return []
    })
    const csv = "TransactionId,Quantity,TotalAmount\nTXN-1,10,40\n,5,20\n"
    const outcome = await processEfsEvent(CARRIER, event({ csv }))
    expect(outcome).toEqual({ applied: true, imported: 1, skipped: 0, unmatched: [], invalid: 1 })
  })
})
