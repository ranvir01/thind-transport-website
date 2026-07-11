/**
 * Final verification sweep: every changed screen at 1440px and 390px,
 * with a horizontal-scroll check at 390px (mobile-first non-negotiable)
 * and a body-text sanity check at every width (a screen that renders an
 * error boundary, a 404, or a blank page must fail the sweep, not pass it).
 *
 * Each page also declares an ANCHOR — a fragment of its own content (page
 * subtitle or an always-rendered label, never a nav-chrome word) that must
 * appear in the body text. This is what catches a page stuck on a loading
 * spinner: nav chrome alone supplies 40+ chars, but never the anchor.
 *
 * Usage: node scripts/e2e-sweep.mjs [outputDir]
 */
import puppeteer from "puppeteer"
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
  ["settings", "/hub/settings", "connections, and shared documents"],
  ["packet", "/hub/settings/packet", "stored once, sent in one click"],
  ["setup", "/hub/setup", "upload paperwork once"],
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
