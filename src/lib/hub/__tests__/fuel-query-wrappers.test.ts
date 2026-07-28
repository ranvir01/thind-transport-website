/**
 * listUnassignedFuel, fuelForLoad, assignableLoadsForFuel, fuelStatsByTruck,
 * and fuelByProgram had no dedicated tests — only listFuelTransactions and
 * assignFuelToLoad (the mutating half) were directly covered. Each of these
 * is a carrier-scoped read the fuel review/reports UI trusts unconditionally,
 * so each gets its own carrier_id-param + row-passthrough check, mirroring
 * the assignFuelToLoad pattern (fuel-assign-to-load.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
}))

import { query } from "../db"
import {
  assignableLoadsForFuel,
  fuelByProgram,
  fuelForLoad,
  fuelStatsByTruck,
  listUnassignedFuel,
} from "../fuel"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const LOAD = "44444444-4444-4444-4444-444444444444"

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("listUnassignedFuel", () => {
  it("scopes by carrier_id and excludes reconciled receipts", async () => {
    await listUnassignedFuel(CARRIER)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("f.carrier_id = $1 AND f.load_id IS NULL")
    expect(params).toEqual([CARRIER])
  })

  it("caps the default limit at 40 and clamps a larger request to 200", async () => {
    await listUnassignedFuel(CARRIER)
    expect(String(queryMock.mock.calls[0][0])).toContain("LIMIT 40")

    await listUnassignedFuel(CARRIER, 500)
    expect(String(queryMock.mock.calls[1][0])).toContain("LIMIT 200")
  })

  it("passes through the rows query resolves", async () => {
    const rows = [{ id: "f1" }] as never
    queryMock.mockResolvedValueOnce(rows)
    await expect(listUnassignedFuel(CARRIER)).resolves.toBe(rows)
  })
})

describe("fuelForLoad", () => {
  it("scopes by carrier_id and the given load_id, oldest first", async () => {
    await fuelForLoad(CARRIER, LOAD)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("f.carrier_id = $1 AND f.load_id = $2")
    expect(String(sql)).toContain("ORDER BY f.ts ASC")
    expect(params).toEqual([CARRIER, LOAD])
  })
})

describe("assignableLoadsForFuel", () => {
  it("scopes by carrier_id, excludes deleted/cancelled loads, and passes the days window", async () => {
    await assignableLoadsForFuel(CARRIER, 45)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'")
    expect(params).toEqual([CARRIER, 45])
  })

  it("defaults the window to 120 days", async () => {
    await assignableLoadsForFuel(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 120])
  })
})

describe("fuelStatsByTruck", () => {
  it("scopes both the fuel aggregate and the loaded-miles subquery by the same carrier_id", async () => {
    await fuelStatsByTruck(CARRIER, 30)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    // Two carrier_id checks: the outer fuel_transactions WHERE and the
    // correlated loaded_miles subquery — both must use the same $1.
    expect(String(sql)).toContain("f.carrier_id = $1 AND f.ts >= NOW()")
    expect(String(sql)).toContain("l.carrier_id = $1 AND l.deleted_at IS NULL")
    expect(params).toEqual([CARRIER, 30])
  })

  it("excludes non-tractor fuel from the propulsion (tractor_gallons) column via a FILTER clause", async () => {
    await fuelStatsByTruck(CARRIER)
    expect(String(queryMock.mock.calls[0][0])).toContain("FILTER (WHERE f.fuel_use = 'tractor')")
  })

  it("defaults the window to 92 days", async () => {
    await fuelStatsByTruck(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 92])
  })
})

describe("fuelByProgram", () => {
  it("scopes by carrier_id and groups by card_program, spend descending", async () => {
    await fuelByProgram(CARRIER, 60)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND ts >= NOW()")
    expect(String(sql)).toContain("GROUP BY card_program ORDER BY total_cents DESC")
    expect(params).toEqual([CARRIER, 60])
  })

  it("defaults the window to 92 days", async () => {
    await fuelByProgram(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 92])
  })
})
