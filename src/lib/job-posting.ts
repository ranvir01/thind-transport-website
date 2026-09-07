import { BENEFITS, COMPANY_INFO, PAY_RATES, WORKPLACE } from "@/lib/constants"
import type { StateInfo } from "@/lib/state-data"

export const SITE_ORIGIN = "https://thindtransport.com"

/** BLS SOC for heavy / tractor-trailer truck drivers — Google Jobs occupation filter. */
export const SOC_TRUCK_DRIVER = "53-3032.00"

export type CompanyLane = "local" | "regional" | "otr"
export type JobSlug = CompanyLane | "owner-operator"

export const JOB_SLUGS: JobSlug[] = ["local", "regional", "otr", "owner-operator"]

export function jobListingPath(slug: JobSlug): string {
  return `/jobs/${slug}`
}

export function jobListingUrl(slug: JobSlug): string {
  return `${SITE_ORIGIN}${jobListingPath(slug)}`
}

export function applyDeepLink(opts: {
  type: "company" | "owner"
  lane?: CompanyLane
}): string {
  const u = new URL(`${SITE_ORIGIN}/apply`)
  u.searchParams.set("type", opts.type)
  if (opts.lane) u.searchParams.set("lane", opts.lane)
  return u.toString()
}

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
    url: `${SITE_ORIGIN}/cdl-jobs/${state.slug}`,
    hiringOrganization: hiringOrg,
    ...googleJobsExtras,
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

/** Local min → OTR max so a WA posting can show one honest wage scale. */
export function companyDriverAnnualBounds(): [number, number] {
  const pairs = [
    PAY_RATES.companyDriver.local.annual,
    PAY_RATES.companyDriver.regional.annual,
    PAY_RATES.companyDriver.otr.annual,
  ].map(parseAnnualRange)
  return [Math.min(...pairs.map(([min]) => min)), Math.max(...pairs.map(([, max]) => max))]
}

const kentJobLocation = {
  "@type": "Place" as const,
  address: {
    "@type": "PostalAddress" as const,
    addressLocality: "Kent",
    addressRegion: "WA",
    postalCode: "98064",
    addressCountry: "US",
  },
}

const hiringOrg = {
  "@type": "Organization" as const,
  name: COMPANY_INFO.name,
  sameAs: SITE_ORIGIN,
  // Raster, not the SVG logo — Google's JobPosting logo guidance wants a
  // bitmap whose width/height ratio sits between 0.75 and 2.5.
  logo: `${SITE_ORIGIN}/og-image.png`,
}

const googleJobsExtras = {
  occupationalCategory: SOC_TRUCK_DRIVER,
  industry: "Truck Transportation",
} as const

function postingDates(now: Date) {
  const validThrough = new Date(now.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000)
  return {
    datePosted: now.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
  }
}

/**
 * Kent HQ company-driver JobPosting for /apply — wage scale + benefits so the
 * Google Jobs listing satisfies WA RCW 49.58.110 the same way the HTML does.
 */
export function buildCompanyDriverJobPosting(now: Date = new Date()) {
  const [minAnnual, maxAnnual] = companyDriverAnnualBounds()
  const cd = PAY_RATES.companyDriver
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "CDL-A Company Driver — Local, Regional & OTR",
    identifier: {
      "@type": "PropertyValue",
      name: COMPANY_INFO.name,
      value: "company-driver",
    },
    description: `Thind Transport (${COMPANY_INFO.location}) is hiring CDL-A company drivers. Pay is ${cd.local.perMile}/mile on every lane — local (${cd.local.homeTime}, ${cd.local.annual}/year), regional (${cd.regional.homeTime}, ${cd.regional.annual}/year), or OTR (${cd.otr.homeTime} out, ${cd.otr.annual}/year). Sign-on ${cd.signOnBonus}. ${BENEFITS.companyDriver.join(" ")} ${WORKPLACE.languages} ${WORKPLACE.elp}`,
    url: applyDeepLink({ type: "company" }),
    hiringOrganization: hiringOrg,
    ...googleJobsExtras,
    employmentType: "FULL_TIME",
    jobLocation: kentJobLocation,
    applicantLocationRequirements: { "@type": "Country", name: "United States" },
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
    jobBenefits: BENEFITS.companyDriver.join(". "),
    qualifications: `Valid CDL Class A. ${PAY_RATES.requirements.companyDriver}. ${WORKPLACE.elp}`,
    ...postingDates(now),
    directApply: true,
  }
}

