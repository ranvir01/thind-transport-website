import { describe, it, expect } from "vitest"
import { draftOutreach, canSpamFooter, type CompanyFacts } from "../draft"

const C: CompanyFacts = {
  name: "Thind Transport",
  phone: "(206) 765-6300",
  phoneFormatted: "+12067656300",
  email: "thindcarrier@gmail.com",
  address: "PO Box 5114, Kent, WA 98064",
  dot: "2523064",
  mc: "876103",
  founded: 2014,
  statesCovered: 48,
  trucks: 15,
}

describe("canSpamFooter", () => {
  it("carries the required CAN-SPAM elements: identity, postal address, opt-out", () => {
    const f = canSpamFooter(C)
    expect(f).toContain("PO Box 5114, Kent, WA 98064") // physical address
    expect(f).toContain("USDOT 2523064")
    expect(f).toMatch(/STOP|unsubscribe/i) // opt-out mechanism
  })
})

describe("draftOutreach — every audience", () => {
  for (const audience of ["broker", "shipper", "driver"] as const) {
    it(`${audience}: includes brand facts and a compliant footer`, () => {
      const d = draftOutreach({ audience }, C)
      expect(d.subject.length).toBeGreaterThan(10)
      expect(d.body).toContain("PO Box 5114, Kent, WA 98064")
      expect(d.body).toMatch(/STOP|unsubscribe/i)
      expect(d.channel).toBe("email")
      expect(d.sms.length).toBeGreaterThan(10)
      expect(d.callScript.length).toBeGreaterThan(10)
    })
  }

  it("broker draft leads with authority + equipment ask", () => {
    const d = draftOutreach({ audience: "broker" }, C)
    expect(d.subject).toContain("MC 876103")
    expect(d.body).toContain("USDOT 2523064")
    expect(d.body).toMatch(/flatbed, reefer, and dry van/i)
  })

  it("shipper draft pitches cutting out the broker", () => {
    const d = draftOutreach({ audience: "shipper" }, C)
    expect(d.body.toLowerCase()).toContain("broker")
    expect(d.subject.toLowerCase()).toContain("direct")
  })

  it("driver draft leads with the 91% split and the apply link", () => {
    const d = draftOutreach({ audience: "driver" }, C)
    expect(d.body).toContain("91%")
    expect(d.body).toContain("$0.60")
    expect(d.body).toContain("thindtransport.com/apply")
  })

  it("personalizes with a first name when we have one", () => {
    const named = draftOutreach({ audience: "broker", contactName: "Jane Doe" }, C)
    expect(named.body.startsWith("Hi Jane,")).toBe(true)
    const anon = draftOutreach({ audience: "broker" }, C)
    expect(anon.body.startsWith("Hi Jane,")).toBe(false)
  })

  it("weaves equipment + lane into the body when known", () => {
    const d = draftOutreach({ audience: "broker", equipment: "reefer", lane: "PNW ↔ CA" }, C)
    expect(d.body).toContain("reefer")
    expect(d.body).toContain("PNW ↔ CA")
  })
})
