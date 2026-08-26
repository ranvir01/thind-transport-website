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
  ownerExperience: "25+",
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
    payout: "91%",
    commission: "91%",
    annualGross: "$250K-$300K",
    perMile: "$2.50-$3.50",
    fuelSurcharge: "100%",
    signOnBonus: "$2,500",
  },
  companyDriver: {
    local: {
      perMile: "$0.60-$0.65",
      annual: "$78K-$85K",
      homeTime: "Daily",
    },
    regional: {
      perMile: "$0.60-$0.65",
      annual: "$78K-$95K",
      homeTime: "Weekly",
    },
    otr: {
      perMile: "$0.60-$0.65",
      annual: "$93K-$110K",
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
    "91% payout on all loads - Industry leading!",
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

