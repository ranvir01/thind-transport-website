/**
 * Cash cycle (Task 2 / TOP_10 #9): pins the leg math — medians as headline,
 * exclusion (not zeroing) of loads that haven't reached a leg, the
 * clock-skew floor — and the tenancy scoping of both queries in getCashCycle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { cashCycleStats, type CashCycleLoadRow } from "../money"
import { getCashCycle } from "../cash-cycle"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const d = (iso: string) => new Date(iso)

/** A load fully through the cycle: 2d to POD, 3d to invoice, 10d to paid. */
const FULL: CashCycleLoadRow = {
  deliveredAt: d("2026-07-01T00:00:00Z"),
  podReceivedAt: d("2026-07-03T00:00:00Z"),
  invoiceIssuedOn: d("2026-07-06T00:00:00Z"),
  paidOn: d("2026-07-16T00:00:00Z"),
}

describe("cashCycleStats", () => {
  it("computes each leg to the day on a fully cycled load", () => {
    const s = cashCycleStats([FULL])
    expect(s.deliveredToPod).toEqual({ count: 1, medianDays: 2, meanDays: 2 })
    expect(s.podToInvoice).toEqual({ count: 1, medianDays: 3, meanDays: 3 })
    expect(s.invoiceToPaid).toEqual({ count: 1, medianDays: 10, meanDays: 10 })
    expect(s.deliveredToPaid).toEqual({ count: 1, medianDays: 15, meanDays: 15 })
  })

  it("excludes a load from legs it has not reached instead of counting zero", () => {
    // Delivered only — no POD yet. It must not appear in ANY leg (a pending
    // POD is not "0 days", it's not a datapoint), so the stats stay those of
    // the one finished load.
    const deliveredOnly: CashCycleLoadRow = {
      deliveredAt: d("2026-07-10T00:00:00Z"),
      podReceivedAt: null,
      invoiceIssuedOn: null,
      paidOn: null,
    }
    const s = cashCycleStats([FULL, deliveredOnly])
    expect(s.deliveredToPod.count).toBe(1)
    expect(s.podToInvoice.count).toBe(1)
    expect(s.deliveredToPaid.medianDays).toBe(15)
  })

  it("handles a legacy row whose backfill skipped delivered_at", () => {
    // Partial backfill: POD stamp exists, delivered_at is null. The POD →
    // invoice leg still counts it; the delivered-based legs don't.
    const partial: CashCycleLoadRow = {
      deliveredAt: null,
      podReceivedAt: d("2026-07-02T00:00:00Z"),
      invoiceIssuedOn: d("2026-07-04T00:00:00Z"),
      paidOn: null,
    }
    const s = cashCycleStats([partial])
    expect(s.deliveredToPod.count).toBe(0)
    expect(s.deliveredToPaid.count).toBe(0)
    expect(s.podToInvoice).toEqual({ count: 1, medianDays: 2, meanDays: 2 })
  })

  it("uses the median as the headline so one deadbeat can't move it", () => {
    const paidIn = (days: number): CashCycleLoadRow => ({
      ...FULL,
      paidOn: d(`2026-07-${String(6 + days).padStart(2, "0")}T00:00:00Z`),
    })
    // Invoice→paid: 5, 6, 7 days … and one 20-day straggler.
    const s = cashCycleStats([paidIn(5), paidIn(6), paidIn(7), paidIn(20)])
    expect(s.invoiceToPaid.medianDays).toBe(6.5)
    expect(s.invoiceToPaid.meanDays).toBe(9.5) // the gap exposes the straggler
  })

  it("floors a skewed clock at zero days instead of going negative", () => {
    const skewed: CashCycleLoadRow = {
      ...FULL,
      podReceivedAt: d("2026-06-30T12:00:00Z"), // "before" delivery
    }
    const s = cashCycleStats([skewed])
    expect(s.deliveredToPod.medianDays).toBe(0)
  })

  it("returns null stats on an empty window", () => {
    const s = cashCycleStats([])
    expect(s.deliveredToPaid).toEqual({ count: 0, medianDays: null, meanDays: null })
  })
})

describe("getCashCycle tenancy", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([])
    queryOneMock.mockReset().mockResolvedValue(null)
  })

  it("scopes the cycle rows and joins by carrier on both sides", async () => {
    await getCashCycle("carrier-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("l.carrier_id = $1")
    expect(String(sql)).toContain("i.carrier_id = l.carrier_id")
    expect(String(sql)).toContain("p.carrier_id = i.carrier_id")
    expect((params as unknown[])[0]).toBe("carrier-1")
  })

  it("scopes the unbilled rollup and guards its invoice NOT EXISTS by carrier", async () => {
    await getCashCycle("carrier-1")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("l.carrier_id = $1")
    expect(String(sql)).toContain("i.carrier_id = l.carrier_id")
    expect(params).toEqual(["carrier-1"])
  })

  it("only counts a payment date once the invoice is actually paid", async () => {
    await getCashCycle("carrier-1")
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHEN i.status = 'paid'")
  })
})
