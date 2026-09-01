/**
 * Regression: requestCoiAction used a bare UPDATE + jsonb_set on
 * '{insurance,agentEmail}'. jsonb_set cannot create a missing insurance
 * parent, and a missing carrier_settings row matched 0 rows — both paths
 * returned ok after the COI email went out but forgot the agent. Upsert and
 * seed {insurance} like updateOfficeEmailAction / setBrandAccentAction.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { isEmailConfigured, sendMail } = vi.hoisted(() => ({
  isEmailConfigured: vi.fn(() => true),
  sendMail: vi.fn(async (_message: Record<string, unknown>) => ({})),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(),
}))

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

vi.mock("@/lib/hub/settings", () => ({
  getCarrier: vi.fn(async () => ({
    name: "Thind Transport",
    dot_number: "2523064",
    mc_number: "876103",
  })),
  getCarrierSettings: vi.fn(async () => ({})),
}))

vi.mock("@/lib/mailer", () => ({
  isEmailConfigured,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn((name: string) => `"${name}" <noreply@example.com>`),
}))

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { requestCoiAction } from "@/app/hub/_actions/packet"

const requirePermissionMock = vi.mocked(requirePermission)
const queryMock = vi.mocked(query)
const revalidatePathMock = vi.mocked(revalidatePath)

const CARRIER_ID = "55555555-5555-5555-5555-555555555555"
const COMPLIANCE = {
  id: "u1",
  name: "Priya",
  email: "p@a.com",
  role: "accountant" as const,
  carrierId: CARRIER_ID,
}

beforeEach(() => {
  requirePermissionMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  revalidatePathMock.mockReset()
  isEmailConfigured.mockReset()
  isEmailConfigured.mockReturnValue(true)
  sendMail.mockReset()
  sendMail.mockResolvedValue({})
})

describe("requestCoiAction", () => {
  it("rejects without compliance:write before any send or write", async () => {
    requirePermissionMock.mockRejectedValue(new Error("Forbidden"))
    const result = await requestCoiAction({
      agentEmail: "agent@example.com",
      certificateHolder: "Acme Broker",
    })
    expect(result.ok).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
    expect(requirePermissionMock).toHaveBeenCalledWith("compliance:write")
  })

  it("rejects a missing @ before any send or write", async () => {
    requirePermissionMock.mockResolvedValue(COMPLIANCE)
    const result = await requestCoiAction({
      agentEmail: "not-an-email",
      certificateHolder: "Acme Broker",
    })
    expect(result).toEqual({ ok: false, error: "Enter the agent's email" })
    expect(sendMail).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("does not write when SMTP is not configured", async () => {
    requirePermissionMock.mockResolvedValue(COMPLIANCE)
    isEmailConfigured.mockReturnValue(false)
    const result = await requestCoiAction({
      agentEmail: "agent@example.com",
      certificateHolder: "Acme Broker",
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Email not configured/)
    expect(sendMail).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("seeds the insurance parent and upserts a missing settings row after send", async () => {
    requirePermissionMock.mockResolvedValue(COMPLIANCE)
    const result = await requestCoiAction({
      agentEmail: "  agent@example.com  ",
      certificateHolder: "Acme Broker",
    })
    expect(result).toEqual({ ok: true })
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "agent@example.com",
      subject: "COI request — certificate holder: Acme Broker",
    })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.carrier_settings")
    expect(String(sql)).toContain("ON CONFLICT (carrier_id) DO UPDATE")
    expect(String(sql)).toMatch(/'\{insurance\}',\s*COALESCE/)
    expect(String(sql)).toContain("'{insurance,agentEmail}'")
    expect(params).toEqual([CARRIER_ID, "agent@example.com"])
    expect(revalidatePathMock).toHaveBeenCalledWith("/hub/settings/packet")
  })

  it("does not remember the agent when sendMail throws", async () => {
    requirePermissionMock.mockResolvedValue(COMPLIANCE)
    sendMail.mockRejectedValueOnce(new Error("SMTP timeout"))
    const result = await requestCoiAction({
      agentEmail: "agent@example.com",
      certificateHolder: "Acme Broker",
    })
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })
})
