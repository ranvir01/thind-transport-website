/**
 * Lead-capture forms must stay autofill-friendly (driver-recruitment-conversion
 * skill, rule 5: drivers apply from phones in truck stops — one-tap browser
 * autofill and the tel keypad are the cheapest friction cuts on the funnel).
 *
 * A regression here is invisible in E2E (Puppeteer types fine into any input),
 * so we assert the source directly, matching the repo's SQL-text tenancy-test
 * pattern: every contact field on the three lead-capture surfaces carries the
 * right autocomplete token, and every phone field gets the tel keypad.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), "utf8")

const preQualify = read("./PreQualificationForm.tsx")
const apply = read("./ApplicationForm.tsx")
const shipperQuote = read("../features/ShipperQuoteForm.tsx")

describe("pre-qualify form autofill (funnel entry, ~60s promise)", () => {
  it("phone field brings up the tel keypad on mobile", () => {
    const phoneLine = preQualify.split("\n").find((l) => l.includes('id="phone"')) ?? ""
    expect(phoneLine).toContain('type="tel"')
    expect(phoneLine).toContain('inputMode="tel"')
    expect(phoneLine).toContain('autoComplete="tel"')
  })

  it("name and email fields carry autocomplete tokens", () => {
    expect(preQualify).toContain('autoComplete="given-name"')
    expect(preQualify).toContain('autoComplete="family-name"')
    expect(preQualify).toContain('autoComplete="email"')
  })
})

describe("apply form step 2 autofill (fires captureLead)", () => {
  it("contact fields carry autocomplete tokens", () => {
    expect(apply).toContain('autoComplete="given-name"')
    expect(apply).toContain('autoComplete="family-name"')
    expect(apply).toContain('autoComplete="email"')
    expect(apply).toContain('autoComplete="tel"')
  })

  it("phone field keeps the tel keypad", () => {
    expect(apply).toContain('inputMode="tel"')
    expect(apply).toContain('type="tel"')
  })
})

describe("shipper quote form autofill (source: Shipper/Broker quote request)", () => {
  it("every field autofills and phone gets the tel keypad", () => {
    expect(shipperQuote).toContain('autoComplete="organization"')
    expect(shipperQuote).toContain('autoComplete="name"')
    expect(shipperQuote).toContain('autoComplete="email"')
    expect(shipperQuote).toContain('autoComplete="tel"')
    expect(shipperQuote).toContain('inputMode="tel"')
  })
})
