/**
 * duplicateLoadAction rebooks a recurring lane: the copy keeps the lane, rate,
 * equipment, and assignment, but must NOT carry per-shipment facts forward —
 * customer ref, PU#/PO#, appointment windows, and earned detention money all
 * belong to the trip they happened on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "user-1", name: "Dana", carrierId: "carrier-1", role: "dispatcher" })),
}))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/documents", () => ({ saveDocument: vi.fn(), deleteDocument: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/loads", () => ({
  createLoad: vi.fn(async () => ({ id: "load-new", reference: "THD-1002", linehaul_cents: 185000 })),
  updateLoad: vi.fn(), changeLoadStatus: vi.fn(), replaceStops: vi.fn(),
  setStopTimestamp: vi.fn(), getLoad: vi.fn(), addLoadEvent: vi.fn(async () => undefined),
  getLoadStops: vi.fn(),
}))
vi.mock("@/lib/hub/drivers", () => ({ getDriver: vi.fn(), dispatchLegality: vi.fn() }))
vi.mock("@/lib/hub/fleet", () => ({ getTruck: vi.fn() }))
vi.mock("@/lib/hub/sharelinks", () => ({ createShareLink: vi.fn(), revokeShareLink: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/geocode", () => ({ geocodeCityState: vi.fn() }))

import { requirePermission } from "@/lib/hub/session"
import { createLoad, getLoad, getLoadStops, addLoadEvent } from "@/lib/hub/loads"
import { logAudit } from "@/lib/hub/audit"
import { duplicateLoadAction } from "@/app/hub/_actions/loads"

const requirePermissionMock = vi.mocked(requirePermission)
const createLoadMock = vi.mocked(createLoad)
const getLoadMock = vi.mocked(getLoad)
const getLoadStopsMock = vi.mocked(getLoadStops)
const addLoadEventMock = vi.mocked(addLoadEvent)
const logAuditMock = vi.mocked(logAudit)

const sourceLoad = {
  id: "load-src",
  carrier_id: "carrier-1",
  reference: "THD-1001",
  customer_id: "cust-1",
  customer_reference: "PO-8891",
  status: "settled",
  equipment: "reefer",
  commodity: "Produce",
  weight_lbs: 42000,
  linehaul_cents: 185000,
  fuel_surcharge_cents: 21000,
  accessorials: [
    { label: "Lumper", amount_cents: 7500 },
    { label: "Detention (2.0 hr)", amount_cents: 10000 },
  ],
  loaded_miles: 612,
  deadhead_miles: 48,
  truck_id: "truck-1",
  trailer_id: "trailer-1",
  driver_id: "driver-1",
  source: "dat",
  factored: true,
  notes: "Dedicated Tuesday lane",
} as never

const sourceStops = [
  {
    id: "stop-1", load_id: "load-src", sequence: 1, type: "pickup",
    facility: "Kent Cold Storage", address: "123 Rail Ave", city: "Kent", state: "WA", zip: "98032",
    fcfs: false, pickup_number: "PU-771", po_number: "PO-8891",
    appt_start: "2026-07-07T15:00:00Z", appt_end: "2026-07-07T17:00:00Z",
    arrived_at: "2026-07-07T15:10:00Z", departed_at: "2026-07-07T19:40:00Z",
    lat: 47.38, lng: -122.23, notes: "Dock 14, check in at guard shack",
  },
  {
    id: "stop-2", load_id: "load-src", sequence: 2, type: "delivery",
    facility: "Boise DC", address: null, city: "Boise", state: "ID", zip: null,
    fcfs: true, pickup_number: null, po_number: "PO-8891-D",
    appt_start: null, appt_end: null, arrived_at: null, departed_at: null,
    lat: 43.61, lng: -116.2, notes: null,
  },
] as never[]

beforeEach(() => {
  vi.clearAllMocks()
  requirePermissionMock.mockResolvedValue({ id: "user-1", name: "Dana", carrierId: "carrier-1", role: "dispatcher" } as never)
  getLoadMock.mockResolvedValue(sourceLoad)
  getLoadStopsMock.mockResolvedValue(sourceStops as never)
  createLoadMock.mockResolvedValue({ id: "load-new", reference: "THD-1002", linehaul_cents: 185000 } as never)
})

describe("duplicateLoadAction", () => {
  it("refuses without loads:write", async () => {
    requirePermissionMock.mockRejectedValue(new Error("Forbidden"))
    const result = await duplicateLoadAction("load-src")
    expect(result.ok).toBe(false)
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("returns not-found for a load outside the carrier", async () => {
    getLoadMock.mockResolvedValue(null)
    const result = await duplicateLoadAction("load-elsewhere")
    expect(result).toEqual({ ok: false, error: "Load not found" })
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("refuses a load with no customer — createLoad requires one", async () => {
    getLoadMock.mockResolvedValue({ ...(sourceLoad as object), customer_id: null } as never)
    const result = await duplicateLoadAction("load-src")
    expect(result).toEqual({ ok: false, error: "Add a customer to this load before duplicating it" })
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("refuses a load with no stops instead of creating an empty shell", async () => {
    getLoadStopsMock.mockResolvedValue([] as never)
    const result = await duplicateLoadAction("load-src")
    expect(result).toEqual({ ok: false, error: "Load has no stops to copy" })
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("copies the lane, rate, and assignment onto a fresh direct booking", async () => {
    const result = await duplicateLoadAction("load-src")
    expect(result).toEqual({ ok: true, id: "load-new" })

    const [carrierId, input] = createLoadMock.mock.calls[0]
    expect(carrierId).toBe("carrier-1")
    expect(input.customer_id).toBe("cust-1")
    expect(input.equipment).toBe("reefer")
    expect(input.commodity).toBe("Produce")
    expect(input.weight_lbs).toBe(42000)
    expect(input.linehaul_cents).toBe(185000)
    expect(input.fuel_surcharge_cents).toBe(21000)
    expect(input.loaded_miles).toBe(612)
    expect(input.deadhead_miles).toBe(48)
    expect(input.truck_id).toBe("truck-1")
    expect(input.trailer_id).toBe("trailer-1")
    expect(input.driver_id).toBe("driver-1")
    expect(input.factored).toBe(true)
    expect(input.notes).toBe("Dedicated Tuesday lane")
    // A copy of a DAT booking is not itself from DAT, and status is never inherited.
    expect(input.source).toBe("direct")
    expect(input.status).toBeUndefined()
  })

  it("leaves per-shipment facts behind: customer ref, detention, PU#/PO#, appointments", async () => {
    await duplicateLoadAction("load-src")
    const [, input] = createLoadMock.mock.calls[0]

    expect(input.customer_reference).toBeNull()
    // Earned detention stays on the trip it accrued on; other accessorials recur.
    expect(input.accessorials).toEqual([{ label: "Lumper", amount_cents: 7500 }])

    expect(input.stops).toHaveLength(2)
    const [pickup, delivery] = input.stops
    expect(pickup).toMatchObject({
      type: "pickup", facility: "Kent Cold Storage", address: "123 Rail Ave",
      city: "Kent", state: "WA", zip: "98032", fcfs: false,
      lat: 47.38, lng: -122.23, notes: "Dock 14, check in at guard shack",
      pickup_number: null, po_number: null, appt_start: null, appt_end: null,
    })
    expect(delivery).toMatchObject({
      type: "delivery", city: "Boise", state: "ID", fcfs: true,
      pickup_number: null, po_number: null, appt_start: null, appt_end: null,
    })
  })

  it("records provenance: a note event on the copy and an audit row naming the source", async () => {
    await duplicateLoadAction("load-src")
    expect(addLoadEventMock).toHaveBeenCalledWith(
      "carrier-1", "load-new", "note",
      { note: "Duplicated from THD-1001" },
      { id: "user-1", name: "Dana" }
    )
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      carrierId: "carrier-1", entityType: "load", entityId: "load-new", action: "create",
      newValue: expect.objectContaining({ duplicated_from: "THD-1001" }),
    }))
  })
})
