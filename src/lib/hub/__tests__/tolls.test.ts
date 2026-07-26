/**
 * Toll-transaction reconciliation data layer: `assignTollToTruck` follows the
 * assignFuelToLoad both-sides pattern (carrier_id checked on the transaction
 * AND the truck via the UPDATE...FROM join, not just the WHERE clause), and
 * the unassigned/per-truck queries stay carrier-scoped.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { assignTollToTruck, listTollTransactions, listUnassignedTolls, tollStatsByTruck } from "../tolls"

const queryMock = vi.mocked(query)
const CARRIER = "11111111-1111-1111-1111-111111111111"

function lastCall(): { sql: string; params: unknown[] } {
  const [sql, params] = queryMock.mock.calls[queryMock.mock.calls.length - 1]
  return { sql: String(sql), params: (params as unknown[]) ?? [] }
}

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("assignTollToTruck", () => {
  it("guards the truck side of the join with carrier_id, not just the transaction", async () => {
    queryMock.mockResolvedValueOnce([{ id: "toll-1" }])
    const touched = await assignTollToTruck(CARRIER, "toll-1", "truck-1")
    expect(touched).toBe(1)
    const { sql, params } = lastCall()
    expect(sql).toContain("UPDATE hub.toll_transactions x SET truck_id = t.id")
    expect(sql).toContain("FROM hub.trucks t")
    expect(sql).toContain("x.carrier_id = $1 AND x.id = $2")
    expect(sql).toContain("t.id = $3 AND t.carrier_id = $1 AND t.deleted_at IS NULL")
    expect(params).toEqual([CARRIER, "toll-1", "truck-1"])
  })

  it("returns 0 when the transaction or truck isn't this carrier's (no row updated)", async () => {
    queryMock.mockResolvedValueOnce([])
    const touched = await assignTollToTruck(CARRIER, "toll-1", "foreign-truck")
    expect(touched).toBe(0)
  })

  it("clears the truck when truckId is null, still carrier-scoped", async () => {
    queryMock.mockResolvedValueOnce([{ id: "toll-1" }])
    const touched = await assignTollToTruck(CARRIER, "toll-1", null)
    expect(touched).toBe(1)
    const { sql, params } = lastCall()
    expect(sql).toContain("SET truck_id = NULL")
    expect(sql).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(params).toEqual([CARRIER, "toll-1"])
  })
})

describe("listUnassignedTolls", () => {
  it("scopes to this carrier and only unmatched rows", async () => {
    await listUnassignedTolls(CARRIER)
    const { sql, params } = lastCall()
    expect(sql).toContain("WHERE x.carrier_id = $1 AND x.truck_id IS NULL")
    expect(params).toEqual([CARRIER])
  })
})

describe("listTollTransactions", () => {
  it("joins trucks on both carrier_id and id", async () => {
    await listTollTransactions(CARRIER)
    const { sql } = lastCall()
    expect(sql).toContain("LEFT JOIN hub.trucks t ON t.id = x.truck_id AND t.carrier_id = x.carrier_id")
    expect(sql).toContain("WHERE x.carrier_id = $1")
  })

  it("adds a truck filter when requested", async () => {
    await listTollTransactions(CARRIER, { truckId: "truck-1" })
    const { sql, params } = lastCall()
    expect(sql).toContain("AND x.truck_id = $2")
    expect(params).toEqual([CARRIER, "truck-1"])
  })
})

describe("tollStatsByTruck", () => {
  it("groups by truck within the carrier's own window", async () => {
    await tollStatsByTruck(CARRIER, 30)
    const { sql, params } = lastCall()
    expect(sql).toContain("WHERE x.carrier_id = $1 AND x.ts >= NOW() - ($2 || ' days')::interval")
    expect(sql).toContain("GROUP BY x.truck_id, t.unit_number")
    expect(params).toEqual([CARRIER, 30])
  })
})
