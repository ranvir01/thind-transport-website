import { beforeEach, describe, expect, it, vi } from "vitest"

// These exercise parsing + persistence, not throttling. Without this the
// real guard writes hub.auth_attempts rows whenever POSTGRES_URL is set,
// and the suite trips its own rate limit on the second run.
vi.mock("@/lib/public-form-guard", () => ({
  honeypotTripped: vi.fn(() => false),
  publicFormBlocked: vi.fn(async () => false),
}))
vi.mock("@/lib/hub/website-leads", () => ({ saveWebsiteLead: vi.fn(async () => true) }))

const { mailShouldSend, sendMail } = vi.hoisted(() => ({
  mailShouldSend: vi.fn(async () => false),
  sendMail: vi.fn(async (_message: Record<string, unknown>) => ({})),
}))

vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  mailShouldSend,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "test@test"),
}))
vi.mock("@/lib/driver-db", () => ({
  savePublicApplication: vi.fn(async () => ({ id: "legacy-1" })),
  markPublicApplicationEmailed: vi.fn(async () => {}),
}))

import { submitPreQualification } from "../submit-pre-qualification"
import { saveWebsiteLead } from "@/lib/hub/website-leads"
import { savePublicApplication, markPublicApplicationEmailed } from "@/lib/driver-db"
import { COMPANY_INFO } from "@/lib/constants"

const leadMock = vi.mocked(saveWebsiteLead)
const legacyMock = vi.mocked(savePublicApplication)
const emailedMock = vi.mocked(markPublicApplicationEmailed)

/** A fully valid pre-qualify payload (qualified path unless overridden). */
function validForm(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    firstName: "Test",
    lastName: "Driver",
    phone: "2065551234",
    email: "prequalify@example.com",
    cityState: "Kent, WA",
    ownSleeperTruck: "Yes",
    cdlExperience: "5 years",
    canDriveManual: "Yes",
    paidBiMonthly: "Yes",
    runLower40: "Yes",
    runWaToAnywhere: "Yes",
    homeTimeDuration: "Weekly",
    jobsInLast3Years: "2",
    hasRiderOrPet: "No",
    isSapDriver: "No",
    hasFelony: "No",
    accident5Year: "None",
    movingViolations5Year: "None",
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const initial = { success: false, message: "" }

describe("submitPreQualification — pre-qualify leads must reach hub.website_leads", () => {
  beforeEach(() => {
    leadMock.mockReset()
    leadMock.mockResolvedValue(true)
    legacyMock.mockReset()
    legacyMock.mockResolvedValue({ id: "legacy-1" } as never)
    emailedMock.mockReset()
    mailShouldSend.mockReset()
    mailShouldSend.mockResolvedValue(false)
    sendMail.mockClear()
  })

  it("a qualified submission lands on the speed-to-lead surface, source-tagged", async () => {
    const result = await submitPreQualification(initial, validForm())
    expect(result.success).toBe(true)
    expect(result.isQualified).toBe(true)
    expect(leadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Driver",
        email: "prequalify@example.com",
        phone: "2065551234",
        source: "Pre-qualification (qualified)",
        driverType: "owner-operator",
        experienceYears: "5 years",
      })
    )
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("a needs-review submission (SAP driver) still lands, tagged for review", async () => {
    const result = await submitPreQualification(initial, validForm({ isSapDriver: "Yes" }))
    expect(result.success).toBe(true)
    expect(result.isQualified).toBe(false)
    expect(leadMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "Pre-qualification (needs review)" })
    )
  })

  it("website-lead row alone counts as persisted when the legacy driver-db is down", async () => {
    legacyMock.mockRejectedValue(new Error("Neon HTTP driver unreachable"))
    const result = await submitPreQualification(initial, validForm())
    expect(result.success).toBe(true)
  })

  it("tells the driver to call only when every destination failed", async () => {
    legacyMock.mockRejectedValue(new Error("db down"))
    leadMock.mockResolvedValue(false)
    const result = await submitPreQualification(initial, validForm())
    expect(result.success).toBe(false)
    expect(result.message).toContain("call")
  })

  it("echoes to sendMail in simulation when SMTP is unset", async () => {
    mailShouldSend.mockResolvedValue(true)
    const result = await submitPreQualification(initial, validForm())
    expect(result.success).toBe(true)
    expect(result.isQualified).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: COMPANY_INFO.email,
      replyTo: "prequalify@example.com",
      subject: "✅ QUALIFIED: New Pre-Qualification - Test Driver",
    })
    expect(emailedMock).toHaveBeenCalledWith("legacy-1")
  })
})
