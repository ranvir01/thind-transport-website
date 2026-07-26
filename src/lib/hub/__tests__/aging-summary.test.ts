/**
 * getAgingSummary (invoices.ts:309) was 0% covered (TEST_GAPS.md §2 item 8).
 * It feeds both the /hub/money AR page and runOverdueReminders' input, and
 * its open_cents math (`amount_cents - (paid_cents ?? 0)`) is what decides
 * which aging bucket — and therefore whether a customer gets chased — an
 * invoice lands in. A partially-paid invoice mis-bucketing means chasing
 * money already collected, or not chasing a real balance.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { getAgingSummary } from "../invoices"
import type { Invoice } from "../types"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function daysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: "inv", carrier_id: CARRIER, number: "THD-1", customer_id: "cust", load_id: "load",
    amount_cents: 100000, issued_on: daysAgo(40), due_on: daysAgo(10), status: "sent",
    factored: false, remit_to: null, pdf_url: null, sent_log: [], paid_cents: 0,
    ...overrides,
  }
}

beforeEach(() => {
  queryMock.mockReset()
})

describe("getAgingSummary", () => {
  it("scopes by carrier_id and excludes paid invoices at the SQL level", async () => {
    queryMock.mockResolvedValue([])
    await getAgingSummary(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("i.carrier_id = $1")
    expect(String(sql)).toContain("i.status NOT IN ('paid')")
    expect(params).toEqual([CARRIER])
  })

  it("buckets an unpaid, a half-paid and an over-paid invoice by open_cents, and totals correctly", async () => {
    const unpaid = invoice({ id: "unpaid", amount_cents: 100000, paid_cents: 0, due_on: daysAgo(10) }) // 1-30 bucket
    const halfPaid = invoice({ id: "half", amount_cents: 50000, paid_cents: 20000, due_on: daysAgo(45) }) // 31-60 bucket
    const overPaid = invoice({ id: "over", amount_cents: 30000, paid_cents: 30000, due_on: daysAgo(5) }) // 1-30 bucket, $0 open
    queryMock.mockResolvedValue([unpaid, halfPaid, overPaid])

    const result = await getAgingSummary(CARRIER)

    expect(result.invoices.find((i) => i.id === "unpaid")).toMatchObject({ bucket: "1-30", open_cents: 100000 })
    expect(result.invoices.find((i) => i.id === "half")).toMatchObject({ bucket: "31-60", open_cents: 30000 })
    expect(result.invoices.find((i) => i.id === "over")).toMatchObject({ bucket: "1-30", open_cents: 0 })

    expect(result.buckets["1-30"]).toBe(100000)
    expect(result.buckets["31-60"]).toBe(30000)
    expect(result.totalOpenCents).toBe(130000)
  })

  it("treats a missing paid_cents as fully unpaid, not a NaN bucket", async () => {
    const noPaidField = invoice({ id: "no-paid-field", amount_cents: 42000, paid_cents: undefined, due_on: daysAgo(1) })
    queryMock.mockResolvedValue([noPaidField])

    const result = await getAgingSummary(CARRIER)

    expect(result.invoices[0].open_cents).toBe(42000)
    expect(result.totalOpenCents).toBe(42000)
  })
})
