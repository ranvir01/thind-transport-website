import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import type { StateInfo } from "@/lib/state-data"

/**
 * How long a posting stays valid after the page is built. Pages are
 * statically rebuilt on every deploy, so datePosted/validThrough refresh
 * continuously in practice; 90 days is the safety margin if deploys pause.
 */
const VALID_DAYS = 90

/** "$69K-$82K" → [69000, 82000]. Company facts only ever come from constants.ts. */
export function parseAnnualRange(range: string): [number, number] {
  const matches = range.match(/\d+(?:\.\d+)?/g)
  if (!matches || matches.length < 2) {
    throw new Error(`Un-parseable annual pay range from constants.ts: "${range}"`)
  }
  return [Number(matches[0]) * 1000, Number(matches[1]) * 1000]
}

/**
 * schema.org JobPosting for a /cdl-jobs/[state] page. Google's job-posting
 * rich-result checks want title, description, hiringOrganization,
 * jobLocation, baseSalary, datePosted, and validThrough — keep all seven.
 */
export function buildJobPostingSchema(state: StateInfo, now: Date = new Date()) {
  const [minAnnual, maxAnnual] = parseAnnualRange(PAY_RATES.companyDriver.otr.annual)
  const validThrough = new Date(now.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000)

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `CDL-A Truck Driver / Owner Operator — ${state.name}`,
    description: `Thind Transport is hiring experienced CDL-A company drivers and owner operators for OTR and regional freight running through ${state.name}. Owner operators keep ${PAY_RATES.ownerOperator.commission} of gross with ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge pass-through. Company drivers earn ${PAY_RATES.companyDriver.otr.perMile}/mile with weekly pay. Flatbed, reefer, and dry van.`,
    hiringOrganization: {
      "@type": "Organization",
      name: COMPANY_INFO.name,
      sameAs: "https://thindtransport.com",
    },
    industry: "Truck Transportation",
    employmentType: ["FULL_TIME", "CONTRACTOR"],
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressRegion: state.abbr, addressCountry: "US" },
    },
    applicantLocationRequirements: { "@type": "State", name: state.name },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: minAnnual,
        maxValue: maxAnnual,
        unitText: "YEAR",
      },
    },
    datePosted: now.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
    directApply: true,
  }
}
