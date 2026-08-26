/**
 * Regression for arAgingTrend's payment subquery correlating on invoice_id
 * alone (no carrier_id filter). Not exploitable today — stops/invoices can't
 * cross carriers while hub.payments.invoice_id -> hub.invoices FK holds and
 * every payment insert already carries its own carrier_id — but it was the
 * one query in this subsystem that didn't defense-in-depth guard the join
 * the way `assignFuelToLoad` and `recentFacilityStops` do. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { arAgingTrend } from "../reports"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("arAgingTrend", () => {
  it("scopes the payments subquery by carrier_id, not invoice_id alone", async () => {
    await arAgingTrend(CARRIER, 8)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("p.invoice_id = i.id AND p.carrier_id = $1 AND p.paid_on <= c.checkpoint::date")
    expect(params).toEqual([CARRIER, 8])
  })
})
