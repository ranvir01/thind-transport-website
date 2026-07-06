/**
 * Regression for the hole where markSettlementPaid didn't check whether its
 * own carrier-scoped settlement UPDATE actually matched a row before closing
 * out loads (unscoped) and logging a "paid" audit entry. A settlement id from
 * a foreign carrier used to silently flip that OTHER tenant's paid loads to
 * settled. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "../db"
import { logAudit } from "../audit"
import { markSettlementPaid } from "../settlements"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const SETTLEMENT = "22222222-2222-2222-2222-222222222222"
const ACTOR = { id: "33333333-3333-3333-3333-333333333333", name: "Test Actor" }

describe("markSettlementPaid", () => {
  beforeEach(() => {
    queryMock.mockReset()
    logAuditMock.mockClear()
  })

  it("returns false and never touches loads or logs audit when the settlement update matches 0 rows", async () => {
    queryMock.mockResolvedValueOnce([]) // UPDATE hub.settlements ... RETURNING id -> no match

    const paid = await markSettlementPaid(CARRIER, SETTLEMENT, ACTOR)

    expect(paid).toBe(false)
    expect(queryMock).toHaveBeenCalledTimes(1) // only the settlement UPDATE ran
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("scopes the loads SELECT and per-load UPDATE by carrier_id when the settlement update succeeds", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: SETTLEMENT }]) // settlement UPDATE matched
      .mockResolvedValueOnce([{ id: "load-1", status: "paid" }]) // loads SELECT
      .mockResolvedValueOnce([]) // load UPDATE

    const paid = await markSettlementPaid(CARRIER, SETTLEMENT, ACTOR)

    expect(paid).toBe(true)
    const loadsSelect = queryMock.mock.calls[1]
    expect(String(loadsSelect[0])).toContain("FROM hub.loads WHERE settlement_id = $1 AND carrier_id = $2")
    expect(loadsSelect[1]).toEqual([SETTLEMENT, CARRIER])

    const loadUpdate = queryMock.mock.calls[2]
    expect(String(loadUpdate[0])).toContain("WHERE id = $1 AND carrier_id = $2")
    expect(loadUpdate[1]).toEqual(["load-1", CARRIER])

    expect(logAuditMock).toHaveBeenCalledTimes(1)
  })
})
