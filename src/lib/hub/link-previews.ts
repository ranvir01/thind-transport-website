/**
 * Link-preview fixtures — X-style preview-card metadata for every Toolbox
 * resource (workbench.ts) and every integration provider (registry.ts).
 *
 * Committed as a typed TS module (not JSON) so the icon/tint unions typecheck
 * and drift is caught at compile time; link-previews.test.ts locks the id
 * coverage both ways. NOTHING here is fetched at runtime — the cards render
 * from this file alone. To re-check the curated titles/blurbs against what
 * the sites currently serve, run `npm run previews:refresh` (offline-safe,
 * prints a suggested-updates report; never rewrites this file).
 *
 * Entry formatting is intentionally uniform — one field per line, in
 * id/title/blurb/domain/url/icon/tint order — because
 * scripts/refresh-link-previews.mjs regex-parses this file for its URL list.
 */

/** Fixed union of lucide icon names the preview cards may use — the component
 *  maps these to real components with an explicit Record (no dynamic import). */
export const LINK_PREVIEW_ICONS = [
  "Banknote",
  "Calculator",
  "ClipboardCheck",
  "Clock",
  "CloudSun",
  "Coins",
  "Container",
  "CreditCard",
  "FlaskConical",
  "Fuel",
  "Landmark",
  "Mail",
  "Map",
  "Mountain",
  "MountainSnow",
  "Network",
  "RadioTower",
  "Receipt",
  "Satellite",
  "Scale",
  "Search",
  "ShieldAlert",
  "ShieldCheck",
  "TrafficCone",
  "Wrench",
] as const

export type LinkPreviewIcon = (typeof LINK_PREVIEW_ICONS)[number]

export const LINK_PREVIEW_TINTS = ["accent", "info", "ok", "warn", "neutral"] as const

export type LinkPreviewTint = (typeof LINK_PREVIEW_TINTS)[number]

export interface LinkPreview {
  id: string
  title: string
  blurb: string
  /** Bare hostname shown in the domain row — no protocol, no path. Empty for
   *  entries with no public site (your own mailbox, your own factor). */
  domain: string
  /** Always https, or null when there is nothing public to open. */
  url: string | null
  icon: LinkPreviewIcon
  tint: LinkPreviewTint
}

