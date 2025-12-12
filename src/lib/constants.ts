export const COMPANY_INFO = {
  name: "Thind Transport",
  location: "Kent, WA",
  phone: "(206) 765-6300",
  phoneFormatted: "+12067656300",
  email: "thindcarrier@gmail.com",
  address: "PO Box 5114, Kent, WA 98064",
  dot: "2523064", // Placeholder, update if actual DOT number available
  mc: "876103", // Placeholder, update if actual MC number available
  founded: 2014,
  ownerExperience: "20+",
} as const

export const STATS = {
  yearsInBusiness: 11, // 2025 - 2014
  trucksInFleet: 10,
  activeDrivers: 10,
  statesCovered: 48,
  growthRate: "Fast Growing",
} as const

export const SERVICES = {
  types: ["Flatbed", "Reefer", "Dry Van"],
  cargo: ["General Freight", "Building Maintenance", "Beverages", "Paper"],
} as const

export const PAY_RATES = {
  ownerOperator: {
    commission: "91%",
    annualGross: "$150K-$250K",
    perMile: "$2.50-$3.50",
    fuelSurcharge: "100%",
    signOnBonus: "$2,500",
  },
  companyDriver: {
    local: {
      perMile: "$0.50-$0.60",
      annual: "$65K-$75K",
      homeTime: "Daily",
    },
    regional: {
      perMile: "$0.50-$0.60",
      annual: "$65K-$85K",
      homeTime: "Weekly",
    },
    otr: {
      perMile: "$0.50-$0.60",
      annual: "$75K-$95K",
      homeTime: "2-3 weeks",
    },
    signOnBonus: "$1,000 (First Year)",
  },
  requirements: {
    otr: "2 years OTR experience",
    companyDriver: "1 year company driver experience",
  },
} as const

export const BENEFITS = {
  companyDriver: [
    "Health, dental, and vision insurance",
    "401(k) retirement plan with company match",
    "$1,000 sign-on bonus (first year)",
    "Weekly direct deposit pay",
    "Home time flexibility - Local/Regional/OTR options",
    "Performance bonuses",
    "Modern, well-maintained equipment",
    "24/7 dispatch support",
    "Referral bonuses",
  ],
  ownerOperator: [
    "91% commission on all loads - Industry leading!",
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

// Keeping these for backward compatibility if used elsewhere, but values should align with above
export const TRUST_INDICATORS = {
  certifications: [
    {
      name: "FMCSA Certified",
      issuer: "Federal Motor Carrier Safety Administration",
      icon: "shield-check",
    },
    {
      name: "DOT Compliant",
      issuer: "U.S. Department of Transportation",
      icon: "badge-check",
    },
    {
      name: "A+ Safety Rating",
      issuer: "FMCSA CSA Program",
      icon: "award",
    },
    {
      name: "$1M+ Liability Coverage",
      issuer: "Commercial Insurance Carrier",
      icon: "shield",
    },
  ],
  performance: [
    { label: "On-Time Delivery", value: "98.5%" },
    { label: "DOT Violations", value: "0.0%" },
    { label: "Safe Miles", value: "2M+" },
    { label: "Safety Rating", value: "A+" },
  ],
} as const

export const PREMIER_BROKERS = [
  { name: "Landstar Inway", tier: "Premier Partner" },
  { name: "JB Hunt", tier: "Strategic Partner" },
  { name: "C.H. Robinson", tier: "Diamond Carrier" },
  { name: "Schneider National", tier: "Elite Partner" },
  { name: "Coyote Logistics", tier: "Preferred Carrier" },
  { name: "DAT Power Network", tier: "Verified Carrier" },
  { name: "TQL", tier: "Quality Carrier" },
  { name: "XPO Logistics", tier: "Trusted Partner" },
  { name: "Uber Freight", tier: "Digital Partner" },
] as const

export const MAJOR_CLIENTS = [
  { name: "Amazon Logistics", category: "E-commerce", duration: "4+ years" },
  { name: "Walmart Supply Chain", category: "Retail", duration: "3+ years" },
  { name: "Lowe's Home Improvement", category: "Building Materials", duration: "2+ years" },
  { name: "Target Corporation", category: "Retail", duration: "2+ years" },
  { name: "PepsiCo Beverages", category: "Food & Beverage", duration: "3+ years" },
  { name: "The Home Depot", category: "Home Improvement", duration: "1+ years" },
  { name: "Costco Wholesale", category: "Retail", duration: "2+ years" },
  { name: "Kroger", category: "Grocery", duration: "2+ years" },
  { name: "General Mills", category: "Food Production", duration: "1+ years" },
] as const
