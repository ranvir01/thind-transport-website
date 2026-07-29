/**
 * Regression: postCapacityAction inserted an unvalidated truckId straight
 * onto hub.capacity_postings, and the capacity page's read join had no
 * carrier_id guard on the joined truck — together, posting capacity against
 * a foreign carrier's truckId leaked that truck's unit_number onto the
 * current tenant's /hub/capacity page. (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  // capacity postings hit the public load board — the action gates on
  // loads:write now, not "any office role".
  requirePermission: vi.fn(async () => ({ carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { query } from "@/lib/hub/db"
import { assertCarrierRefs } from "@/lib/hub/tenancy"
import { postCapacityAction } from "@/app/hub/_actions/capacity"

const queryMock = vi.mocked(query)
const assertRefsMock = vi.mocked(assertCarrierRefs)

describe("postCapacityAction", () => {
  beforeEach(() => {
    queryMock.mockClear()
    assertRefsMock.mockClear()
  })

  it("validates truckId belongs to the caller's carrier before inserting", async () => {
    await postCapacityAction({
      truckId: "foreign-truck",
      equipment: "dry_van",
      availableOn: "2026-08-01",
      originCity: "Seattle",
      originState: "WA",
    })
    expect(assertRefsMock).toHaveBeenCalledWith("carrier-1", { truck_id: "foreign-truck" })
    expect(assertRefsMock.mock.invocationCallOrder[0]).toBeLessThan(queryMock.mock.invocationCallOrder[0])
  })

  it("rejects the post when the truck doesn't belong to the caller's carrier", async () => {
    assertRefsMock.mockRejectedValueOnce(new Error("Truck not found"))
    const result = await postCapacityAction({
      truckId: "foreign-truck",
      equipment: "dry_van",
      availableOn: "2026-08-01",
      originCity: "Seattle",
      originState: "WA",
    })
    expect(result).toEqual({ ok: false, error: "Truck not found" })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
