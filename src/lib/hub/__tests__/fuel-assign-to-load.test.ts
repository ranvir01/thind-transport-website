/**
 * assignFuelToLoad reconciles a fuel receipt to a load and is the exact
 * both-sides tenancy guard other tests (fuel-reclassify-tenancy,
 * cross-table-write-guards, tolls, etc.) cite as "the assignFuelToLoad
 * pattern" — yet the function itself had zero direct coverage. It never
 * ran its own carrier scoping, its clear (loadId = null) branch, or its
 * "no row matched" return.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
}))

import { query } from "../db"
import { assignFuelToLoad } from "../fuel"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER_CARRIER = "22222222-2222-2222-2222-222222222222"
const TXN = "33333333-3333-3333-3333-333333333333"
const LOAD = "44444444-4444-4444-4444-444444444444"

beforeEach(() => {
  queryMock.mockReset()
})

describe("assignFuelToLoad", () => {
  it("clears the load_id, scoped by carrier_id and transaction id, when loadId is null", async () => {
    queryMock.mockResolvedValue([{ id: TXN }] as never)

    const count = await assignFuelToLoad(CARRIER, TXN, null)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("SET load_id = NULL")
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(params).toEqual([CARRIER, TXN])
    expect(count).toBe(1)
  })

  it("returns 0 when clearing matches no row", async () => {
    queryMock.mockResolvedValue([])
    const count = await assignFuelToLoad(CARRIER, TXN, null)
    expect(count).toBe(0)
  })

  it("reconciles to a load, scoping both the transaction and the load by carrier_id", async () => {
    queryMock.mockResolvedValue([{ id: TXN }] as never)

    const count = await assignFuelToLoad(CARRIER, TXN, LOAD)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("SET load_id = l.id")
    expect(String(sql)).toContain("f.carrier_id = $1 AND f.id = $2")
    expect(String(sql)).toContain("l.id = $3 AND l.carrier_id = $1 AND l.deleted_at IS NULL")
    // Both the receipt and the load are checked against the SAME carrier
    // param ($1) — a receipt can never be pointed at another tenant's load.
    expect(params).toEqual([CARRIER, TXN, LOAD])
    expect(params[0]).not.toBe(OTHER_CARRIER)
    expect(count).toBe(1)
  })

  it("returns 0 when the load belongs to a different carrier (query finds no matching row)", async () => {
    queryMock.mockResolvedValue([])
    const count = await assignFuelToLoad(CARRIER, TXN, LOAD)
    expect(count).toBe(0)
  })
})