export const LINK_PREVIEWS: Record<string, LinkPreview> = {
  // ---- Toolbox: our own tools (same origin) --------------------------------
  "freight-class": {
    id: "freight-class",
    title: "Freight class calculator",
    blurb: "NMFC density class from dimensions and weight — the number LTL carriers quote against.",
    domain: "thindtransport.com",
    url: "https://thindtransport.com/tools/freight-class-calculator",
    icon: "Calculator",
    tint: "accent",
  },
  "hos-clock": {
    id: "hos-clock",
    title: "HOS clock planner",
    blurb: "The 11-hour, 14-hour window, 30-minute break, and 70-hour cycle worked out from when you came on duty.",
    domain: "thindtransport.com",
    url: "https://thindtransport.com/resources#hos",
    icon: "Clock",
    tint: "accent",
  },
  "state-guides": {
    id: "state-guides",
    title: "State freight guides",
    blurb: "Corridors, chain laws, and seasonal freight state by state — our own guides, no ads.",
    domain: "thindtransport.com",
    url: "https://thindtransport.com/cdl-jobs",
    icon: "Map",
    tint: "accent",
  },

  // ---- Toolbox: regulations ------------------------------------------------
  "ecfr-395": {
    id: "ecfr-395",
    title: "49 CFR Part 395 — Hours of Service of Drivers",
    blurb: "The current official Hours of Service regulation text on the Electronic Code of Federal Regulations.",
    domain: "ecfr.gov",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-395",
    icon: "Scale",
    tint: "info",
  },
  "ecfr-396": {
    id: "ecfr-396",
    title: "49 CFR Part 396 — Inspection, Repair, and Maintenance",
    blurb: "Official rules for DVIRs, periodic inspections, and repair recordkeeping, straight from eCFR.",
    domain: "ecfr.gov",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396",
    icon: "Wrench",
    tint: "info",
  },
  "ecfr-382": {
    id: "ecfr-382",
    title: "49 CFR Part 382 — Controlled Substances and Alcohol Use and Testing",
    blurb: "The drug-and-alcohol testing regulation behind random pools, pre-employment tests, and the Clearinghouse.",
    domain: "ecfr.gov",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-382",
    icon: "FlaskConical",
    tint: "info",
  },
  "fmcsa-eld-list": {
    id: "fmcsa-eld-list",
    title: "FMCSA registered ELD list",
    blurb: "FMCSA's live list of registered and revoked electronic logging devices — check a device before buying it.",
    domain: "eld.fmcsa.dot.gov",
    url: "https://eld.fmcsa.dot.gov/List",
    icon: "ClipboardCheck",
    tint: "info",
  },

  // ---- Toolbox: passes & weather -------------------------------------------
  "wsdot-passes": {
    id: "wsdot-passes",
    title: "WSDOT mountain pass reports",
    blurb: "Real-time Washington pass conditions — Snoqualmie, Stevens, White — with chain and traction requirements.",
    domain: "wsdot.com",
    url: "https://wsdot.com/travel/real-time/mountainpasses",
    icon: "Mountain",
    tint: "warn",
  },
  tripcheck: {
    id: "tripcheck",
    title: "TripCheck — Oregon road conditions",
    blurb: "ODOT's traveler map: cameras, incidents, and chain requirements for Cabbage Hill, the Siskiyous, and every Oregon route.",
    domain: "tripcheck.com",
    url: "https://www.tripcheck.com",
    icon: "MountainSnow",
    tint: "warn",
  },
  "idaho-511": {
    id: "idaho-511",
    title: "Idaho 511 traveler information",
    blurb: "ITD's road report for the I-90 and I-84 runs — Fourth of July and Lookout Pass conditions, closures, cameras.",
    domain: "511.idaho.gov",
    url: "https://511.idaho.gov",
    icon: "TrafficCone",
    tint: "warn",
  },
  nws: {
    id: "nws",
    title: "National Weather Service",
    blurb: "Forecasts, watches, and warnings for any point on the route, direct from NOAA — no ads, no middleman.",
    domain: "weather.gov",
    url: "https://www.weather.gov",
    icon: "CloudSun",
    tint: "info",
  },

  // ---- Toolbox: lookups ----------------------------------------------------
  safer: {
    id: "safer",
    title: "FMCSA SAFER company snapshot",
    blurb: "Authority, safety rating, and inspection history for any carrier or broker, by DOT or MC number.",
    domain: "safer.fmcsa.dot.gov",
    url: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
    icon: "Search",
    tint: "ok",
  },
  "eia-diesel": {
    id: "eia-diesel",
    title: "EIA gasoline and diesel fuel update",
    blurb: "This week's average on-highway diesel price by region — the index most fuel-surcharge schedules key off.",
    domain: "eia.gov",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
    icon: "Fuel",
    tint: "ok",
  },
  iftach: {
    id: "iftach",
    title: "IFTA, Inc. — International Fuel Tax Association",
    blurb: "The official IFTA clearinghouse: the current quarter's fuel-tax rate matrix for every member jurisdiction.",
    domain: "iftach.org",
    url: "https://www.iftach.org",
    icon: "Landmark",
    tint: "ok",
  },

  // ---- Integrations: telematics --------------------------------------------
  terminal: {
    id: "terminal",
    title: "Terminal — the integration layer for telematics",
    blurb: "One API across TruckX and 40+ other ELD and telematics providers — positions and HOS through a single aggregator.",
    domain: "withterminal.com",
    url: "https://www.withterminal.com",
    icon: "Satellite",
    tint: "accent",
  },
  truckercloud: {
    id: "truckercloud",
    title: "TruckerCloud — ELD data network",
    blurb: "ELD aggregator connecting fleets, brokers, and insurers to location and hours data across device brands.",
    domain: "truckercloud.com",
    url: "https://www.truckercloud.com",
    icon: "RadioTower",
    tint: "accent",
  },
  axle: {
    id: "axle",
    title: "Axle — universal API for telematics",
    blurb: "Telematics aggregator covering the long tail of ELDs — one API for location, HOS, and vehicle data.",
    domain: "withaxle.com",
    url: "https://www.withaxle.com",
    icon: "Satellite",
    tint: "accent",
  },

  // ---- Integrations: docs & load boards ------------------------------------
  mailbox: {
    id: "mailbox",
    title: "Docs mailbox (IMAP)",
    blurb: "Your own inbox, polled over IMAP — rate cons and PODs file themselves onto matching loads by reference number.",
    domain: "",
    url: null,
    icon: "Mail",
    tint: "neutral",
  },
  dat: {
    id: "dat",
    title: "DAT Freight & Analytics",
    blurb: "North America's largest truckload marketplace — the DAT One load board plus RateView lane pricing.",
    domain: "dat.com",
    url: "https://www.dat.com",
    icon: "Search",
    tint: "info",
  },
  truckstop: {
    id: "truckstop",
    title: "Truckstop — load board and freight tools",
    blurb: "Load board, rate insights, and broker vetting — the other board every dispatcher keeps open.",
    domain: "truckstop.com",
    url: "https://truckstop.com",
    icon: "Container",
    tint: "info",
  },

  // ---- Integrations: fuel & money ------------------------------------------
  efs: {
    id: "efs",
    title: "EFS fleet fuel card",
    blurb: "WEX-family OTR fuel card accepted across the major truck stops — transaction feed drives MPG and fraud checks.",
    domain: "efsllc.com",
    url: "https://www.efsllc.com",
    icon: "Fuel",
    tint: "ok",
  },
  wex: {
    id: "wex",
    title: "WEX fleet fuel cards and payments",
    blurb: "Fuel cards and payment processing for fleets of every size, with over-the-road discounts and reporting.",
    domain: "wexinc.com",
    url: "https://www.wexinc.com",
    icon: "Fuel",
    tint: "ok",
  },
  comdata: {
    id: "comdata",
    title: "Comdata fleet payment solutions",
    blurb: "Corpay's trucking payments arm — fuel cards, Comchek, and driver pay used across the industry.",
    domain: "comdata.com",
    url: "https://www.comdata.com",
    icon: "Fuel",
    tint: "ok",
  },
  atob: {
    id: "atob",
    title: "AtoB — modern fuel card for fleets",
    blurb: "Fuel card on Visa rails with per-driver controls, telematics-verified security, and an API-first transaction feed.",
    domain: "atob.com",
    url: "https://www.atob.com",
    icon: "CreditCard",
    tint: "ok",
  },
  qbo: {
    id: "qbo",
    title: "QuickBooks Online",
    blurb: "Intuit's small-business accounting — invoices, payments, and the books your accountant already knows.",
    domain: "quickbooks.intuit.com",
    url: "https://quickbooks.intuit.com",
    icon: "Receipt",
    tint: "accent",
  },
  factor: {
    id: "factor",
    title: "Factoring company",
    blurb: "Electronic invoice submission to your factor — advances and reserves tracked without the fax machine.",
    domain: "",
    url: null,
    icon: "Banknote",
    tint: "neutral",
  },
  plaid: {
    id: "plaid",
    title: "Plaid — financial data connectivity",
    blurb: "Connects bank accounts to apps — the universal fallback that reads fuel spend off the bank statement.",
    domain: "plaid.com",
    url: "https://plaid.com",
    icon: "Landmark",
    tint: "neutral",
  },

  // ---- Integrations: road services -----------------------------------------
  bestpass: {
    id: "bestpass",
    title: "Bestpass — toll management for fleets",
    blurb: "One transponder and one invoice for nationwide tolling — per-truck toll data instead of a monthly surprise.",
    domain: "bestpass.com",
    url: "https://www.bestpass.com",
    icon: "Coins",
    tint: "warn",
  },
  prepass: {
    id: "prepass",
    title: "PrePass weigh station bypass",
    blurb: "Bypass at hundreds of weigh stations plus toll services — good safety scores earn the green light.",
    domain: "prepass.com",
    url: "https://prepass.com",
    icon: "ShieldCheck",
    tint: "warn",
  },
  drivewyze: {
    id: "drivewyze",
    title: "Drivewyze smart roadways",
    blurb: "Weigh-station bypass riding on the ELD already in the cab — 80+ telematics providers supported.",
    domain: "drivewyze.com",
    url: "https://drivewyze.com",
    icon: "ShieldCheck",
    tint: "warn",
  },

  // ---- Integrations: maintenance, safety, EDI ------------------------------
  fleetio: {
    id: "fleetio",
    title: "Fleetio fleet maintenance software",
    blurb: "Maintenance management — service reminders, work orders, and vehicle records synced both ways.",
    domain: "fleetio.com",
    url: "https://www.fleetio.com",
    icon: "Wrench",
    tint: "info",
  },
  sambasafety: {
    id: "sambasafety",
    title: "SambaSafety driver risk management",
    blurb: "Continuous MVR monitoring — a license status change surfaces in days, not at annual renewal.",
    domain: "sambasafety.com",
    url: "https://www.sambasafety.com",
    icon: "ShieldAlert",
    tint: "warn",
  },
  stedi: {
    id: "stedi",
    title: "Stedi — EDI platform",
    blurb: "Developer-first EDI: receive 204 load tenders and send 990/214/210 as JSON, no VAN required.",
    domain: "stedi.com",
    url: "https://www.stedi.com",
    icon: "Network",
    tint: "info",
  },
}

export function linkPreview(id: string): LinkPreview | null {
  return LINK_PREVIEWS[id] ?? null
}
