/**
 * Loads/dispatch subsystem audit: the load board's inline status cell used to
 * pass any of the 11 statuses straight to changeLoadStatus, bypassing every
 * gate the load page enforces server-side — dispatch legality (expired
 * CDL/medical, truck in shop), the POD-before-pod_received document gate, the
 * cancel lock after delivery, and the rule that billing statuses (invoiced/
 * paid/settled) are set only by the invoice/settlement flow. These tests pin
 * the gates inside patchLoadBoardField itself, so every caller inherits them.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../geocode", () => ({ geocodeCityState: vi.fn(async () => null) }))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("../loads", () => ({
  getLoad: vi.fn(),
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async (_c: string, id: string, status: string) => ({ id, status })),
}))
// Keep dispatchLegality real — the gate must refuse on the actual rules.
vi.mock("../drivers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../drivers")>()
  return { ...actual, getDriver: vi.fn(async () => null) }
})
vi.mock("../fleet", () => ({ getTruck: vi.fn(async () => null) }))

import { patchLoadBoardField } from "../loadboard"
import { BILLING_STATUSES, loadBoardStatusChoices } from "../loadboard-status"
import { getDriver } from "../drivers"
import { getTruck } from "../fleet"
import { changeLoadStatus, getLoad } from "../loads"
import type { LoadStatus } from "../types"

const CARRIER = "carrier-1"
const ACTOR = { id: "user-1", name: "Dispatcher" }

const getLoadMock = vi.mocked(getLoad)
const getDriverMock = vi.mocked(getDriver)
const getTruckMock = vi.mocked(getTruck)
const changeLoadStatusMock = vi.mocked(changeLoadStatus)

function boardLoad(overrides: Record<string, unknown> = {}) {
  return {
    id: "load-1",
    reference: "THD-1001",
    status: "booked" as LoadStatus,
    driver_id: null,
    truck_id: null,
    doc_kinds: null,
    ...overrides,
  } as never
}

function patchStatus(to: string) {
  return patchLoadBoardField(CARRIER, "load-1", "status", to, ACTOR)
}

beforeEach(() => {
  vi.clearAllMocks()
  getDriverMock.mockResolvedValue(null)
  getTruckMock.mockResolvedValue(null)
})

describe("billing statuses are invoice/settlement-flow only", () => {
  it.each(["invoiced", "paid", "settled"] as const)("refuses a manual jump to %s", async (to) => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "pod_received" }))
    await expect(patchStatus(to)).rejects.toThrow(/invoice and settlement flow/)
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })

  it("refuses edits away from a billing status (settled load can't go back to booked)", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "settled" }))
    await expect(patchStatus("booked")).rejects.toThrow(/invoice and settlement flow/)
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })
})

describe("cancel lock", () => {
  it("refuses cancelling a delivered load, same as setLoadStatusAction", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "delivered" }))
    await expect(patchStatus("cancelled")).rejects.toThrow(/Cannot cancel a load that is delivered/)
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })

  it("still allows cancelling a booked load", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked" }))
    await patchStatus("cancelled")
    expect(changeLoadStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "cancelled", ACTOR)
  })
})

describe("dispatch legality gate", () => {
  const expiredDriver = {
    first_name: "Jo", last_name: "Diaz",
    cdl_expiry: "2000-01-01", medical_card_expiry: "2099-01-01",
  } as never

  it("refuses booked → dispatched when the driver's CDL is expired", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked", driver_id: "driver-1" }))
    getDriverMock.mockResolvedValue(expiredDriver)
    await expect(patchStatus("dispatched")).rejects.toThrow(/CDL expired/)
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })

  it("refuses skipping past dispatched (booked → in_transit) around the gate", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked", driver_id: "driver-1" }))
    getDriverMock.mockResolvedValue(expiredDriver)
    await expect(patchStatus("in_transit")).rejects.toThrow(/CDL expired/)
  })

  it("refuses dispatching onto a truck that's in the shop", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked", truck_id: "truck-1" }))
    getTruckMock.mockResolvedValue({ status: "shop", unit_number: "42" } as never)
    await expect(patchStatus("dispatched")).rejects.toThrow(/in the shop/)
  })

  it("allows dispatch when driver and truck are legal", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked", driver_id: "driver-1", truck_id: "truck-1" }))
    getDriverMock.mockResolvedValue({
      first_name: "Jo", last_name: "Diaz",
      cdl_expiry: "2099-01-01", medical_card_expiry: "2099-01-01",
    } as never)
    getTruckMock.mockResolvedValue({ status: "active", unit_number: "42" } as never)
    await patchStatus("dispatched")
    expect(changeLoadStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "dispatched", ACTOR)
  })

  it("skips the legality lookup on backward moves already past dispatch", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "in_transit", driver_id: "driver-1" }))
    await patchStatus("dispatched")
    expect(getDriverMock).not.toHaveBeenCalled()
    expect(changeLoadStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "dispatched", ACTOR)
  })
})

describe("POD gate", () => {
  it("refuses pod_received without a POD on file", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "delivered", doc_kinds: ["bol"] }))
    await expect(patchStatus("pod_received")).rejects.toThrow(/Upload the POD/)
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })

  it("allows pod_received once the POD is uploaded", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "delivered", doc_kinds: ["pod"] }))
    await patchStatus("pod_received")
    expect(changeLoadStatusMock).toHaveBeenCalledWith(CARRIER, "load-1", "pod_received", ACTOR)
  })
})

describe("no-op and dropdown policy", () => {
  it("same-status save is a no-op that never calls changeLoadStatus", async () => {
    getLoadMock.mockResolvedValue(boardLoad({ status: "booked" }))
    await patchStatus("booked")
    expect(changeLoadStatusMock).not.toHaveBeenCalled()
  })

  it("choices never offer billing statuses from an operational status", () => {
    for (const from of ["quoted", "booked", "in_transit", "delivered"] as const) {
      const choices = loadBoardStatusChoices(from)
      for (const billing of BILLING_STATUSES) expect(choices).not.toContain(billing)
    }
  })

  it("choices lock a billing-status load to its current status", () => {
    expect(loadBoardStatusChoices("settled")).toEqual(["settled"])
  })

  it("choices drop cancelled once delivery work started", () => {
    expect(loadBoardStatusChoices("delivered")).not.toContain("cancelled")
    expect(loadBoardStatusChoices("booked")).toContain("cancelled")
  })
})
