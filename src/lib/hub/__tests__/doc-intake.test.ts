import { describe, expect, it } from "vitest"
import { analyzeDocument, classifyDocument, parseCustomerDoc, parseRegistration, parseCdl, normalizeDate } from "../doc-intake"

describe("doc intake classify", () => {
  it("detects rate confirmations", () => {
    expect(classifyDocument("Rate Confirmation\nLinehaul: $2,000\nPICKUP: Kent, WA")).toBe("rate_con")
  })

  it("detects W-9", () => {
    expect(classifyDocument("Form W-9\nRequest for Taxpayer Identification Number\nEIN: 12-3456789")).toBe("w9")
  })

  it("detects registration", () => {
    expect(classifyDocument("Vehicle Registration\nVIN 1FUJGLDR85LM12345\nPlate WA1234\nExpiration 06/30/2026")).toBe(
      "registration"
    )
  })
})

describe("customer doc parser", () => {
  it("extracts MC, billing email, and net terms", () => {
    const parsed = parseCustomerDoc(
      "PACIFIC CREST LOGISTICS MC# 784512\nBilling email: ap@pacificcrest.com\nPayment terms: Net 45"
    )
    expect(parsed.mcNumber?.value).toBe("784512")
    expect(parsed.billingEmail?.value).toBe("ap@pacificcrest.com")
    expect(parsed.paymentTermsDays?.value).toBe(45)
  })
})

describe("registration parser", () => {
  it("finds VIN and unit number", () => {
    const parsed = parseRegistration("Truck # 07\nVIN 1FUJGLDR85LM12345\nPlate WA1234\nExpires 12/31/2026")
    expect(parsed.vin?.value).toBe("1FUJGLDR85LM12345")
    expect(parsed.unitNumber?.value).toBe("07")
    expect(parsed.registrationExpiry?.value).toBe("2026-12-31")
  })
})

describe("cdl parser", () => {
  it("parses comma-separated name and expiry", () => {
    const parsed = parseCdl("SINGH, HARPREET\nCDL Number: WA1234567\nState: WA\nExpires 08/15/2027")
    expect(parsed.lastName?.value).toBe("SINGH")
    expect(parsed.firstName?.value).toBe("HARPREET")
    expect(parsed.cdlExpiry?.value).toBe("2027-08-15")
  })
})

describe("analyzeDocument", () => {
  it("returns summary chips for a broker letter", () => {
    const result = analyzeDocument("FREIGHT BROKER INC MC# 123456\nBilling: pay@broker.com Net 30")
    expect(result.kind).toBe("customer")
    expect(result.summary.some((s) => s.includes("123456"))).toBe(true)
  })
})

describe("normalizeDate", () => {
  it("converts US slash dates", () => {
    expect(normalizeDate("6/30/2026")).toBe("2026-06-30")
  })
})
