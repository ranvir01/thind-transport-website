import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { buildLeadFormData, fireLeadCapture } from "../lead-capture"
import { HONEYPOT_FIELD } from "@/lib/honeypot"

/**
 * Regression for the /apply step-2 Continue stall: the wizard used to `await
 * captureLead(...)` (DB insert + notification email, a full server round
 * trip) before showing step 3, even though the result never gated
 * advancement. On truck-stop cell service that stalled the driver for
 * seconds at the most abandonment-sensitive moment of the funnel. The
 * capture must be fired in the background: never awaited by nextStep, and
 * never able to reject into the driver's browser.
 */

const VALUES = {
  firstName: "Funnel",
  lastName: "Driver",
  email: "funnel@example.com",
  phone: "(206) 555-1234",
  driverType: "regional-company-driver",
  experienceYears: "3-5",
}

describe("buildLeadFormData", () => {
  it("carries the exact fields captureLead's schema + hub lead row need", () => {
    const fd = buildLeadFormData(VALUES, "")
    expect(fd.get("name")).toBe("Funnel Driver")
    expect(fd.get("email")).toBe("funnel@example.com")
    expect(fd.get("phone")).toBe("(206) 555-1234")
    expect(fd.get("driverType")).toBe("regional-company-driver")
    expect(fd.get("experienceYears")).toBe("3-5")
    expect(fd.get("source")).toBe("Application Form Step 2")
    expect(fd.get(HONEYPOT_FIELD)).toBeNull()
  })

  it("forwards a tripped honeypot so the server can silently drop the bot", () => {
    const fd = buildLeadFormData(VALUES, "gotcha")
    expect(fd.get(HONEYPOT_FIELD)).toBe("gotcha")
  })
})

describe("fireLeadCapture", () => {
  it("resolves true when the action succeeds", async () => {
    const action = vi.fn().mockResolvedValue({ success: true, message: "ok" })
    await expect(fireLeadCapture(VALUES, "", action)).resolves.toBe(true)
    expect(action).toHaveBeenCalledOnce()
  })

  it("NEVER rejects — a network/SMTP failure resolves false instead of surfacing", async () => {
    const action = vi.fn().mockRejectedValue(new Error("SMTP timeout"))
    await expect(fireLeadCapture(VALUES, "", action)).resolves.toBe(false)
  })

  it("resolves false (not a throw) even when the action throws synchronously", async () => {
    const action = vi.fn(() => {
      throw new Error("boom")
    })
    await expect(fireLeadCapture(VALUES, "", action as never)).resolves.toBe(false)
  })
})

describe("ApplicationForm nextStep does not block on the lead capture", () => {
  const source = readFileSync(
    join(__dirname, "..", "ApplicationForm.tsx"),
    "utf8"
  )

  it("fires fireLeadCapture without awaiting it", () => {
    expect(source).toContain("void fireLeadCapture(")
    expect(source).not.toMatch(/await\s+fireLeadCapture/)
    expect(source).not.toMatch(/await\s+captureLead/)
  })

  it("no longer gates the Continue button on a lead-capture spinner", () => {
    expect(source).not.toContain("isCapturingLead")
  })
})
