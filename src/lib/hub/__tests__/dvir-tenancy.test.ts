/**
 * Fleet subsystem audit (1c-style): pins two DVIR tenancy fixes.
 * (1) driverOwnsTruck — the new gate closing the "any driver can file/ground
 *     any truck in the carrier" hole (see dvir-driver-scope.test.ts for the
 *     action-level enforcement).
 * (2) DVIR_SELECT's truck/driver joins now guard carrier_id on both sides,
 *     matching AGENTS.md's defense-in-depth doctrine (read-joins-tenancy.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { query, queryOne } from "../db"
import { driverOwnsTruck, listDvirsForTruck } from "../dvir"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "carrier-1"
const DRIVER = "driver-1"
const TRUCK = "truck-1"

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
})

describe("driverOwnsTruck", () => {
  it("scopes by carrier AND (assigned driver OR the driver's active-load truck)", async () => {
    await driverOwnsTruck(CARRIER, DRIVER, TRUCK)
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("t.carrier_id = $1 AND t.id = $2")
    expect(String(sql)).toContain("t.assigned_driver_id = $3")
    expect(String(sql)).toContain("l.carrier_id = $1 AND l.driver_id = $3")
    expect(params).toEqual([CARRIER, TRUCK, DRIVER])
  })
})

describe("listDvirsForTruck", () => {
  it("guards the truck and driver joins on carrier_id, not id alone", async () => {
    await listDvirsForTruck(CARRIER, TRUCK)
    const [sql] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("JOIN hub.trucks t ON t.id = v.truck_id AND t.carrier_id = v.carrier_id")
    expect(String(sql)).toContain("JOIN hub.drivers d ON d.id = v.driver_id AND d.carrier_id = v.carrier_id")
  })
})
