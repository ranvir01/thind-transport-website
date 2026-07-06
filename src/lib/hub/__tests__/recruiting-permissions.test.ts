/**
 * Regression: recruiting.ts, vetting.ts, and portal.ts action files gated
 * their mutations behind requireOfficeUser() (any office role) instead of
 * requirePermission(...) — since accountant lacks drivers:write/customers:write
 * in the role matrix (permissions.ts), this let an accountant hire/convert
 * applicants, sign offers, and invite portal users despite the permission
 * matrix saying they shouldn't be able to. (1c tenancy+permissions audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async (action: string) => ({
    id: "u1", name: "Accountant", carrierId: "carrier-1", role: "accountant", action,
  })),
  requirePortalUser: vi.fn(async () => ({ carrierId: "carrier-1", customerId: "cust-1", name: "Broker" })),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/recruiting", () => ({
  attachReferral: vi.fn(async () => undefined),
  convertApplicantToDriver: vi.fn(async () => ({ ok: true, driverId: "d1" })),
  createApplicant: vi.fn(async () => ({ id: "a1" })),
  createOffer: vi.fn(async () => "offer-1"),
  importPublicApplicants: vi.fn(async () => ({ imported: 0 })),
  moveApplicantStage: vi.fn(async () => ({ ok: true })),
  signOffer: vi.fn(async () => true),
  toggleOrientationItem: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/vetting", () => ({
  vetCustomer: vi.fn(async () => ({ allowed_to_operate: true, risk_score: 90 })),
  fmcsaConfigured: vi.fn(() => true),
  avgDaysToPay: vi.fn(async () => ({ slowPayer: false, avgDays: 0 })),
  creditExposure: vi.fn(async () => ({ overLimit: false, openCents: 0, creditLimitCents: null })),
  latestVetting: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/portal", () => ({
  createPortalInvitation: vi.fn(async () => ({ token: "tok" })),
  acceptInvitation: vi.fn(async () => ({ ok: true })),
  createQuoteRequest: vi.fn(async () => ({ reference: "Q-1" })),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(async () => ({ name: "Demo" })) }))
vi.mock("@/lib/hub/db", () => ({ queryOne: vi.fn(async () => ({ id: "cust-1", name: "Acme" })) }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(() => ({ sendMail: vi.fn(async () => undefined) })),
  isEmailConfigured: vi.fn(() => false),
  mailFrom: vi.fn(() => "carrier@example.com"),
}))

import { addApplicantAction, attachReferralAction, convertApplicantAction } from "@/app/hub/_actions/recruiting"
import { vetCustomerAction } from "@/app/hub/_actions/vetting"
import { invitePortalUserAction } from "@/app/hub/_actions/portal"
import { logAudit } from "@/lib/hub/audit"
import { requirePermission } from "@/lib/hub/session"

const logAuditMock = vi.mocked(logAudit)
const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => {
  requirePermissionMock.mockClear()
  logAuditMock.mockClear()
})

describe("attachReferralAction", () => {
  it("logs an audit entry for the referral bonus (money-adjacent)", async () => {
    const result = await attachReferralAction("a1", "driver-1", "500.00")
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "referral", action: "attached" })
    )
  })
})

describe("recruiting actions require drivers:write, not just any office role", () => {
  it("addApplicantAction checks drivers:write", async () => {
    await addApplicantAction({ firstName: "Dana", lastName: "Lee" })
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
  })

  it("convertApplicantAction checks drivers:write", async () => {
    await convertApplicantAction("a1", { payType: "per_mile", payRate: "0.55", hireDate: "2026-08-01" })
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
  })
})

describe("vetCustomerAction requires customers:write, not any office role", () => {
  it("checks customers:write", async () => {
    await vetCustomerAction("cust-1")
    expect(requirePermissionMock).toHaveBeenCalledWith("customers:write")
  })
})

describe("invitePortalUserAction requires customers:write, not any office role", () => {
  it("checks customers:write", async () => {
    await invitePortalUserAction({ customerId: "cust-1", email: "broker@example.com", role: "broker" })
    expect(requirePermissionMock).toHaveBeenCalledWith("customers:write")
  })
})
