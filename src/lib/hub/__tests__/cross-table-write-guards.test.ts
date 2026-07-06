/**
 * Regression: several cross-table writes inserted a foreign-key-shaped id
 * (truck_id, driver_id, load_id, facility_id, applicant_id...) with no check
 * that it belonged to the caller's carrier, unlike the assignFuelToLoad
 * reference pattern. Driver-reachable (incidents) and office-reachable
 * (messages, fleet) paths are covered here. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { queryOne } from "../db"
import { assertCarrierRefs } from "../tenancy"
import { createIncident, updateIncident } from "../incidents"
import { ensureDirectThread, ensureLoadThread } from "../messages"
import { createTruck, updateTruck } from "../fleet"

const assertRefsMock = vi.mocked(assertCarrierRefs)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  assertRefsMock.mockClear()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue({ id: "row-1" } as never)
})

describe("createIncident / updateIncident", () => {
  const input = {
    truckId: "truck-1",
    driverId: "driver-1",
    loadId: "load-1",
    occurredAt: "2026-07-06",
    fatality: false,
    injuryTreatedAway: false,
    towAwayDisabling: false,
  }

  it("createIncident validates truck/driver/load ownership before insert", async () => {
    await createIncident(CARRIER, input, { id: "u1", name: "Driver" })
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, {
      truck_id: "truck-1", driver_id: "driver-1", load_id: "load-1",
    })
  })

  it("updateIncident validates the merged (patch + current) refs", async () => {
    queryOneMock.mockResolvedValueOnce({
      id: "inc-1", truck_id: "old-truck", driver_id: "old-driver", load_id: "old-load",
      status: "open",
    } as never)
    await updateIncident(CARRIER, "inc-1", { truckId: "new-truck" })
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, {
      truck_id: "new-truck", driver_id: "old-driver", load_id: "old-load",
    })
  })
})

describe("message threads", () => {
  it("ensureLoadThread validates the load belongs to the carrier", async () => {
    await ensureLoadThread(CARRIER, "load-1")
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { load_id: "load-1" })
  })

  it("ensureDirectThread validates the driver belongs to the carrier", async () => {
    await ensureDirectThread(CARRIER, "driver-1")
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { driver_id: "driver-1" })
  })
})

describe("fleet truck assignment", () => {
  const truckInput = {
    unit_number: "102", ownership: "company" as const, status: "active" as const,
    assigned_driver_id: "driver-1",
  }

  it("createTruck validates assigned_driver_id belongs to the carrier", async () => {
    await createTruck(CARRIER, truckInput)
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { driver_id: "driver-1" })
  })

  it("updateTruck validates assigned_driver_id belongs to the carrier", async () => {
    await updateTruck(CARRIER, "truck-1", truckInput)
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { driver_id: "driver-1" })
  })
})
