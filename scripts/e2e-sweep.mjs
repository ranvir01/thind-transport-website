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
import puppeteer from "puppeteer"
import pg from "pg"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { BASE, sleep, login } from "./e2e-lib.mjs"

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
  ["compliance", "/hub/compliance", "expired / overdue"],
  ["capacity", "/hub/capacity", "empty trucks, advertised"],
  ["packet", "/hub/settings/packet", "stored once, sent in one click"],
  ["setup", "/hub/setup", "upload paperwork once"],
]

// Portal + tracking are forced-dark surfaces (same regression class as the
// driver app — see AGENTS.md token doctrine). Anchors are page subtitles /
// always-rendered section labels, per the rule above. The broker load-detail
// row and the /track URL are appended at runtime in main().
const PORTAL_PAGES = [
  ["portal-home", "/hub/portal", "no checking calls needed"],
]

const SHIPPER_PAGES = [
  // Quote form renders for shippers only — this is what distinguishes the
  // shipper home from the broker home the row above already covers.
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
    await sleep(600)
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
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })
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

  // Driver app at phone
  const driverContext = await browser.createBrowserContext()
  const driver = await driverContext.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(driver, "driver@demo.thind")
  console.log("Driver app @ 390px")
  problems.push(...(await sweep(driver, DRIVER_PAGES, "driver", 390)))

  // Broker portal at phone (portals are the third forced-dark surface)
  const brokerContext = await browser.createBrowserContext()
  const broker = await brokerContext.newPage()
  await broker.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(broker, "broker@demo.thind")
  console.log("Broker portal @ 390px")
  const portalPages = [...PORTAL_PAGES]
  await broker.goto(`${BASE}/hub/portal`, { waitUntil: "networkidle2" })
  const loadHref = await broker.evaluate(
    () =>
      [...document.querySelectorAll("a")]
        .find((a) => a.getAttribute("href")?.includes("/hub/portal/loads/"))
        ?.getAttribute("href") ?? null
  )
  if (loadHref) portalPages.push(["portal-load", loadHref, "stops"])
  else problems.push("portal-load: broker home has no /hub/portal/loads/ link (seed should provide one)")
  problems.push(...(await sweep(broker, portalPages, "portal", 390)))

  // Shipper portal at phone (same route, quote-form variant)
  const shipperContext = await browser.createBrowserContext()
  const shipper = await shipperContext.newPage()
  await shipper.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(shipper, "shipper@demo.thind")
  console.log("Shipper portal @ 390px")
  problems.push(...(await sweep(shipper, SHIPPER_PAGES, "portal", 390)))

  // Public tracking page at phone (no login — token straight from the DB)
  if (process.env.POSTGRES_URL) {
    const db = new pg.Client({ connectionString: process.env.POSTGRES_URL })
    await db.connect()
    const link = await db.query(
      `SELECT sl.token FROM hub.share_links sl
         JOIN hub.loads l ON l.id = sl.load_id
        WHERE sl.revoked_at IS NULL AND l.status <> 'cancelled'
        ORDER BY sl.created_at DESC LIMIT 1`
    )
    await db.end()
    if (link.rows[0]) {
      const trackContext = await browser.createBrowserContext()
      const track = await trackContext.newPage()
      await track.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
      console.log("Public tracking @ 390px")
      problems.push(
        ...(await sweep(track, [["track", `/track/${link.rows[0].token}`, "shipment"]], "public", 390))
      )
    } else {
      problems.push("track: no unrevoked share link in hub.share_links (seed should provide one)")
    }
  } else {
    console.log("⏭  /track sweep skipped: POSTGRES_URL unset (needed for the share-link token)")
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
