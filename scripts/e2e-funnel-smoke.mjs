/**
 * Full lead-conversion funnel smoke — the only smoke that proves the CHAIN,
 * not just the form UI: a submitted lead must land in hub.website_leads and
 * surface where dispatch actually sees it (/hub Today card, /hub/leads with
 * a tap-to-call tel: link). e2e-apply-smoke.mjs covers the form UX but its
 * own header flags that it cannot verify the row; this script closes that
 * gap for both funnels:
 *
 *   1. Driver: homepage → /apply step 1 (qualify) → step 2 (contact) —
 *      advancing fires captureLead → row in hub.website_leads (status
 *      'new', phone intact) → /hub Today "reached out on the website"
 *      card → /hub/leads row with a working tel: link.
 *   2. Shipper: /shippers quote form → row with source
 *      'Shipper/Broker quote request' → /hub/leads row + tel: link.
 *
 * All driven at 390px (drivers apply from phones). Test leads are deleted
 * at the end so repeated runs don't pollute the demo DB.
 *
 * Usage: node scripts/e2e-funnel-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000, POSTGRES_URL exported in the
 * shell (pitfall 11 — smokes don't read .env.local), seeded demo DB for
 * the /hub login (dispatch@demo.thind).
 */
import { mkdirSync } from "node:fs"
import pg from "pg"
import { BASE, sleep, check, failures, makeShot, clickByText, waitForText, login, realConsoleErrors, launchBrowser } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-funnel"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const db = new pg.Client({ connectionString: process.env.POSTGRES_URL })
await db.connect()

const STAMP = Date.now()
const DRIVER_EMAIL = `funnel-driver-${STAMP}@example.com`
const DRIVER_PHONE = "2065551234"
const SHIPPER_EMAIL = `funnel-shipper-${STAMP}@example.com`
const SHIPPER_PHONE = "4255556677"

