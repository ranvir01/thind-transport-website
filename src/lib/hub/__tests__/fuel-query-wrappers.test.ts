/**
 * listUnassignedFuel, fuelForLoad, assignableLoadsForFuel, fuelStatsByTruck,
 * and fuelByProgram were only exercised incidentally via read-joins-tenancy
 * .test.ts (listFuelTransactions only) — each is a distinct query wrapper
 * with its own carrier_id scoping and no dedicated test asserting it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
}))

import { query } from "../db"
import { assignableLoadsForFuel, fuelByProgram, fuelForLoad, fuelStatsByTruck, listUnassignedFuel } from "../fuel"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("listUnassignedFuel", () => {
  it("scopes by carrier_id and only returns receipts with no load_id", async () => {
    await listUnassignedFuel(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.load_id IS NULL")
    expect(params).toEqual([CARRIER])
  })

  it("caps the limit at 200 even when a larger limit is requested", async () => {
    await listUnassignedFuel(CARRIER, 500)
    expect(String(queryMock.mock.calls[0][0])).toContain("LIMIT 200")
  })

  it("defaults the limit to 40", async () => {
    await listUnassignedFuel(CARRIER)
    expect(String(queryMock.mock.calls[0][0])).toContain("LIMIT 40")
  })
})

describe("fuelForLoad", () => {
  it("scopes by carrier_id and the given load_id, oldest first", async () => {
    await fuelForLoad(CARRIER, "load-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.load_id = $2")
    expect(String(sql)).toContain("ORDER BY f.ts ASC")
    expect(params).toEqual([CARRIER, "load-1"])
  })
})

describe("assignableLoadsForFuel", () => {
  it("scopes by carrier_id, excludes deleted/cancelled loads, and passes the day window", async () => {
    await assignableLoadsForFuel(CARRIER, 60)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'")
    expect(params).toEqual([CARRIER, 60])
  })

  it("defaults the window to 120 days", async () => {
    await assignableLoadsForFuel(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 120])
  })
})

describe("fuelStatsByTruck", () => {
  it("scopes both the outer query and the loaded-miles subquery by carrier_id", async () => {
    await fuelStatsByTruck(CARRIER, 30)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.ts >= NOW()")
    expect(String(sql)).toContain("WHERE l.truck_id = f.truck_id AND l.carrier_id = $1")
    expect(params).toEqual([CARRIER, 30])
  })

  it("only sums tractor-use gallons into tractor_gallons, excluding reefer/other", async () => {
    await fuelStatsByTruck(CARRIER)
    expect(String(queryMock.mock.calls[0][0])).toContain(
      "COALESCE(SUM(f.gallons) FILTER (WHERE f.fuel_use = 'tractor'), 0) AS tractor_gallons"
    )
  })

  it("defaults the window to 92 days", async () => {
    await fuelStatsByTruck(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 92])
  })
})

describe("fuelByProgram", () => {
  it("scopes by carrier_id and groups by card_program", async () => {
    await fuelByProgram(CARRIER, 45)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND ts >= NOW()")
    expect(String(sql)).toContain("GROUP BY card_program")
    expect(params).toEqual([CARRIER, 45])
  })

  it("defaults the window to 92 days", async () => {
    await fuelByProgram(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 92])
  })
})
