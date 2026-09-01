/**
 * Regression: patchLoadBoardFieldAction always checked loads:write, even for
 * field === "status" (which the permission matrix gates separately via
 * loads:status). Defense-in-depth for the day a role holds one but not the
 * other. (1c tenancy+permissions audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async (action: string) => ({
    id: "u1", name: "Dispatcher", carrierId: "carrier-1", action,
  })),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/loadboard", () => ({
  patchLoadBoardField: vi.fn(async () => ({ id: "load-1" })),
}))

import { requirePermission } from "@/lib/hub/session"
import { patchLoadBoardFieldAction } from "@/app/hub/_actions/loadboard"

const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => requirePermissionMock.mockClear())

describe("patchLoadBoardFieldAction", () => {
  it("checks loads:status for the status field", async () => {
    await patchLoadBoardFieldAction("load-1", "status", "dispatched")
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:status")
  })

  it("checks loads:write for every other field", async () => {
    await patchLoadBoardFieldAction("load-1", "linehaul", "1500.00")
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
  })
})
