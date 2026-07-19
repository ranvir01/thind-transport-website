/**
 * Regression (loads/dispatch subsystem audit, 1c-style sweep): the load
 * board's status cell was the third server path that could set 'dispatched'
 * (after advanceLoadStatusAction and the planner) and the only one that
 * skipped the dispatchLegality hard-stop gate — an expired-CDL/medical
 * driver or a truck in the shop could be dispatched straight from the grid.
 * patchLoadBoardField now runs the same gate before changeLoadStatus.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(),
  changeLoadStatus: vi.fn(async () => ({ id: "load-1", status: "dispatched" })),
  getLoadStops: vi.fn(async () => []),
}))
vi.mock("../drivers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../drivers")>()),
  getDriver: vi.fn(),
}))
vi.mock("../fleet", () => ({ getTruck: vi.fn() }))
vi.mock("../geocode", () => ({ geocodeCityState: vi.fn(async () => null) }))

import { getLoad, changeLoadStatus } from "../loads"
import { getDriver } from "../drivers"
import { getTruck } from "../fleet"
import { patchLoadBoardField } from "../loadboard"

const getLoadMock = vi.mocked(getLoad)
const changeStatusMock = vi.mocked(changeLoadStatus)
const getDriverMock = vi.mocked(getDriver)
const getTruckMock = vi.mocked(getTruck)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const ACTOR = { id: "u1", name: "Dispatcher" }

const future = new Date(Date.now() + 365 * 86400000).toISOString()
const past = new Date(Date.now() - 30 * 86400000).toISOString()

function baseLoad(over: Record<string, unknown> = {}) {
  return {
    id: "load-1", status: "booked", driver_id: "driver-1", truck_id: "truck-1", ...over,
  } as never
}

function driver(over: Record<string, unknown> = {}) {
  return {
    first_name: "Amrit", last_name: "Bains",
    cdl_expiry: future, medical_card_expiry: future, ...over,
  } as never
}

beforeEach(() => {
  getLoadMock.mockReset()
  changeStatusMock.mockClear()
  getDriverMock.mockReset()
  getTruckMock.mockReset()
  getTruckMock.mockResolvedValue({ status: "active", unit_number: "105" } as never)
})

describe("patchLoadBoardField status cell dispatch gate", () => {
  it("refuses status→dispatched when the driver has a hard stop", async () => {
    getLoadMock.mockResolvedValue(baseLoad())
    getDriverMock.mockResolvedValue(driver({ cdl_expiry: past }))
    await expect(
      patchLoadBoardField(CARRIER, "load-1", "status", "dispatched", ACTOR)
    ).rejects.toThrow("CDL expired")
    expect(changeStatusMock).not.toHaveBeenCalled()
  })

  it("refuses status→dispatched when the truck is in the shop", async () => {
    getLoadMock.mockResolvedValue(baseLoad())
    getDriverMock.mockResolvedValue(driver())
    getTruckMock.mockResolvedValue({ status: "shop", unit_number: "105" } as never)
    await expect(
      patchLoadBoardField(CARRIER, "load-1", "status", "dispatched", ACTOR)
    ).rejects.toThrow(/shop/)
    expect(changeStatusMock).not.toHaveBeenCalled()
  })

  it("dispatches when driver and truck are legal", async () => {
    getLoadMock.mockResolvedValue(baseLoad())
    getDriverMock.mockResolvedValue(driver())
    await patchLoadBoardField(CARRIER, "load-1", "status", "dispatched", ACTOR)
    expect(changeStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "dispatched", ACTOR)
  })

  it("does not re-gate a load already dispatched", async () => {
    getLoadMock.mockResolvedValue(baseLoad({ status: "dispatched" }))
    await patchLoadBoardField(CARRIER, "load-1", "status", "dispatched", ACTOR)
    expect(getDriverMock).not.toHaveBeenCalled()
    expect(changeStatusMock).toHaveBeenCalled()
  })

  it("leaves non-dispatch transitions ungated", async () => {
    getLoadMock.mockResolvedValue(baseLoad({ status: "in_transit" }))
    await patchLoadBoardField(CARRIER, "load-1", "status", "delivered", ACTOR)
    expect(getDriverMock).not.toHaveBeenCalled()
    expect(changeStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "delivered", ACTOR)
  })
})
