export const COMPANY_INFO = {
  name: "Thind Transport",
  location: "Kent, WA",
  phone: "(206) 765-6300",
  phoneFormatted: "+12067656300",
  email: "thindcarrier@gmail.com",
  address: "PO Box 5114, Kent, WA 98064",
  dot: "2523064",
  mc: "876103",
  owner: "Sukhdev Thind",
  founded: 2014,
  ownerExperience: "20+",
} as const

/** Official FMCSA links — Motus replaces legacy URS / FMCSA Portal for carrier registration (2026). */
export const FMCSA_LINKS = {
  motusInfo: "https://www.fmcsa.dot.gov/registration/whats-coming",
  safer: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
  portal: "https://portal.fmcsa.dot.gov/",
} as const

export const STATS = {
  yearsInBusiness: 12, // 2026 - 2014
  trucksInFleet: 15,
  activeDrivers: 15,
  statesCovered: 48,
  growthRate: "Fast Growing",
} as const

export const SERVICES = {
  types: ["Flatbed", "Reefer", "Dry Van"],
} as const

export const PAY_RATES = {
  ownerOperator: {
    commission: "90%",
    annualGross: "$150K-$250K",
    perMile: "$2.50-$3.50",
    fuelSurcharge: "100%",
    signOnBonus: "$2,500",
  },
  companyDriver: {
    local: {
      perMile: "$0.63",
      annual: "$57K-$63K",
      homeTime: "Daily",
    },
    regional: {
      perMile: "$0.63",
      annual: "$63K-$73K",
      homeTime: "Weekly",
    },
    otr: {
      perMile: "$0.63",
      annual: "$69K-$82K",
      homeTime: "2-3 weeks",
    },
    signOnBonus: "$1,000 (First Year)",
  },
  requirements: {
    otr: "2 years OTR experience",
    companyDriver: "1 year company driver experience",
  },
} as const

// Only benefits we actually offer today. Health/dental/vision, life, disability
// and 401(k) were removed in July 2026 — we do not carry those plans at the
// moment, and promising them on a recruiting page is a promise a driver finds
// out about at orientation. Add them back here first if that ever changes.
export const BENEFITS = {
  companyDriver: [
    "$1,000 sign-on bonus (first year)",
    "Weekly direct deposit pay",
    "Home time flexibility - Local/Regional/OTR options",
    "Performance bonuses",
    "Modern, well-maintained equipment",
    "24/7 dispatch support",
    "Referral bonuses",
  ],
  ownerOperator: [
    "90% commission on all loads",
    "$2,500 sign-on bonus",
    "No forced dispatch - you choose your loads",
    "Weekly settlements and fast pay options",
    "Fuel card programs with discounts",
    "Maintenance and tire discounts",
    "24/7 dispatch support",
    "No hidden fees or deductions",
    "Transparent weekly settlements",
    "Fuel surcharge passed through 100%",
  ],
  homeTimeOptions: [
    "Local routes - Home daily",
    "Regional - Home weekly",
    "OTR - 2-3 weeks out",
    "Flexible scheduling to fit your lifestyle",
  ],
} as const

// Verifiable trust indicators only — no invented ratings or percentages.
export const TRUST_INDICATORS = {
  certifications: [
    {
      name: "FMCSA Registered",
      issuer: "Federal Motor Carrier Safety Administration",
      icon: "shield-check",
    },
    {
      name: `USDOT #2523064`,
      issuer: "U.S. Department of Transportation",
      icon: "badge-check",
    },
    {
      name: "No Forced Dispatch",
      issuer: "Company policy — you choose your loads",
      icon: "award",
    },
    // The $1M+ liability-coverage credential was removed 2026-08-04 under the
    // no-unverifiable-claims rule: it is a specific number a broker checks
    // against the COI, and no COI in this repo backs it. It returns the day the
    // owner confirms the real limits (see docs/OWNER-CHECKLIST.md). A test
    // fails if it is re-added without that confirmation.
  ],
} as const

/**
 * Workplace facts for recruiting copy — not compensation, not a hiring screen.
 *
 * Local Kent carriers recruit the same Punjabi-American CDL pool with "Punjabi
 * preferred" ads. That framing is an EEOC national-origin risk. The lawful,
 * equally useful statement is what we actually do at work: dispatch and
 * orientation in Punjabi and English, while FMCSA English proficiency remains
 * a job requirement (49 CFR 391.11(b)(2), ELP out-of-service since June 2025).
 *
 * WA Equal Pay and Opportunities Act (RCW 49.58.110) postings also need an
 * EEO line plus the wage scale + benefits already in PAY_RATES / BENEFITS.
 */
export const WORKPLACE = {
  languages:
    "Dispatch, orientation, and paperwork help available in Punjabi and English.",
  elp: "Must meet all FMCSA driver qualifications, including English proficiency (49 CFR 391.11(b)(2)).",
  eeo: "Thind Transport is an equal opportunity employer. All qualified applicants receive consideration without regard to race, color, religion, sex, national origin, age, disability, or any other protected status.",
} as const

