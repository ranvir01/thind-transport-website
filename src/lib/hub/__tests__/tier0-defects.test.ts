/**
 * Implementation brief §0.1, §0.3, §0.4, §0.5 — four defects that all share a
 * shape: something fails or drifts silently, in a path nobody watches.
 *
 * Each case here fails if its guard is reverted. That is the whole point;
 * these are not descriptions of the code, they are the alarms.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const { queryOneMock, queryMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(async () => null as unknown),
  queryMock: vi.fn(async () => [] as unknown[]),
}))
vi.mock("../db", () => ({ queryOne: queryOneMock, query: queryMock, hubDb: vi.fn() }))

import { hasCredentials } from "../credentials"
import { normalizeEfsRecord, ingestEfsRows } from "../integrations/efs"
import { centsToDecimalString } from "../types"

const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("§0.1 hasCredentials honors credentialsConfigured()", () => {
  const realKey = process.env.CREDENTIALS_KEY

  beforeEach(() => {
    queryOneMock.mockReset().mockResolvedValue({ id: "cred-1" })
  })
  afterAll(() => {
    if (realKey === undefined) delete process.env.CREDENTIALS_KEY
    else process.env.CREDENTIALS_KEY = realKey
  })

  it("returns false when the key is unset, even though the row still exists", async () => {
    // The failure this prevents: rotate or drop CREDENTIALS_KEY and every
    // adapter's connected() keeps reporting true while pull() throws
    // "not connected" on every cron run, forever, with no alert.
    delete process.env.CREDENTIALS_KEY
    expect(await hasCredentials(CARRIER, "terminal")).toBe(false)
  })

  it("does not even query when the key is unset — the row is unreadable either way", async () => {
    delete process.env.CREDENTIALS_KEY
    await hasCredentials(CARRIER, "terminal")
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("still reports true when the key is set and a row exists", async () => {
    process.env.CREDENTIALS_KEY = "x".repeat(32)
    expect(await hasCredentials(CARRIER, "terminal")).toBe(true)
  })
})

describe("§0.3 EFS normalizes jurisdiction like WEX and Comdata already do", () => {
  // EFS is the card actually in use, and raw values flow into IFTA
  // jurisdiction miles — "Wash." and "WA" filed as different states.
  const cases: [string, string | null][] = [
    ["Wash.", "WA"],
    ["Washington", "WA"],
    [" wa ", "WA"],
    ["Minnesota", "MN"],
    ["N.H.", "NH"],
    ["OR", "OR"],
  ]

  it.each(cases)("MerchantState %s → %s", (input, expected) => {
    const row = normalizeEfsRecord({ TransactionId: "t1", MerchantState: input })
    expect(row.jurisdiction).toBe(expected)
  })

  it("leaves a missing state null rather than guessing", () => {
    expect(normalizeEfsRecord({ TransactionId: "t1" }).jurisdiction).toBeNull()
    expect(normalizeEfsRecord({ TransactionId: "t1", MerchantState: "" }).jurisdiction).toBeNull()
  })
})

describe("§0.4 EFS skips rows with an empty external_id", () => {
  beforeEach(() => {
    // The truck lookup comes first and expects unit_number rows; only the
    // INSERT should answer with an id.
    queryMock.mockReset().mockImplementation(async (sql: string) =>
      String(sql).includes("hub.trucks") ? [] : [{ id: "row-1" }]
    )
  })

  it("never sends a blank-keyed row to the unique index", async () => {
    // Without the guard these collide on
    // fuel_transactions_carrier_id_source_external_id_key, land in `skipped`,
    // and a real fuel purchase disappears with no explanation.
    const rows = [
      { external_id: "", ts: "2026-01-01", unitHint: null, merchant: null, city: null, jurisdiction: null, gallons: 50, unitPriceCents: 400, totalCents: 20000, odometer: null, raw: {} },
      { external_id: "efs-2", ts: "2026-01-01", unitHint: null, merchant: null, city: null, jurisdiction: null, gallons: 60, unitPriceCents: 400, totalCents: 24000, odometer: null, raw: {} },
    ]
    const result = await ingestEfsRows(CARRIER, rows as never)

    const inserts = queryMock.mock.calls.filter(([sql]) =>
      String(sql).includes("INSERT INTO hub.fuel_transactions")
    )
    expect(inserts).toHaveLength(1)
    expect((inserts[0][1] as unknown[])[1]).toBe("efs-2")
    expect(result.imported).toBe(1)
  })
})

describe("§0.5 money leaves the building as a string, not a float", () => {
  it("formats cents without dividing", () => {
    expect(centsToDecimalString(244690)).toBe("2446.90")
    expect(centsToDecimalString(100)).toBe("1.00")
    expect(centsToDecimalString(5)).toBe("0.05")
    expect(centsToDecimalString(0)).toBe("0.00")
    expect(centsToDecimalString(null)).toBe("0.00")
    expect(centsToDecimalString(undefined)).toBe("0.00")
  })

  it("handles negatives (a credit memo) without losing the sign or the pad", () => {
    expect(centsToDecimalString(-2500)).toBe("-25.00")
    expect(centsToDecimalString(-5)).toBe("-0.05")
  })

  it("survives the values where dividing by 100 visibly drifts", () => {
    // These are the classic float artifacts: 0.1+0.2 territory. A string
    // formatter cannot produce 2446.8999999999996.
    for (const cents of [70, 290, 1_010, 244_690, 1_000_000_01, 8_250_00]) {
      expect(centsToDecimalString(cents)).toMatch(/^\d+\.\d{2}$/)
      expect(Number(centsToDecimalString(cents))).toBeCloseTo(cents / 100, 10)
    }
  })

  it("is exact where the float path is not", () => {
    const cents = 1_000_000_000_05 % 1_000_000_000 // 5 cents past a big round number
    expect(centsToDecimalString(cents).endsWith(".05")).toBe(true)
  })
})
