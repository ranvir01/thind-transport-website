/**
 * Office-side driver-app invite resend (drivers detail page): covers the two
 * gaps that had no retry path — a manually-added driver with no invite yet,
 * and a driver whose 7-day link expired before they used it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/drivers", () => ({ getDriver: vi.fn(), createDriver: vi.fn(), updateDriver: vi.fn() }))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(async () => ({ name: "Demo Carrier" })) }))
const { sendDriverInviteEmailMock } = vi.hoisted(() => ({
  sendDriverInviteEmailMock: vi.fn(async () => true),
}))
vi.mock("@/lib/hub/driver-invite", () => ({
  hasDriverAppAccount: vi.fn(async () => false),
  sendDriverInviteEmail: sendDriverInviteEmailMock,
}))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  mailFrom: vi.fn((name: string) => `"${name}" <noreply@test>`),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/customers", () => ({}))
vi.mock("@/lib/hub/users", () => ({}))
vi.mock("@/lib/hub/schemas", () => ({
  driverSchema: { safeParse: vi.fn() },
  customerSchema: { safeParse: vi.fn() },
  contactSchema: { safeParse: vi.fn() },
  hubUserSchema: { safeParse: vi.fn() },
}))

import { getDriver } from "@/lib/hub/drivers"
import { hasDriverAppAccount } from "@/lib/hub/driver-invite"
import { logAudit } from "@/lib/hub/audit"
import { resendDriverInviteAction } from "@/app/hub/_actions/people"

const getDriverMock = vi.mocked(getDriver)
const hasAppAccountMock = vi.mocked(hasDriverAppAccount)
const logAuditMock = vi.mocked(logAudit)

const DRIVER = { id: "driver-1", first_name: "Amar", last_name: "Gill", email: "amar@example.com" }

beforeEach(() => {
  vi.clearAllMocks()
  getDriverMock.mockResolvedValue(DRIVER as never)
  hasAppAccountMock.mockResolvedValue(false)
  sendDriverInviteEmailMock.mockResolvedValue(true)
})

describe("resendDriverInviteAction", () => {
  it("sends a first-send invite for a manually-added driver with no account yet", async () => {
    const result = await resendDriverInviteAction("driver-1")
    expect(result).toEqual({ ok: true })
    expect(sendDriverInviteEmailMock).toHaveBeenCalledWith(
      expect.anything(), expect.any(Function), "carrier-1", "Demo Carrier",
      { driverId: "driver-1", email: "amar@example.com", firstName: "Amar" }
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "driver", entityId: "driver-1", action: "send_app_invite" })
    )
  })

  it("resends even after a prior invite would have expired — no state blocks a retry", async () => {
    const result = await resendDriverInviteAction("driver-1")
    expect(result.ok).toBe(true)
    expect(sendDriverInviteEmailMock).toHaveBeenCalledTimes(1)
  })

  it("refuses when the driver already has app access", async () => {
    hasAppAccountMock.mockResolvedValueOnce(true)
    const result = await resendDriverInviteAction("driver-1")
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("already has app access") })
    expect(sendDriverInviteEmailMock).not.toHaveBeenCalled()
  })

  it("refuses when the driver has no email on file", async () => {
    getDriverMock.mockResolvedValueOnce({ ...DRIVER, email: null } as never)
    const result = await resendDriverInviteAction("driver-1")
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("email") })
    expect(sendDriverInviteEmailMock).not.toHaveBeenCalled()
  })

  it("returns not-found for a driver outside this carrier's roster", async () => {
    getDriverMock.mockResolvedValueOnce(null)
    const result = await resendDriverInviteAction("driver-1")
    expect(result).toEqual({ ok: false, error: "Driver not found" })
  })

  it("surfaces a send failure without throwing", async () => {
    sendDriverInviteEmailMock.mockResolvedValueOnce(false)
    const result = await resendDriverInviteAction("driver-1")
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("Could not send") })
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})
