/**
 * Regression (daily-workflow friction, flagged in 727ba61b's note): submitDvir
 * grounds the truck on ANY unsafe defect regardless of trip type (see
 * dvir-pretrip-grounding.test.ts), but truckDvirState's "still open?" query
 * only ever looked at type='post' defective DVIRs. A reviewing pre-trip that
 * found its own new unsafe defect became the new open DVIR in the 396.13
 * review chain (the post-trip it reviewed now has a row referencing it via
 * prior_dvir_id, so it's no longer "open") — but that pre-trip was invisible
 * to truckDvirState, so the driver/office UI reported "clear" on a
 * grounded truck.
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { queryOne } from "../db"
import { truckDvirState } from "../dvir"

const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const TRUCK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

describe("truckDvirState covers pre-trip groundings, not just post-trip", () => {
  it("does not restrict the open-defect lookup to type = 'post'", async () => {
    await truckDvirState(CARRIER, TRUCK)
    const sql = String(queryOneMock.mock.calls[0][0])
    expect(sql).not.toMatch(/v\.type\s*=\s*'post'/)
  })

  it("still requires defects present and no reviewing DVIR, scoped to this carrier/truck", async () => {
    await truckDvirState(CARRIER, TRUCK)
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("jsonb_array_length(v.defects) > 0")
    expect(String(sql)).toContain("r.prior_dvir_id = v.id AND r.carrier_id = v.carrier_id AND r.truck_id = v.truck_id")
    expect(params).toEqual([CARRIER, TRUCK])
  })

  it("reports awaiting_repair for an uncertified pre-trip grounding", async () => {
    queryOneMock.mockResolvedValueOnce({
      id: "dvir-pre-1",
      truck_id: TRUCK,
      driver_id: "driver-1",
      type: "pre",
      odometer: null,
      checklist: [],
      defects: [{ label: "Steering" }],
      safe_to_operate: false,
      signed_name: "Sam Grewal",
      prior_dvir_id: "dvir-post-0",
      repair_certified_by_name: null,
      repair_certified_at: null,
      created_at: "2026-07-20T00:00:00Z",
    } as never)

    const result = await truckDvirState(CARRIER, TRUCK)
    expect(result.state).toBe("awaiting_repair")
    expect(result.openDvir?.type).toBe("pre")
  })

  it("reports awaiting_review for a certified pre-trip grounding not yet reviewed", async () => {
    queryOneMock.mockResolvedValueOnce({
      id: "dvir-pre-2",
      truck_id: TRUCK,
      driver_id: "driver-1",
      type: "pre",
      odometer: null,
      checklist: [],
      defects: [{ label: "Brakes" }],
      safe_to_operate: false,
      signed_name: "Sam Grewal",
      prior_dvir_id: null,
      repair_certified_by_name: "Shop Mgr",
      repair_certified_at: "2026-07-21T00:00:00Z",
      created_at: "2026-07-20T00:00:00Z",
    } as never)

    const result = await truckDvirState(CARRIER, TRUCK)
    expect(result.state).toBe("awaiting_review")
    expect(result.openDvir?.type).toBe("pre")
  })
})
