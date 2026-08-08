/**
 * The Toolbox registry — the "never leave the app" surface, built on what a
 * web app can actually promise.
 *
 * THE HONEST MECHANICS (full reasoning: docs/decisions/0003-everything-app.md)
 * X/WeChat keep users inside because a NATIVE app owns a webview it can point
 * anywhere. A web app cannot: sites like DAT, Google, and most SaaS send
 * X-Frame-Options / frame-ancestors headers that make iframe embedding
 * physically not render. So this registry declares, per resource, the best
 * containment the web platform truly allows:
 *
 *  - `embed: "frame"` — renders INSIDE the Toolbox in an iframe. Guaranteed
 *    only for our own origin (the calculators and tools the marketing site
 *    already hosts), which is why every frame entry here is a same-origin
 *    path. An external site may be promoted to "frame" only after someone
 *    verifies its headers actually permit it — never by optimism.
 *  - `embed: "sheet"` — window.open on top of LoadOff. In the installed iOS
 *    app this is the in-app browser sheet (close it and you are exactly
 *    where you were — the X experience); on desktop it is a sized popup with
 *    LoadOff still open behind it.
 *
 * The deep integrations (DAT search, ELD feeds, QBO) are NOT here — they are
 * the stronger form of "never leave": the data comes into LoadOff's own UI
 * through the integration layer. The Toolbox is for everything that is a
 * page, not a feed: regulations, pass reports, lookups, calculators.
 *
 * Pure data + pure helpers; the panel component renders it.
 */

export interface WorkbenchResource {
  id: string
  label: string
  /** One line a dispatcher/driver reads to know when they'd tap this. */
  blurb: string
  /** Same-origin path (embed "frame") or absolute https URL (embed "sheet"). */
  url: string
  group: "Calculators & tools" | "Regulations" | "Passes & weather" | "Lookups"
  embed: "frame" | "sheet"
  /**
   * External frame rows only: the date the target's response headers were
   * verified to permit cross-origin framing (no X-Frame-Options, no
   * frame-ancestors restriction). Required by workbench.test.ts for any
   * external "frame" row; re-verify with scripts/verify-frame-headers.mjs.
   */
  frameVerified?: string
}

export const WORKBENCH_RESOURCES: readonly WorkbenchResource[] = [
  // ---- Our own tools: same origin, so they truly embed -------------------
  {
    id: "freight-class",
    label: "Freight class calculator",
    blurb: "NMFC density class from dims + weight — for LTL quotes.",
    url: "/tools/freight-class-calculator",
    group: "Calculators & tools",
    embed: "frame",
  },
  {
    id: "hos-clock",
    label: "HOS clock planner",
    blurb: "11 / 14 / 30-minute / 70 worked out from when you came on duty.",
    url: "/resources#hos",
    group: "Calculators & tools",
    embed: "frame",
  },
  {
    id: "state-guides",
    label: "State freight guides",
    blurb: "Corridors, chain laws, and seasonal freight per state — ours, no ads.",
    url: "/cdl-jobs",
    group: "Calculators & tools",
    embed: "frame",
  },

  // ---- Regulations: official text, official sites ------------------------
  {
    id: "ecfr-395",
    label: "49 CFR 395 — Hours of Service",
    blurb: "The actual HOS regulation text, straight from eCFR.",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-395",
    group: "Regulations",
    embed: "sheet",
  },
  {
    id: "ecfr-396",
    label: "49 CFR 396 — Inspection & maintenance",
    blurb: "DVIR, periodic inspection, and repair rules.",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396",
    group: "Regulations",
    embed: "sheet",
  },
  {
    id: "ecfr-382",
    label: "49 CFR 382 — Drug & alcohol",
    blurb: "Testing rules behind the random-pool screen in Compliance.",
    url: "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-382",
    group: "Regulations",
    embed: "sheet",
  },
  {
    id: "fmcsa-eld-list",
    label: "FMCSA registered ELD list",
    blurb: "Is a device actually registered (or revoked)? Check before buying.",
    url: "https://eld.fmcsa.dot.gov/List",
    group: "Regulations",
    embed: "sheet",
  },

  // ---- Passes & weather: the winter chokepoints we actually run ----------
  {
    id: "wsdot-passes",
    label: "WSDOT mountain passes",
    blurb: "Snoqualmie chain status before committing to I-90.",
    url: "https://wsdot.com/travel/real-time/mountainpasses",
    group: "Passes & weather",
    embed: "frame",
    frameVerified: "2026-08-07",
  },
  {
    id: "tripcheck",
    label: "Oregon TripCheck",
    blurb: "Cabbage Hill and Siskiyou conditions + chain requirements.",
    url: "https://www.tripcheck.com",
    group: "Passes & weather",
    embed: "frame",
    frameVerified: "2026-08-07",
  },
  {
    id: "idaho-511",
    label: "Idaho 511",
    blurb: "Fourth of July and Lookout Pass on the I-90 run.",
    url: "https://511.idaho.gov",
    group: "Passes & weather",
    embed: "sheet",
  },
  {
    id: "nws",
    label: "National Weather Service",
    blurb: "Route weather straight from the source.",
    url: "https://www.weather.gov",
    group: "Passes & weather",
    embed: "frame",
    frameVerified: "2026-08-07",
  },

  // ---- Lookups ------------------------------------------------------------
  {
    id: "safer",
    label: "FMCSA SAFER snapshot",
    blurb: "Any carrier or broker's authority, by DOT or MC number.",
    url: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
    group: "Lookups",
    embed: "sheet",
  },
  {
    id: "eia-diesel",
    label: "EIA diesel prices",
    blurb: "This week's on-highway diesel by region — the FSC anchor.",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
    group: "Lookups",
    embed: "frame",
    frameVerified: "2026-08-07",
  },
  {
    id: "iftach",
    label: "IFTA rate tables",
    blurb: "Current quarter's jurisdiction fuel-tax rates.",
    url: "https://www.iftach.org",
    group: "Lookups",
    embed: "sheet",
  },
] as const

export const WORKBENCH_GROUPS = [
  "Calculators & tools",
  "Regulations",
  "Passes & weather",
  "Lookups",
] as const satisfies readonly WorkbenchResource["group"][]
