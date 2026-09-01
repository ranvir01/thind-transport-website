import { describe, expect, it } from "vitest"
import {
  buildCompanyDriverJobPosting,
  buildJobPostingSchema,
  buildOwnerOperatorJobPosting,
  companyDriverAnnualBounds,
  parseAnnualRange,
} from "@/lib/job-posting"
import { BENEFITS, PAY_RATES, WORKPLACE } from "@/lib/constants"
import { STATES, stateBySlug } from "@/lib/state-data"

describe("parseAnnualRange", () => {
  it("parses the constants.ts OTR annual range into dollars", () => {
    // Whatever constants.ts currently says, it must parse to a sane range.
    const [min, max] = parseAnnualRange(PAY_RATES.companyDriver.otr.annual)
    expect(min).toBeGreaterThan(20_000)
    expect(max).toBeGreaterThan(min)
    expect(max).toBeLessThan(1_000_000)
  })

  it("parses the documented format", () => {
    expect(parseAnnualRange("$69K-$82K")).toEqual([69_000, 82_000])
  })

  it("throws on garbage rather than emitting a broken schema", () => {
    expect(() => parseAnnualRange("competitive pay")).toThrow(/Un-parseable/)
  })
})

describe("buildJobPostingSchema", () => {
  const wa = stateBySlug("washington")!
  const now = new Date("2026-07-26T00:00:00Z")
  const schema = buildJobPostingSchema(wa, now)

  it("carries every field Google's job-posting rich result requires", () => {
    expect(schema["@type"]).toBe("JobPosting")
    expect(schema.title).toContain("Washington")
    expect(schema.description.length).toBeGreaterThan(50)
    expect(schema.hiringOrganization).toMatchObject({ "@type": "Organization", name: expect.any(String) })
    expect(schema.jobLocation.address).toMatchObject({ addressRegion: "WA", addressCountry: "US" })
    expect(schema.baseSalary).toMatchObject({
      "@type": "MonetaryAmount",
      currency: "USD",
      value: { "@type": "QuantitativeValue", unitText: "YEAR" },
    })
    expect(schema.baseSalary.value.minValue).toBeGreaterThan(0)
    expect(schema.baseSalary.value.maxValue).toBeGreaterThan(schema.baseSalary.value.minValue)
    expect(schema.datePosted).toBe("2026-07-26")
    expect(schema.validThrough > schema.datePosted).toBe(true)
  })

  it("builds for every one of the 48 states without throwing", () => {
    for (const state of STATES) {
      const s = buildJobPostingSchema(state, now)
      expect(s.jobLocation.address.addressRegion).toBe(state.abbr)
      expect(s.validThrough).toBeTruthy()
    }
  })
})

describe("Kent HQ JobPostings for /apply", () => {
  const now = new Date("2026-08-26T00:00:00Z")
  const company = buildCompanyDriverJobPosting(now)
  const owner = buildOwnerOperatorJobPosting(now)

  it("company posting carries Google-required fields plus WA EPOA benefits", () => {
    expect(company["@type"]).toBe("JobPosting")
    expect(company.employmentType).toBe("FULL_TIME")
    expect(company.jobLocation.address).toMatchObject({
      addressLocality: "Kent",
      addressRegion: "WA",
    })
    expect(company.jobBenefits).toContain(BENEFITS.companyDriver[0])
    expect(company.description).toContain(PAY_RATES.companyDriver.local.perMile)
    expect(company.description).toContain(WORKPLACE.languages)
    expect(company.baseSalary.value.minValue).toBe(companyDriverAnnualBounds()[0])
    expect(company.baseSalary.value.maxValue).toBe(companyDriverAnnualBounds()[1])
    expect(company.datePosted).toBe("2026-08-26")
  })

  it("owner-operator posting is a contractor role with the lease split", () => {
    expect(owner.employmentType).toBe("CONTRACTOR")
    expect(owner.title).toContain(PAY_RATES.ownerOperator.commission)
    expect(owner.description).toContain(PAY_RATES.ownerOperator.fuelSurcharge)
    expect(owner.jobBenefits).toContain(BENEFITS.ownerOperator[0])
    const [min, max] = parseAnnualRange(PAY_RATES.ownerOperator.annualGross)
    expect(owner.baseSalary.value.minValue).toBe(min)
    expect(owner.baseSalary.value.maxValue).toBe(max)
  })
})

describe("companyDriverAnnualBounds", () => {
  it("spans local min to OTR max so one posting can show the full wage scale", () => {
    const [min, max] = companyDriverAnnualBounds()
    const [localMin] = parseAnnualRange(PAY_RATES.companyDriver.local.annual)
    const [, otrMax] = parseAnnualRange(PAY_RATES.companyDriver.otr.annual)
    expect(min).toBe(localMin)
    expect(max).toBe(otrMax)
    expect(max).toBeGreaterThan(min)
  })
})

describe("state deepDive content", () => {
  it("deepened states carry real content in every section", () => {
    for (const state of STATES) {
      if (!state.deepDive) continue
      expect(state.deepDive.markets.length, `${state.slug} markets`).toBeGreaterThanOrEqual(2)
      for (const m of state.deepDive.markets) {
        expect(m.name.length).toBeGreaterThan(2)
        // A market note shorter than a sentence is filler — the deepening
        // pass promises genuinely useful notes, not spun thin content.
        expect(m.note.length, `${state.slug} market note for ${m.name}`).toBeGreaterThan(80)
      }
      expect(state.deepDive.seasonal.length, `${state.slug} seasonal`).toBeGreaterThanOrEqual(1)
      expect(state.deepDive.driverFacts.length, `${state.slug} driverFacts`).toBeGreaterThanOrEqual(1)
    }
  })

  it("washington is deepened (first state of the SEO deepening pass)", () => {
    expect(stateBySlug("washington")?.deepDive).toBeTruthy()
  })
})
