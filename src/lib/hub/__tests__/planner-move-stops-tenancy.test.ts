/**
 * plannerMoveLoadAction's double-booking probe joins hub.stops by load_id
 * only. A foreign stop sharing that UUID would shift the overlap window
 * (AGENTS.md: laterals pin carrier_id on both sides — same pattern as
 * assignFuelToLoad / portalLoads).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({
  addLoadEvent: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/drivers", () => ({
  dispatchLegality: vi.fn(),
}))
vi.mock("@/lib/hub/timeoff", () => ({
  driverTimeOffConflict: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(),
}))

import { queryOne } from "@/lib/hub/db"
import { plannerMoveLoadAction } from "@/app/hub/_actions/planner"

const queryOneMock = vi.mocked(queryOne)

const LOAD = {
  id: "load-1",
  reference: "LD-1",
  status: "booked",
  truck_id: "truck-1",
  driver_id: null as string | null,
}

beforeEach(() => {
  queryOneMock.mockReset()
  queryOneMock.mockImplementation(async (sql: string) => {
    if (sql.includes("SELECT id, reference, status, truck_id, driver_id")) return LOAD
    if (sql.includes("AS starts")) return { starts: "2026-08-19", ends: "2026-08-21" }
    if (sql.includes("COUNT(*) AS count")) return { count: "0" }
    return null
  })
})

describe("plannerMoveLoadAction double-booking stop lateral", () => {
  it("pins the overlap-window stops lateral to the load's carrier", async () => {
    const result = await plannerMoveLoadAction("load-1", { dayDelta: 0 })
    expect(result.ok).toBe(true)

    const overlapSql = queryOneMock.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes("COUNT(*) AS count") && sql.includes("FROM hub.stops"))
    expect(overlapSql).toBeTruthy()
    expect(overlapSql).toContain("FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id")
  })
})