/**
 * Kent HQ owner-operator JobPosting. Compensation is the lease split, not a
 * W-2 salary — Google still wants a MonetaryAmount, so we publish the typical
 * gross range from PAY_RATES and label the unit as YEAR.
 */
export function buildOwnerOperatorJobPosting(now: Date = new Date()) {
  const [minGross, maxGross] = parseAnnualRange(PAY_RATES.ownerOperator.annualGross)
  const oo = PAY_RATES.ownerOperator
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `CDL-A Owner Operator — ${oo.commission} of gross, no forced dispatch`,
    identifier: {
      "@type": "PropertyValue",
      name: COMPANY_INFO.name,
      value: "owner-operator",
    },
    description: `Lease on with Thind Transport in ${COMPANY_INFO.location}. Keep ${oo.commission} of gross with ${oo.fuelSurcharge} fuel-surcharge pass-through. Typical gross ${oo.annualGross}/year at ${oo.perMile}/mile — your revenue depends on the miles you choose to run. Sign-on ${oo.signOnBonus}. ${BENEFITS.ownerOperator.join(" ")} ${WORKPLACE.languages} ${WORKPLACE.elp}`,
    url: jobListingUrl("owner-operator"),
    hiringOrganization: hiringOrg,
    ...googleJobsExtras,
    employmentType: "CONTRACTOR",
    jobLocation: kentJobLocation,
    applicantLocationRequirements: { "@type": "Country", name: "United States" },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: minGross,
        maxValue: maxGross,
        unitText: "YEAR",
      },
    },
    jobBenefits: BENEFITS.ownerOperator.join(". "),
    qualifications: `Valid CDL Class A, your own tractor, ${PAY_RATES.requirements.otr}. ${WORKPLACE.elp}`,
    ...postingDates(now),
    directApply: true,
  }
}

const LANE_TITLE: Record<CompanyLane, string> = {
  local: "CDL-A Local Company Driver — Home Daily",
  regional: "CDL-A Regional Company Driver — Home Weekly",
  otr: "CDL-A OTR Company Driver",
}

/**
 * One Google Jobs listing per home-time lane. Local / regional / OTR are
 * different jobs (same CPM, different life) — scrapers rank specific titles
 * above a combined "all lanes" card.
 */
export function buildLaneCompanyJobPosting(lane: CompanyLane, now: Date = new Date()) {
  const row = PAY_RATES.companyDriver[lane]
  const [minAnnual, maxAnnual] = parseAnnualRange(row.annual)
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: LANE_TITLE[lane],
    identifier: {
      "@type": "PropertyValue",
      name: COMPANY_INFO.name,
      value: `company-driver-${lane}`,
    },
    description: `Thind Transport (${COMPANY_INFO.location}) is hiring CDL-A company drivers for ${lane} work. Home time: ${row.homeTime}. Pay is ${row.perMile}/mile (${row.annual}/year). Sign-on ${PAY_RATES.companyDriver.signOnBonus}. ${BENEFITS.companyDriver.join(" ")} ${WORKPLACE.languages} ${WORKPLACE.elp}`,
    url: jobListingUrl(lane),
    hiringOrganization: hiringOrg,
    ...googleJobsExtras,
    employmentType: "FULL_TIME",
    jobLocation: kentJobLocation,
    applicantLocationRequirements: { "@type": "Country", name: "United States" },
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
    jobBenefits: BENEFITS.companyDriver.join(". "),
    qualifications: `Valid CDL Class A. ${PAY_RATES.requirements.companyDriver}. ${WORKPLACE.elp}`,
    ...postingDates(now),
    directApply: true,
  }
}

export function buildJobListingPosting(slug: JobSlug, now: Date = new Date()) {
  if (slug === "owner-operator") return buildOwnerOperatorJobPosting(now)
  return buildLaneCompanyJobPosting(slug, now)
}

export function jobListingApplyHref(slug: JobSlug): string {
  if (slug === "owner-operator") return "/apply?type=owner"
  return `/apply?type=company&lane=${slug}`
}

/** Pay-first lead under the listing H1 — also the Open Graph description. */
export function jobListingLead(slug: JobSlug): string {
  if (slug === "owner-operator") {
    return `Keep ${PAY_RATES.ownerOperator.commission} of gross out of ${COMPANY_INFO.location}. ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge pass-through. No forced dispatch.`
  }
  const row = PAY_RATES.companyDriver[slug]
  const home =
    slug === "otr" ? `${row.homeTime} out` : `Home ${row.homeTime.toLowerCase()}`
  return `${home} from ${COMPANY_INFO.location}. ${row.perMile}/mile · ${row.annual}/year.`
}
