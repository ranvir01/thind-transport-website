/**
 * listUnassignedFuel, fuelForLoad, assignableLoadsForFuel, fuelStatsByTruck,
 * and fuelByProgram had zero direct test coverage — every other fuel.ts
 * export (assignFuelToLoad, setFuelUse, fuelFraudFlags) already has its own
 * carrier-scoping test file. Pins that each wrapper scopes by carrier_id
 * (never lets a receipt/load from another tenant leak through) and passes
 * its other params through correctly.
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
  it("scopes by carrier_id and only returns receipts with no load_id", async () => {
    await listUnassignedFuel(CARRIER)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.load_id IS NULL")
    expect(params).toEqual([CARRIER])
  })

  it("clamps the limit to 200 in the generated SQL", async () => {
    await listUnassignedFuel(CARRIER, 5000)
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("LIMIT 200")
  })

  it("uses a caller-supplied limit under the cap", async () => {
    await listUnassignedFuel(CARRIER, 10)
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("LIMIT 10")
  })
})

describe("fuelForLoad", () => {
  it("scopes by carrier_id AND load_id together, never load_id alone", async () => {
    await fuelForLoad(CARRIER, LOAD)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.load_id = $2")
    expect(params).toEqual([CARRIER, LOAD])
  })
})

describe("assignableLoadsForFuel", () => {
  it("scopes candidate loads by carrier_id, excludes soft-deleted and cancelled loads", async () => {
    await assignableLoadsForFuel(CARRIER)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status <> 'cancelled'")
    expect(params).toEqual([CARRIER, 120])
  })

  it("pins origin/dest stop laterals to the load's carrier (both-sides tenancy)", async () => {
    await assignableLoadsForFuel(CARRIER)
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup'")
    expect(String(sql)).toContain("FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery'")
  })

  it("passes a caller-supplied lookback window through as the second param", async () => {
    await assignableLoadsForFuel(CARRIER, 30)
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual([CARRIER, 30])
  })
})

describe("fuelStatsByTruck", () => {
  it("scopes both the fuel aggregate and the nested loaded-miles subquery by carrier_id", async () => {
    await fuelStatsByTruck(CARRIER)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE f.carrier_id = $1 AND f.ts >= NOW()")
    expect(String(sql)).toContain("WHERE l.truck_id = f.truck_id AND l.carrier_id = $1")
    expect(params).toEqual([CARRIER, 92])
  })

  it("excludes reefer/other gallons from the tractor_gallons FILTER clause", async () => {
    await fuelStatsByTruck(CARRIER)
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FILTER (WHERE f.fuel_use = 'tractor')")
  })
})

describe("fuelByProgram", () => {
  it("scopes by carrier_id and passes the days window through", async () => {
    await fuelByProgram(CARRIER, 30)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND ts >= NOW()")
    expect(params).toEqual([CARRIER, 30])
  })
})
