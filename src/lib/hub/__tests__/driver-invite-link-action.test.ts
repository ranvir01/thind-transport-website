/**
 * driverInviteLinkAction hands the office a scannable invite URL for an
 * in-person handoff. It must be gated and audited exactly like the emailed
 * invite, mint a token that the accept page will verify for THIS carrier +
 * driver + email, and produce a URL the QR encoder can actually render.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Maya Dispatch", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/drivers", () => ({
  getDriver: vi.fn(async () => ({ id: "driver-1", email: "sam@example.com", first_name: "Sam" })),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
}))
vi.mock("@/lib/hub/driver-invite", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/hub/driver-invite")>()
  return { ...real, hasDriverAppAccount: vi.fn(async () => false), sendDriverInviteEmail: vi.fn() }
})
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(async () => ({ name: "Thind Transport" })) }))
vi.mock("@/lib/hub/customers", () => ({}))
vi.mock("@/lib/hub/users", () => ({}))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

vi.stubEnv("NEXTAUTH_SECRET", "test-secret-for-invite-tokens")
vi.stubEnv("NEXTAUTH_URL", "https://thindtransport.com")

import { requirePermission } from "@/lib/hub/session"
import { hasDriverAppAccount, verifyDriverInviteToken } from "@/lib/hub/driver-invite"
import { logAudit } from "@/lib/hub/audit"
import { qrMatrix } from "@/lib/hub/qr"
import { driverInviteLinkAction } from "@/app/hub/_actions/people"

const requirePermissionMock = vi.mocked(requirePermission)
const hasAccountMock = vi.mocked(hasDriverAppAccount)
const logAuditMock = vi.mocked(logAudit)

beforeEach(() => {
  logAuditMock.mockClear()
  hasAccountMock.mockResolvedValue(false)
  requirePermissionMock.mockResolvedValue({ id: "u1", name: "Maya Dispatch", carrierId: "carrier-1" } as never)
})

describe("driverInviteLinkAction", () => {
  it("returns a verifiable invite URL for this carrier + driver + email, and audits it", async () => {
    const result = await driverInviteLinkAction("driver-1")
    expect(result.ok).toBe(true)
    expect(result.email).toBe("sam@example.com")
    expect(result.url).toMatch(/^https:\/\/thindtransport\.com\/hub\/driver-invite\//)

    const token = result.url!.split("/hub/driver-invite/")[1]
    expect(verifyDriverInviteToken(token)).toEqual({
      carrierId: "carrier-1",
      driverId: "driver-1",
      email: "sam@example.com",
    })
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: "carrier-1", entityId: "driver-1", action: "show_app_invite_qr" })
    )
  })

  it("produces a URL the QR encoder can render — the whole point of the handoff", async () => {
    const result = await driverInviteLinkAction("driver-1")
    expect(() => qrMatrix(result.url!)).not.toThrow()
  })

  it("is gated by drivers:write like the emailed invite", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden"))
    const result = await driverInviteLinkAction("driver-1")
    expect(result.ok).toBe(false)
    expect(result.url).toBeUndefined()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("refuses once the driver already has app access — no second invitation to a claimed account", async () => {
    hasAccountMock.mockResolvedValueOnce(true)
    const result = await driverInviteLinkAction("driver-1")
    expect(result).toEqual({ ok: false, error: "This driver already has app access" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})
