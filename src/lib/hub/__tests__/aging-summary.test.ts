/**
 * TEST_GAPS.md #8: getAgingSummary was 0% covered. It feeds both the AR page
 * and runOverdueReminders' invoice list. openCents = amount_cents -
 * (paid_cents ?? 0) at invoices.ts:319, bucketed by due_on vs "now". A wrong
 * bucket or open_cents means the owner chases money already collected, or
 * misses money that's actually open.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { getAgingSummary } from "../invoices"

const queryMock = vi.mocked(query)
const CARRIER = "11111111-1111-1111-1111-111111111111"

const daysAgo = (n: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function invoiceRow(overrides: Record<string, unknown>) {
  return {
    id: "inv", carrier_id: CARRIER, number: "THD-INV-1000", customer_id: "cust-1",
    load_id: "load-1", amount_cents: 100_000, issued_on: daysAgo(30), due_on: daysAgo(0),
    status: "sent", factored: false, remit_to: null, pdf_url: null, sent_log: [],
    paid_cents: 0, ...overrides,
  }
}

beforeEach(() => queryMock.mockClear())

describe("getAgingSummary", () => {
  it("scopes and excludes paid invoices in the query itself", async () => {
    queryMock.mockResolvedValue([])
    await getAgingSummary(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("i.carrier_id = $1")
    expect(String(sql)).toContain("i.status NOT IN ('paid')")
    expect(params).toEqual([CARRIER])
  })

  it("buckets unpaid, half-paid and over-paid invoices and sums open_cents correctly", async () => {
    queryMock.mockResolvedValue([
      invoiceRow({ id: "unpaid-current", amount_cents: 100_000, paid_cents: 0, due_on: daysAgo(0) }),
      invoiceRow({ id: "half-paid-31to60", amount_cents: 200_000, paid_cents: 100_000, due_on: daysAgo(45) }),
      invoiceRow({ id: "over-paid-90plus", amount_cents: 50_000, paid_cents: 60_000, due_on: daysAgo(120) }),
    ])

    const summary = await getAgingSummary(CARRIER)

    expect(summary.invoices).toHaveLength(3)
    const byId = Object.fromEntries(summary.invoices.map((inv) => [inv.id, inv]))
    expect(byId["unpaid-current"]).toMatchObject({ bucket: "current", open_cents: 100_000 })
    expect(byId["half-paid-31to60"]).toMatchObject({ bucket: "31-60", open_cents: 100_000 })
    // over-payment goes negative, not floored to zero — the discrepancy must stay visible.
    expect(byId["over-paid-90plus"]).toMatchObject({ bucket: "90+", open_cents: -10_000 })

    expect(summary.buckets).toEqual({
      current: 100_000, "1-30": 0, "31-60": 100_000, "61-90": 0, "90+": -10_000,
    })
    expect(summary.totalOpenCents).toBe(190_000)
  })

  it("never receives a fully-paid invoice — that filter lives in the SQL, not this function", async () => {
    // The query itself excludes status = 'paid' (pinned above); this asserts
    // getAgingSummary doesn't double-filter or otherwise drop rows it's given.
    queryMock.mockResolvedValue([
      invoiceRow({ id: "disputed", status: "disputed", amount_cents: 30_000, paid_cents: 0 }),
    ])
    const summary = await getAgingSummary(CARRIER)
    expect(summary.invoices.map((inv) => inv.id)).toEqual(["disputed"])
    expect(summary.totalOpenCents).toBe(30_000)
  })
})
