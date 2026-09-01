/**
 * fileDriverIncidentReport used to hand-roll getHubUser + role === "driver"
 * and a users lookup that omitted `AND active` and the carrier-status
 * re-check. A deactivated driver (or a driver on a suspended tenant) could
 * still file a first report for the life of the JWT. requireDriverUser()
 * is the same guard every other driver mutation uses.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(),
  requireDriverUser: vi.fn(),
}))
vi.mock("@/lib/hub/incidents", () => ({
  createIncident: vi.fn(async () => ({ id: "inc-1" })),
  updateIncident: vi.fn(),
}))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { fileDriverIncidentReport } from "@/app/hub/_actions/safety"
import { requireDriverUser } from "@/lib/hub/session"
import { createIncident } from "@/lib/hub/incidents"
import { logAudit } from "@/lib/hub/audit"
import { queryOne } from "@/lib/hub/db"

const requireDriverUserMock = vi.mocked(requireDriverUser)
const createIncidentMock = vi.mocked(createIncident)
const logAuditMock = vi.mocked(logAudit)
const queryOneMock = vi.mocked(queryOne)

const DRIVER = {
  id: "u1",
  name: "Sam Driver",
  email: "sam@driver.test",
  role: "driver" as const,
  carrierId: "carrier-1",
  driverId: "driver-1",
}

const input = {
  occurredAt: "2026-08-19T12:00:00.000Z",
  location: "I-5 MP 142",
  description: "Rear-end, no injuries",
  fatality: false,
  injuryTreatedAway: false,
  towAwayDisabling: true,
}

beforeEach(() => {
  requireDriverUserMock.mockReset()
  createIncidentMock.mockClear()
  logAuditMock.mockClear()
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
  requireDriverUserMock.mockResolvedValue(DRIVER)
})

describe("fileDriverIncidentReport", () => {
  it("goes through requireDriverUser and files against that driverId", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "truck-9" })

    const result = await fileDriverIncidentReport(input)

    expect(result).toEqual({ ok: true, id: "inc-1" })
    expect(requireDriverUserMock).toHaveBeenCalledOnce()
    expect(createIncidentMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({
        driverId: "driver-1",
        truckId: "truck-9",
        location: "I-5 MP 142",
        towAwayDisabling: true,
      }),
      { id: "u1", name: "Sam Driver" }
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "incident", action: "driver_first_report" })
    )
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toMatch(/hub\.trucks/)
    expect(String(sql)).not.toMatch(/hub\.users/)
    expect(params).toEqual(["carrier-1", "driver-1"])
  })

  it("does not insert when requireDriverUser rejects (inactive, unlinked, or suspended)", async () => {
    requireDriverUserMock.mockRejectedValueOnce(new Error("REDIRECT:/hub/welcome"))

    const result = await fileDriverIncidentReport(input)

    expect(result.ok).toBe(false)
    expect(createIncidentMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(queryOneMock).not.toHaveBeenCalled()
  })
})
