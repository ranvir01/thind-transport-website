/**
 * getAgingSummary (invoices.ts:309) feeds both the AR page and
 * runOverdueReminders' dunning schedule and was 0% covered (TEST_GAPS.md
 * §2 item 8): a partially-paid invoice mis-bucketing means the owner chases
 * money already collected, or misses money still owed.
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

beforeEach(() => {
  queryMock.mockClear()
})

describe("getAgingSummary", () => {
  it("scopes by carrier_id and excludes paid invoices in SQL", async () => {
    queryMock.mockResolvedValueOnce([])
    await getAgingSummary(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("i.carrier_id = $1")
    expect(String(sql)).toContain("i.status NOT IN ('paid')")
    expect(params).toEqual([CARRIER])
  })

  it("buckets by days-past-due and nets out paid_cents, unpaid and partially-paid alike", async () => {
    queryMock.mockResolvedValueOnce([
      // not yet due -> current, fully open
      { id: "inv-1", due_on: "2999-01-01", amount_cents: 10000, paid_cents: 0 },
      // far past due, partially paid -> 90+, open = amount - paid
      { id: "inv-2", due_on: "2000-01-01", amount_cents: 5000, paid_cents: 2000 },
      // far past due, fully paid in a racy pre-status-flip state -> still
      // bucketed, but contributes zero to totalOpenCents
      { id: "inv-3", due_on: "2000-01-01", amount_cents: 8000, paid_cents: 8000 },
    ])

    const result = await getAgingSummary(CARRIER)

    expect(result.buckets.current).toBe(10000)
    expect(result.buckets["90+"]).toBe(3000)
    expect(result.totalOpenCents).toBe(13000)
    expect(result.invoices.map((i) => i.open_cents)).toEqual([10000, 3000, 0])
  })
})