async function fill(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 })
  await page.click(selector, { clickCount: 3 })
  await page.type(selector, value)
}

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  // ============ DRIVER FUNNEL ============
  console.log("— DRIVER FUNNEL @390px —")
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" })
  const noHscrollHome = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  )
  check(noHscrollHome, "homepage: no horizontal scroll at 390px")
  const applyHref = await page.evaluate(() => {
    const first = [...document.querySelectorAll('a[href="/apply"], a[href="/pre-qualify"]')]
    return first.length
  })
  check(applyHref > 0, `homepage has apply/pre-qualify CTA links (${applyHref})`)
  await shot(page, "01-homepage-390")

  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle2" })
  // Landing anchor must be STATIC page copy (e2e-anchors.test.ts): the wizard
  // header is a template ("Step {step} of 4:"), so anchor on the form card
  // heading and let the step-advance waits below cover the wizard itself.
  await waitForText(page, "Start Your Application")
  // Step 1: qualify
  await clickByText(page, "Company Driver", { tag: "label" })
  await clickByText(page, "Class A", { tag: "label" })
  await clickByText(page, "3-5 Years", { tag: "label" })
  await clickByText(page, "Continue Application")
  await waitForText(page, "Step 2 of 4")
  check(true, "apply step 1 (qualify) advances")
  await shot(page, "02-apply-step2-390")

  // Step 2: contact — advancing fires captureLead
  await fill(page, "#firstName", "Funnel")
  await fill(page, "#lastName", "Driver")
  await fill(page, "#email", DRIVER_EMAIL)
  await fill(page, "#phone", DRIVER_PHONE)
  await clickByText(page, "Continue Application")
  await waitForText(page, "Step 3 of 4", 20000)
  check(true, "apply step 2 (contact) advances through captureLead")
  await shot(page, "03-apply-step3-390")

  // give the fire-and-forget insert a moment
  await sleep(1500)
  const driverRow = (
    await db.query(`SELECT id, name, email, phone, source, status FROM hub.website_leads WHERE email = $1`, [
      DRIVER_EMAIL,
    ])
  ).rows[0]
  check(!!driverRow, `driver lead landed in hub.website_leads (${driverRow ? JSON.stringify(driverRow.source) : "MISSING"})`)
  check(driverRow?.status === "new", "driver lead status is 'new'")
  check(
    (driverRow?.phone ?? "").replace(/[^0-9]/g, "") === DRIVER_PHONE,
    `driver lead phone stored (${driverRow?.phone})`
  )

  // ============ HUB VERIFICATION (driver lead) ============
  console.log("— HUB @390px (Today card + /hub/leads) —")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  const todayCard = await page
    .evaluate(() => /reached out on the website/.test(document.body.innerText))
  check(todayCard, "/hub Today card shows 'reached out on the website'")
  await shot(page, "04-hub-today-390")

  await page.goto(`${BASE}/hub/leads`, { waitUntil: "networkidle2" })
  await waitForText(page, "the website")
  const driverLeadShown = await page.evaluate(
    (email) =>
      document.body.innerText.includes("Funnel Driver") ||
      !!document.querySelector(`a[href="mailto:${email}"]`),
    DRIVER_EMAIL
  )
  check(driverLeadShown, "/hub/leads lists the driver lead")
  const telOk = await page.evaluate((phone) => {
    return [...document.querySelectorAll('a[href^="tel:"]')].some((a) =>
      a.getAttribute("href").replace(/[^0-9]/g, "").includes(phone)
    )
  }, DRIVER_PHONE)
  check(telOk, "driver lead has a working tel: link with the submitted phone")
  await shot(page, "05-hub-leads-390")

  // ============ SHIPPER FUNNEL ============
  console.log("— SHIPPER FUNNEL @390px —")
  // fresh page (logged-in session is fine; public page)
  await page.goto(`${BASE}/shippers`, { waitUntil: "networkidle2" })
  const noHscrollShip = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  )
  check(noHscrollShip, "/shippers: no horizontal scroll at 390px")
  await fill(page, 'input[name="company"]', "Example Logistics")
  await fill(page, 'input[name="contact"]', "Funnel Shipper")
  await fill(page, 'input[name="email"]', SHIPPER_EMAIL)
  await fill(page, 'input[name="phone"]', SHIPPER_PHONE)
  await fill(page, 'input[name="lane"]', "Seattle, WA → Boise, ID")
  await clickByText(page, "Request a quote")
  await waitForText(page, "Quote request received", 20000)
  check(true, "shipper quote form submits to success card")
  await shot(page, "06-shipper-submitted-390")

  await sleep(1000)
  const shipperRow = (
    await db.query(`SELECT id, name, email, phone, source, message, status FROM hub.website_leads WHERE email = $1`, [
      SHIPPER_EMAIL,
    ])
  ).rows[0]
  check(!!shipperRow, "shipper lead landed in hub.website_leads")
  check(
    shipperRow?.source === "Shipper/Broker quote request",
    `shipper lead source is 'Shipper/Broker quote request' (got ${JSON.stringify(shipperRow?.source)})`
  )

  // hub shows the shipper lead too, with tel:
  await page.goto(`${BASE}/hub/leads`, { waitUntil: "networkidle2" })
  await waitForText(page, "the website")
  const shipperShown = await page.evaluate(
    (email) =>
      document.body.innerText.includes("Funnel Shipper") ||
      !!document.querySelector(`a[href="mailto:${email}"]`),
    SHIPPER_EMAIL
  )
  check(shipperShown, "/hub/leads lists the shipper lead")
  const shipperTel = await page.evaluate((phone) => {
    return [...document.querySelectorAll('a[href^="tel:"]')].some((a) =>
      a.getAttribute("href").replace(/[^0-9]/g, "").includes(phone)
    )
  }, SHIPPER_PHONE)
  check(shipperTel, "shipper lead has a working tel: link")
  await shot(page, "07-hub-leads-with-shipper-390")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/404|Failed to load resource/i.test(e))
  check(realErrors.length === 0, `no browser console errors (${realErrors.length})`)
  if (realErrors.length) realErrors.slice(0, 5).forEach((e) => console.log(`    · ${e.slice(0, 200)}`))

  await browser.close()
  // clean up test leads so the demo DB stays tidy
  await db.query(`DELETE FROM hub.website_leads WHERE email IN ($1, $2)`, [DRIVER_EMAIL, SHIPPER_EMAIL])
  await db.end()

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed:`)
    failures.forEach((f) => console.error(`  ✗ ${f}`))
    process.exit(1)
  }
  console.log("\nFull conversion funnel green ✔")
}

main().catch(async (err) => {
  console.error(err)
  try { await db.end() } catch {}
  process.exit(1)
})
