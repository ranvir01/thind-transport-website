import { beforeEach, describe, expect, it, vi } from "vitest"

// These exercise parsing + persistence, not throttling. Without this the
// real guard writes hub.auth_attempts rows whenever POSTGRES_URL is set,
// and the suite trips its own rate limit on the second run.
vi.mock("@/lib/public-form-guard", () => ({
  honeypotTripped: vi.fn(() => false),
  publicFormBlocked: vi.fn(async () => false),
}))
vi.mock("@/lib/hub/website-leads", () => ({ saveWebsiteLead: vi.fn(async () => true) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  createMailTransport: vi.fn(),
  mailFrom: vi.fn(() => "test@test"),
}))

import { captureLead } from "../capture-lead"
import { saveWebsiteLead } from "@/lib/hub/website-leads"

const saveMock = vi.mocked(saveWebsiteLead)

describe("captureLead — the regression that ate every lead", () => {
  beforeEach(() => {
    saveMock.mockReset()
    saveMock.mockResolvedValue(true)
  })

  it("accepts the apply form's exact payload (no message field → FormData null)", async () => {
    const fd = new FormData()
    fd.append("name", "Real Driver")
    fd.append("email", "driver@example.com")
    fd.append("phone", "2065551234")
    fd.append("source", "Application Form Step 2")
    fd.append("driverType", "owner-operator-otr")
    fd.append("experienceYears", "6-10")
    const result = await captureLead({ success: false, message: "" }, fd)
    expect(result.success).toBe(true)
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "driver@example.com", phone: "2065551234", driverType: "owner-operator-otr" })
    )
  })

  it("email-only payload (footer newsletter style) also lands in the DB", async () => {
    const fd = new FormData()
    fd.append("email", "just.email@example.com")
    const result = await captureLead({ success: false, message: "" }, fd)
    expect(result.success).toBe(true)
    expect(saveMock).toHaveBeenCalled()
  })

  it("tells the driver to call only when BOTH the DB and email failed", async () => {
    saveMock.mockResolvedValue(false)
    const fd = new FormData()
    fd.append("email", "driver@example.com")
    const result = await captureLead({ success: false, message: "" }, fd)
    expect(result.success).toBe(false)
    expect(result.message).toContain("Call or text")
  })
})
