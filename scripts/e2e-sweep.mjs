/**
 * Final verification sweep: every changed screen at 1440px and 390px,
 * with a horizontal-scroll check at 390px (mobile-first non-negotiable)
 * and a body-text sanity check at every width (a screen that renders an
 * error boundary, a 404, or a blank page must fail the sweep, not pass it).
 *
 * Covers all four surfaces: office (dispatcher), driver app, broker/shipper
 * portal, and the public /track/[token] page. The portal load-detail URL and
 * tracking token are discovered at runtime (link on the broker home; newest
 * unrevoked share link in hub.share_links), so the portal/track section needs
 * POSTGRES_URL for the token lookup — when it's unset the track page is
 * skipped WITH a log line, never silently.
 *
 * Each page also declares an ANCHOR — a fragment of its own content (page
 * subtitle or an always-rendered label, never a nav-chrome word) that must
 * appear in the body text. This is what catches a page stuck on a loading
 * spinner: nav chrome alone supplies 40+ chars, but never the anchor.
 *
 * Usage: node scripts/e2e-sweep.mjs [outputDir]
 */
import pg from "pg"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { launchBrowser, BASE, login, waitForStableText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-sweep"
mkdirSync(OUT, { recursive: true })

// [name, url, anchor] — anchor is lowercase page-content text (subtitles,
// always-rendered labels). Never use a word the sidebar/bottom-nav renders.
const OFFICE_PAGES = [
  ["today", "/hub", "in one calm place"],
  ["planner", "/hub/planner", "whole week at a glance"],
  ["dispatch", "/hub/dispatch", "every active load, booking to pod"],
  ["messages", "/hub/messages", "no personal phone numbers"],
  ["announcements", "/hub/messages/announcements", "proof everyone saw them"],
  ["tasks", "/hub/tasks", "minus the sticky notes"],
  ["facilities", "/hub/facilities", "dwell history and driver tips"],
  ["recruiting", "/hub/recruiting", "drag between stages"],
  ["safety", "/hub/safety", "flow to the register automatically"],
  ["fuel", "/hub/fuel", "last 92 days across every card program"],
  ["money", "/hub/money", "receivables, invoices, and driver pay"],
  // Subtitle, not the red tile label: below sm: the tiles render shortLabel
  // ("Expired"), so "expired / overdue" disappears at 390px.
  ["compliance", "/hub/compliance", "one wall, color-coded"],
  ["capacity", "/hub/capacity", "empty trucks, advertised"],
  ["loadboard", "/hub/loadboard", "click any cell to edit"],
  ["loads", "/hub/loads", "manage every load"],
  ["customers", "/hub/customers", "your book of business"],
  ["drivers", "/hub/drivers", "qualification files"],
  ["fleet", "/hub/fleet", "trailers, and their paperwork"],
  ["reports", "/hub/reports", "per-truck p&l, last 92 days"],
  ["map", "/hub/map", "latest known position per truck"],
  ["import", "/hub/import", "map columns once, reuse forever"],
  ["help", "/hub/help", "how to use loadoff"],
  ["guide", "/hub/guide", "daily rhythm (after setup)"],
  ["settings", "/hub/settings", "company configuration, connections"],
  ["packet", "/hub/settings/packet", "stored once, sent in one click"],
  ["phone-app", "/hub/settings/app", "installed like an app"],
  ["setup", "/hub/setup", "upload paperwork once"],
]

// Owner-flavored screens the dispatcher pass above doesn't visit. Driven in a
// separate context as owner@demo.thind — the fleet's three primary roles
// (owner, dispatcher, driver) each get a real logged-in pass.
const OWNER_PAGES = [
  ["loadboard", "/hub/loadboard", "like excel"],
  // Subtitle branches on whether the demo carrier has driver-pay settlements
  // (it does, once seed-demo.mjs's paid settlements land) — anchor on the
  // "Per-truck P&L" lead-in both branches share, not the driver-pay-less tail.
  ["reports", "/hub/reports", "per-truck p&l"],
  ["owner-dashboard", "/hub/reports/owner", "an owner checks first"],
  ["invoices", "/hub/money/invoices", "every invoice, paid or open"],
  ["settlements", "/hub/money/settlements", "weekly driver pay"],
  ["fleet", "/hub/fleet", "trailers, and their paperwork"],
  ["drivers", "/hub/drivers", "qualification files"],
]

const SHIPPER_PAGES = [
  // Quote form renders for shippers only — this is what distinguishes the
  // shipper home from the broker home PORTAL_PAGES already covers.
  ["shipper-home", "/hub/portal", "request a quote"],
]

const DRIVER_PAGES = [
  ["driver-home", "/hub/driver", "my cards"],
  ["driver-dvir", "/hub/driver/dvir", "vehicle inspection"],
  ["driver-messages", "/hub/driver/messages", "no phone numbers needed"],
  ["driver-pay", "/hub/driver/pay", "line by line"],
  ["driver-timeoff", "/hub/driver/timeoff", "book you over it"],
  ["driver-incident", "/hub/driver/incident", "report an incident"],
  ["driver-docs", "/hub/driver/docs", "my documents"],
  ["driver-more", "/hub/driver/more", "ask for home time"],
]

// Broker/shipper portal — the forced-dark customer surface. The load-detail
// entry is resolved at runtime from the portal home's first load link (its
// URL carries a seeded UUID). "stops" / "documents" are always-rendered
// section headings on the detail screen.
const PORTAL_PAGES = [
  ["portal-home", "/hub/portal", "no checking calls needed"],
]

/**
 * The public /track/<token> page needs a seeded share-link token, which only
 * the database knows. Local rigs (the only place the seeded token matches the
 * server's DB — same reasoning as reseed()) resolve it here; remote sweeps
 * skip the track pass LOUDLY rather than silently shrinking coverage.
 */
async function resolveTrackUrl() {
  if (!/localhost|127\.0\.0\.1/.test(BASE) && process.env.E2E_RESEED !== "1") {
    console.warn("⚠ track page skipped: E2E_BASE_URL is remote (local POSTGRES_URL is not its DB)")
    return null
  }
  if (!process.env.POSTGRES_URL) {
    console.warn("⚠ track page skipped: POSTGRES_URL not set")
    return null
  }
  const db = new pg.Client({ connectionString: process.env.POSTGRES_URL })
  await db.connect()
  try {
    const { rows } = await db.query(
      `SELECT sl.token FROM hub.share_links sl
         JOIN hub.loads l ON l.id = sl.load_id
        WHERE l.status = 'in_transit' AND sl.revoked_at IS NULL
        LIMIT 1`
    )
    if (rows.length === 0) {
      console.warn("⚠ track page skipped: no share link for an in-transit load (run seed:demo)")
      return null
    }
    return `/track/${rows[0].token}`
  } finally {
    await db.end()
  }
}

// Phrases that only appear on dead screens: Next.js's default client-exception
// and 404 pages, plus our own error boundaries. Toast variants of "something
// went wrong" can't fire here — the sweep navigates, it never mutates.
const ERROR_MARKERS = [
  "application error",
  "unhandled runtime error",
  "internal server error",
  "this page could not be found",
  "road not found", // custom 404 in src/app/not-found.tsx
  "something went wrong",
]

async function sweep(page, pages, prefix, width) {
  const problems = []
  for (const [name, url, anchor] of pages) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2" })
    await waitForStableText(page)
    if (page.url().includes("/hub/login")) {
      problems.push(`${name}: bounced to login at ${width}px (session lost)`)
    } else {
      const text = await page.evaluate(() => (document.body?.innerText ?? "").trim())
      const lower = text.toLowerCase()
      const marker = ERROR_MARKERS.find((m) => lower.includes(m))
      if (marker) problems.push(`${name}: error state at ${width}px ("${marker}")`)
      else if (text.length < 40)
        problems.push(`${name}: near-blank page at ${width}px (${text.length} chars of body text)`)
      else if (!lower.includes(anchor))
        problems.push(`${name}: page content missing at ${width}px (no "${anchor}" — stuck on a spinner?)`)
    }
    if (width === 390) {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      // The planner is a deliberate horizontal-scroll surface inside its own
      // container; the PAGE itself must still not overflow.
      if (overflow > 2) problems.push(`${name}: page overflows by ${overflow}px at 390px`)
    }
    await page.screenshot({ path: path.join(OUT, `${prefix}-${name}-${width}.png`) })
    console.log(`  📸 ${prefix}-${name}-${width}`)
  }
  return problems
}

