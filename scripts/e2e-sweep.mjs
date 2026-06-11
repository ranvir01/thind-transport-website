/**
 * Final verification sweep: every changed screen at 1440px and 390px,
 * with a horizontal-scroll check at 390px (mobile-first non-negotiable).
 *
 * Usage: node scripts/e2e-sweep.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import path from "node:path"

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const OUT = process.argv[2] ?? "e2e-sweep"
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const OFFICE_PAGES = [
  ["today", "/hub"],
  ["planner", "/hub/planner"],
  ["dispatch", "/hub/dispatch"],
  ["messages", "/hub/messages"],
  ["announcements", "/hub/messages/announcements"],
  ["tasks", "/hub/tasks"],
  ["facilities", "/hub/facilities"],
  ["recruiting", "/hub/recruiting"],
  ["safety", "/hub/safety"],
  ["fuel", "/hub/fuel"],
  ["money", "/hub/money"],
  ["compliance", "/hub/compliance"],
  ["capacity", "/hub/capacity"],
  ["packet", "/hub/settings/packet"],
]

const DRIVER_PAGES = [
  ["driver-home", "/hub/driver"],
  ["driver-dvir", "/hub/driver/dvir"],
  ["driver-messages", "/hub/driver/messages"],
  ["driver-pay", "/hub/driver/pay"],
  ["driver-timeoff", "/hub/driver/timeoff"],
  ["driver-incident", "/hub/driver/incident"],
  ["driver-docs", "/hub/driver/docs"],
  ["driver-more", "/hub/driver/more"],
]

async function login(page, email) {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
  await page.type("#email", email)
  await page.type("#password", "ThindDemo1!")
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
    page.click('button[type="submit"]'),
  ])
}

async function sweep(page, pages, prefix, width) {
  const problems = []
  for (const [name, url] of pages) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2" })
    await sleep(600)
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
    console.error("\n390px PROBLEMS:")
    for (const p of problems) console.error(` ✗ ${p}`)
    process.exit(1)
  }
  console.log("\nSweep clean: no horizontal overflow at 390px, all screens captured ✔")
}

main().catch((err) => {
  console.error("SWEEP FAILED:", err.message)
  process.exit(1)
})
