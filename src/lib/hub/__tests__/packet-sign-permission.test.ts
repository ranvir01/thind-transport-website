/**
 * Regression (1c tenancy audit, 2026-07-26): signAgreementAction gated on
 * requireOfficeUser() only, letting an accountant e-sign broker–carrier
 * agreements (a document + CRM activity written onto a customer) despite
 * holding no customers:write in the matrix. Pinned to customers:write.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOfficeUser: vi.fn(),
  requirePermission: vi.fn(async () => ({
    id: "u1", name: "Dispatcher", email: "d@x.test", role: "dispatcher", carrierId: "carrier-1",
  })),
}))
vi.mock("@/lib/hub/packet", () => ({
  emailPacket: vi.fn(async () => ({ attached: 0 })),
  signBrokerAgreement: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/settings", () => ({
  getCarrier: vi.fn(async () => null),
  getCarrierSettings: vi.fn(async () => ({})),
}))
vi.mock("@/lib/mailer", () => ({ isEmailConfigured: vi.fn(() => false) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))

import { requirePermission } from "@/lib/hub/session"
import { signBrokerAgreement } from "@/lib/hub/packet"
import { signAgreementAction } from "@/app/hub/_actions/packet"

const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => vi.clearAllMocks())

describe("signAgreementAction", () => {
  it("requires customers:write before signing", async () => {
    requirePermissionMock.mockResolvedValue({
      id: "u1", name: "Dispatcher", email: "d@x.test", role: "dispatcher", carrierId: "carrier-1",
    } as never)
    const res = await signAgreementAction("cust-1", {
      signerName: "Sam Doe", signerTitle: "Owner", signature: "data:image/png;base64,x",
    })
    expect(res.ok).toBe(true)
    expect(requirePermissionMock).toHaveBeenCalledWith("customers:write")
    expect(vi.mocked(signBrokerAgreement)).toHaveBeenCalledTimes(1)
  })

  it("a Forbidden throw blocks the signature write", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: accountant cannot customers:write"))
    const res = await signAgreementAction("cust-1", {
      signerName: "Sam Doe", signerTitle: "Owner", signature: "data:image/png;base64,x",
    })
    expect(res.ok).toBe(false)
    expect(vi.mocked(signBrokerAgreement)).not.toHaveBeenCalled()
  })
})
