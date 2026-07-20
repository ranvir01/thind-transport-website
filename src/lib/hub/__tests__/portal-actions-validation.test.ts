/**
 * Portal-subsystem audit: server actions take client-controlled JSON, so the
 * TS unions on `role` and `equipment` are not enforcement. Both are backstopped
 * by DB CHECK constraints, but the actions must refuse bad values themselves —
 * an invitation's role becomes the created account's hub role, and external
 * quote input should fail with a friendly error, not a constraint violation
 * after the transaction started.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "u-office", name: "Dana", email: "dana@carrier.test", role: "dispatcher", carrierId: "carrier-1",
  })),
  requirePortalUser: vi.fn(async () => ({
    id: "u-portal", name: "Sam", email: "sam@shipper.test", role: "shipper",
    carrierId: "carrier-1", customerId: "cust-1", portalRole: "shipper",
  })),
}))
vi.mock("@/lib/hub/portal", () => ({
  acceptInvitation: vi.fn(),
  createPortalInvitation: vi.fn(async () => ({ token: "tok" })),
  createQuoteRequest: vi.fn(async () => ({ reference: "THD-1001" })),
  portalFileVisible: vi.fn(),
}))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => ({ id: "cust-1", name: "Acme" })),
  hubDb: vi.fn(),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(async () => ({ name: "Carrier" })) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  mailFrom: vi.fn(() => "noreply@test"),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createPortalInvitation, createQuoteRequest } from "@/lib/hub/portal"
import { invitePortalUserAction, portalQuoteRequestAction } from "@/app/hub/_actions/portal"

const inviteMock = vi.mocked(createPortalInvitation)
const quoteMock = vi.mocked(createQuoteRequest)

beforeEach(() => {
  inviteMock.mockClear()
  quoteMock.mockClear()
})

describe("invitePortalUserAction role allowlist", () => {
  it("refuses any role outside broker/shipper before touching the DB", async () => {
    const result = await invitePortalUserAction({
      customerId: "cust-1", email: "mallory@x.test", role: "owner" as never,
    })
    expect(result.ok).toBe(false)
    expect(inviteMock).not.toHaveBeenCalled()
  })

  it("still invites a broker", async () => {
    const result = await invitePortalUserAction({
      customerId: "cust-1", email: "bree@broker.test", role: "broker",
    })
    expect(result.ok).toBe(true)
    expect(inviteMock).toHaveBeenCalledWith("carrier-1", "cust-1", "bree@broker.test", "broker", "Dana")
  })
})

describe("portalQuoteRequestAction equipment allowlist", () => {
  const base = { originCity: "Kent", originState: "WA", destCity: "Boise", destState: "ID" }

  it("refuses equipment outside flatbed/reefer/dry_van", async () => {
    const result = await portalQuoteRequestAction({ ...base, equipment: "tanker" as never })
    expect(result.ok).toBe(false)
    expect(quoteMock).not.toHaveBeenCalled()
  })

  it("still accepts a valid quote request", async () => {
    const result = await portalQuoteRequestAction({ ...base, equipment: "reefer" })
    expect(result.ok).toBe(true)
    expect(result.reference).toBe("THD-1001")
  })
})
