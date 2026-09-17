import { describe, expect, it } from "vitest"
import { formatDOTApplicationEmailHtml } from "@/lib/dot-application-email"

describe("formatDOTApplicationEmailHtml", () => {
  it("renders key sections and applicant name from minimal fixture data", () => {
    const html = formatDOTApplicationEmailHtml(
      {
        personal: {
          applicant_name: "Test Driver",
          email: "test@example.com",
          phone: "(206) 555-0100",
          emergency_phone: "(206) 555-0101",
          dob: "1990-01-01",
          ssn: "123-45-6789",
          physical_exam_exp: "2027-01-01",
        },
      },
      {
        driverName: "Test Driver",
        driverEmail: "test@example.com",
      }
    )

    expect(html).toContain("Applicant Information")
    expect(html).toContain("Employment History")
    expect(html).toContain("CDL / License Information")
    expect(html).toContain("Test Driver")
  })
})
