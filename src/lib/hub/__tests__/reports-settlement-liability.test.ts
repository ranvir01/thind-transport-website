/**
 * settlementLiability was 0% covered (TEST_GAPS.md #7, second half) — one of
 * the two numbers the owner reads before deciding whether to make payroll.
 * Covers the draft+approved sum, the null-row (no settlements) case, and the
 * carrier_id/status scoping in the query itself.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { queryOne } from "../db"
import { settlementLiability } from "../reports"

const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryOneMock.mockClear()
})

describe("settlementLiability", () => {
  it("sums draft and approved settlement liability separately and combined", async () => {
    queryOneMock.mockResolvedValue({ draft_cents: "480000", approved_cents: "700100" })

    const result = await settlementLiability(CARRIER)

    expect(result).toEqual({
      draftCents: 480000,
      approvedCents: 700100,
      totalCents: 1180100,
    })
  })

  it("returns all zeros when the carrier has no draft or approved settlements", async () => {
    queryOneMock.mockResolvedValue(null)

    const result = await settlementLiability(CARRIER)

    expect(result).toEqual({ draftCents: 0, approvedCents: 0, totalCents: 0 })
  })

  it("scopes by carrier_id and only counts draft/approved statuses", async () => {
    queryOneMock.mockResolvedValue({ draft_cents: "0", approved_cents: "0" })

    await settlementLiability(CARRIER)

    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND status IN ('draft', 'approved')")
    expect(params).toEqual([CARRIER])
  })
})
