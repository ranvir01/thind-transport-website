/**
 * Permission gate per action for the office server actions that had none.
 *
 * capacity.ts, comms.ts, facilities.ts and tasks.ts gated on requireOfficeUser
 * alone — signed in and not a driver. That is not the permission matrix, and
 * AGENTS.md is explicit that permissions are enforced in server actions, never
 * UI-only. The practical hole: an accountant, who holds neither loads:write
 * nor drivers:write, could post and delete truck capacity on the PUBLIC load
 * board, publish company-wide announcements, demand documents from a named
 * driver, and approve or deny time off.
 *
 * packet.ts is the same class: emailPacketAction mails the carrier packet to
 * an arbitrary address under the carrier's own MC number.
 *
 * Same table-drive as money-actions-permissions.test.ts: assert the exact
 * string each action requires, and assert the underlying lib function is never
 * reached when the gate throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "u1", name: "Office User", email: "office@thind.test",
    role: "owner", carrierId: "carrier-1",
  })),
}))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => [{ id: "row-1" }]),
  queryOne: vi.fn(async () => ({ id: "driver-1", name: "Harpreet Singh" })),
}))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/notify", () => ({ notifyDriver: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/announcements", () => ({
  createAnnouncement: vi.fn(async () => ({ id: "ann-1" })),
}))
vi.mock("@/lib/hub/timeoff", () => ({
  decideTimeOff: vi.fn(async () => ({ driver_id: "driver-1", start_date: "2026-01-01", end_date: "2026-01-02" })),
}))
vi.mock("@/lib/hub/tasks", () => ({
  createTask: vi.fn(async () => undefined),
  completeTask: vi.fn(async () => ({ next: null })),
  reopenTask: vi.fn(async () => undefined),
  toggleChecklistItem: vi.fn(async () => undefined),
  deleteTask: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/facilities", () => ({
  addFacilityNote: vi.fn(async () => true),
  updateFacilityInfo: vi.fn(async () => undefined),
  detentionRisk: vi.fn(() => null),
  formatDwell: vi.fn(() => "2h"),
}))
vi.mock("@/lib/hub/settings", () => ({
  getCarrierSettings: vi.fn(async () => ({ detention: { freeHours: 2 } })),
  getCarrier: vi.fn(async () => ({ name: "Thind Transport", dot_number: "1", mc_number: "2" })),
}))
vi.mock("@/lib/hub/packet", () => ({
  emailPacket: vi.fn(async () => ({ sent: true, attached: 3 })),
  signBrokerAgreement: vi.fn(async () => undefined),
}))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  createMailTransport: vi.fn(() => ({ sendMail: vi.fn(async () => undefined) })),
  mailFrom: vi.fn((n: string) => n),
}))

import { requirePermission } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { postCapacityAction, removeCapacityAction } from "@/app/hub/_actions/capacity"
import {
  cancelDocumentRequestAction, createAnnouncementAction, decideTimeOffAction, requestDocumentAction,
} from "@/app/hub/_actions/comms"
import {
  addOfficeFacilityNoteAction, facilityLookupAction, updateFacilityAction,
} from "@/app/hub/_actions/facilities"
import {
  completeTaskAction, createTaskAction, deleteTaskAction, reopenTaskAction, toggleChecklistAction,
} from "@/app/hub/_actions/tasks"
import { emailPacketAction, requestCoiAction, savedAgentEmail } from "@/app/hub/_actions/packet"
import { emailPacket } from "@/lib/hub/packet"
import { createAnnouncement } from "@/lib/hub/announcements"
import { decideTimeOff } from "@/lib/hub/timeoff"
import { createTask } from "@/lib/hub/tasks"
import { updateFacilityInfo } from "@/lib/hub/facilities"

const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => {
  vi.clearAllMocks()
  requirePermissionMock.mockResolvedValue({
    id: "u1", name: "Office User", email: "office@thind.test",
    role: "owner", carrierId: "carrier-1",
  })
})

const cases: Array<[string, string, () => Promise<unknown>]> = [
  // capacity.ts — these render on the PUBLIC /load-board.
  ["postCapacityAction", "loads:write", () =>
    postCapacityAction({ equipment: "dry_van", availableOn: "2026-01-01", originCity: "Kent", originState: "WA" })],
  ["removeCapacityAction", "loads:write", () => removeCapacityAction("cap-1")],

  // comms.ts — every one of these directs or affects a driver.
  ["createAnnouncementAction", "drivers:write", () =>
    createAnnouncementAction({ title: "Chains", body: "Snoqualmie", audience: "drivers", requiresAck: true })],
  ["requestDocumentAction", "drivers:write", () =>
    requestDocumentAction({ driverId: "driver-1", kind: "pod" })],
  ["cancelDocumentRequestAction", "drivers:write", () => cancelDocumentRequestAction("req-1")],
  ["decideTimeOffAction", "drivers:write", () => decideTimeOffAction("to-1", "approved")],

  // facilities.ts — dispatch reference data; the lookup is read-tier.
  ["facilityLookupAction", "loads:read", () => facilityLookupAction({ name: "Costco DC" })],
  ["updateFacilityAction", "loads:write", () => updateFacilityAction("fac-1", { hours: "0600-1400" })],
  ["addOfficeFacilityNoteAction", "loads:write", () => addOfficeFacilityNoteAction("fac-1", "Slow dock", [])],

  // tasks.ts — the matrix had no tasks:* action at all until now.
  ["createTaskAction", "tasks:write", () => createTaskAction({ title: "Call the broker" })],
  ["completeTaskAction", "tasks:write", () => completeTaskAction("task-1")],
  ["reopenTaskAction", "tasks:write", () => reopenTaskAction("task-1")],
  ["toggleChecklistAction", "tasks:write", () => toggleChecklistAction("task-1", 0, true)],
  ["deleteTaskAction", "tasks:write", () => deleteTaskAction("task-1")],

  // packet.ts — outbound mail under the carrier's own MC number.
  ["emailPacketAction", "customers:write", () => emailPacketAction("broker@example.com")],
  ["requestCoiAction", "compliance:write", () =>
    requestCoiAction({ agentEmail: "agent@example.com", certificateHolder: "Acme" })],
  ["savedAgentEmail", "compliance:read", () => savedAgentEmail()],
]

describe("office server actions — permission gate per action", () => {
  for (const [name, expectedPermission, run] of cases) {
    it(`${name} requires ${expectedPermission}`, async () => {
      await run()
      expect(requirePermissionMock).toHaveBeenCalledWith(expectedPermission)
      expect(requirePermissionMock).toHaveBeenCalledTimes(1)
    })
  }

  it("gates every action — none falls back to requireOfficeUser", async () => {
    for (const [name, , run] of cases) {
      requirePermissionMock.mockClear()
      await run()
      expect(requirePermissionMock, `${name} never called requirePermission`).toHaveBeenCalledTimes(1)
    }
  })
})

describe("the matrix actually refuses the roles this was about", () => {
  // Unmocked: the real matrix. Naming a permission string only helps if that
  // string excludes somebody, so pin the exploit from the work order rather
  // than trusting that "requires loads:write" means anything.
  it("an accountant holds neither loads:write nor drivers:write", () => {
    expect(can("accountant", "loads:write")).toBe(false)
    expect(can("accountant", "drivers:write")).toBe(false)
    expect(can("accountant", "customers:write")).toBe(false)
  })

  it("an accountant keeps the permissions their own job needs", () => {
    for (const action of ["money:write", "money:approve", "compliance:write", "tasks:write"] as const) {
      expect(can("accountant", action)).toBe(true)
    }
  })

  it("a dispatcher can still run capacity, comms, facilities and tasks", () => {
    for (const action of ["loads:write", "loads:read", "drivers:write", "tasks:write"] as const) {
      expect(can("dispatcher", action)).toBe(true)
    }
  })

  it("no non-office role reaches any of these gates", () => {
    for (const role of ["driver", "broker", "shipper"] as const) {
      for (const action of ["loads:write", "loads:read", "drivers:write", "tasks:write", "customers:write", "compliance:write", "compliance:read"] as const) {
        expect(can(role, action), `${role} must not hold ${action}`).toBe(false)
      }
    }
  })
})

describe("a refused gate reaches no lib function", () => {
  // The gate throwing is only half the guarantee; the action must not have
  // done the work first. Each pair is (action, the lib call it would make).
  const guarded: Array<[string, () => Promise<unknown>, () => unknown]> = [
    ["emailPacketAction", () => emailPacketAction("broker@example.com"), () => emailPacket],
    ["createAnnouncementAction", () =>
      createAnnouncementAction({ title: "t", body: "b", audience: "all", requiresAck: false }), () => createAnnouncement],
    ["decideTimeOffAction", () => decideTimeOffAction("to-1", "approved"), () => decideTimeOff],
    ["createTaskAction", () => createTaskAction({ title: "t" }), () => createTask],
    ["updateFacilityAction", () => updateFacilityAction("fac-1", { hours: "x" }), () => updateFacilityInfo],
  ]

  for (const [name, run, target] of guarded) {
    it(`${name} does no work when the permission is refused`, async () => {
      requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: accountant cannot do this"))
      const result = (await run()) as { ok?: boolean; error?: string }
      expect(vi.mocked(target() as never)).not.toHaveBeenCalled()
      // Surfaces as a business error, not a crash — actionError passes
      // "Forbidden: ..." through rather than swallowing it as internal.
      if (result && "ok" in result) {
        expect(result.ok).toBe(false)
        expect(result.error).toMatch(/Forbidden/)
      }
    })
  }
})