async function main() {
  const browser = await launchBrowser()
  const problems = []

  // Office at desktop + phone
  const office = await browser.newPage()
  await office.setViewport({ width: 1440, height: 950 })
  await login(office, "dispatch@demo.thind")
  console.log("Office @ 1440px")
  problems.push(...(await sweep(office, OFFICE_PAGES, "office", 1440)))
  await office.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  console.log("Office @ 390px")
  problems.push(...(await sweep(office, OFFICE_PAGES, "office", 390)))

  // Owner at desktop + phone
  const ownerContext = await browser.createBrowserContext()
  const owner = await ownerContext.newPage()
  await owner.setViewport({ width: 1440, height: 950 })
  await login(owner, "owner@demo.thind")
  console.log("Owner @ 1440px")
  problems.push(...(await sweep(owner, OWNER_PAGES, "owner", 1440)))
  await owner.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  console.log("Owner @ 390px")
  problems.push(...(await sweep(owner, OWNER_PAGES, "owner", 390)))

  // Driver app at phone
  const driverContext = await browser.createBrowserContext()
  const driver = await driverContext.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(driver, "driver@demo.thind")
  console.log("Driver app @ 390px")
  problems.push(...(await sweep(driver, DRIVER_PAGES, "driver", 390)))

  // Portal (broker) at desktop + phone — the fourth seeded persona's surface.
  const portalContext = await browser.createBrowserContext()
  const portal = await portalContext.newPage()
  await portal.setViewport({ width: 1440, height: 950 })
  await login(portal, "broker@demo.thind")
  await portal.goto(`${BASE}/hub/portal`, { waitUntil: "networkidle2" })
  const loadHref = await portal.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.getAttribute("href")?.includes("/hub/portal/loads/"))?.getAttribute("href")
  )
  const portalPages = [...PORTAL_PAGES]
  if (loadHref) portalPages.push(["portal-load", loadHref, "stops"])
  else problems.push("portal-home: no /hub/portal/loads/ link found (broker sees no loads?)")
  console.log("Portal @ 1440px")
  problems.push(...(await sweep(portal, portalPages, "portal", 1440)))
  await portal.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  console.log("Portal @ 390px")
  problems.push(...(await sweep(portal, portalPages, "portal", 390)))

  // Shipper portal at phone (same route, quote-form variant)
  const shipperContext = await browser.createBrowserContext()
  const shipper = await shipperContext.newPage()
  await shipper.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(shipper, "shipper@demo.thind")
  console.log("Shipper portal @ 390px")
  problems.push(...(await sweep(shipper, SHIPPER_PAGES, "portal", 390)))

  // Public tracking page — no login, just the share-link token.
  const trackUrl = await resolveTrackUrl()
  if (trackUrl) {
    const trackContext = await browser.createBrowserContext()
    const track = await trackContext.newPage()
    const trackPages = [["track", trackUrl, "shipment"]]
    await track.setViewport({ width: 1440, height: 950 })
    console.log("Track page @ 1440px")
    problems.push(...(await sweep(track, trackPages, "track", 1440)))
    await track.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    console.log("Track page @ 390px")
    problems.push(...(await sweep(track, trackPages, "track", 390)))
  }

  await browser.close()

  if (problems.length > 0) {
    console.error("\nSWEEP PROBLEMS:")
    for (const p of problems) console.error(` ✗ ${p}`)
    process.exit(1)
  }
  console.log("\nSweep clean: every screen has real content, no horizontal overflow at 390px ✔")
}

main().catch((err) => {
  console.error("SWEEP FAILED:", err.message)
  process.exit(1)
})
