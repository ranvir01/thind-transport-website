/**
 * Dispatch → driver push-notify smoke: books a new load assigned to Harpreet
 * Singh (the only seeded driver with a portal login), dispatcher advances it
 * Booked → Dispatched from the load detail page, and the driver's
 * NotificationsBell shows the "dispatched to you" alert with an unread badge
 * and a working deep link — the notifyDriver() best-effort push path added
 * in loads.ts writes an in-app row regardless of VAPID config, so this is
 * verifiable without push keys. Requested as a Backlog item after the
 * push-notify-on-dispatch change (src/lib/hub/loads.ts).
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run books a new
 * load, so the THD- reference counter advances.
 *
 * Usage: node scripts/e2e-dispatch-driver-notify-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-dispatch-notify"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const CUSTOMER = "Pacific Crest Logistics"
const DRIVER = "Harpreet Singh"
const REFERENCE = "NOTIFY-9001"

async function main() {
  reseed()
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Dispatcher books a load for Harpreet Singh")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/loads/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Book a Load")

  const customerId = await page.evaluate((name) => {
    const opt = [...document.querySelectorAll("#customer option")].find((o) => o.textContent.includes(name))
    return opt?.value ?? null
  }, CUSTOMER)
  check(Boolean(customerId), `${CUSTOMER} present in the customer dropdown`)
  await page.select("#customer", customerId)
  await page.type("#customer_reference", REFERENCE)
  await page.type("#commodity", "Bottled water")
  await page.type("#weight", "38000")

  const facilities = await page.$$('input[aria-label="Facility"]')
  const cities = await page.$$('input[aria-label="City"]')
  const states = await page.$$('input[aria-label="State"]')
  await facilities[0].type("Kent Distribution Center")
  await cities[0].type("Kent")
  await states[0].type("WA")
  await facilities[1].type("Spokane Valley Warehouse")
  await cities[1].type("Spokane")
  await states[1].type("WA")

  await page.type("#linehaul", "1200.00")
  await page.type("#fsc", "120.00")
  await page.type("#loaded_miles", "280")

  const driverId = await page.evaluate((name) => {
    const opt = [...document.querySelectorAll("#driver option")].find((o) => o.textContent.includes(name))
    return opt?.value ?? null
  }, DRIVER)
  check(Boolean(driverId), `${DRIVER} present in the driver dropdown`)
  await page.select("#driver", driverId)
  await shot(page, "01-form-filled")

  await clickByText(page, "Book load")
  await waitForText(page, "Load booked")
  await page.waitForFunction(() => /\/hub\/loads\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 15000 })
  await waitForText(page, "Rate")
  const reference = await page.evaluate(() => (document.body.innerText.match(/THD-\d+/) ?? [null])[0])
  check(Boolean(reference), `load booked with a carrier reference (${reference})`)
  check(
    await page.evaluate((d) => document.body.innerText.includes(d), DRIVER),
    `load detail shows the assigned driver (${DRIVER})`
  )
  await shot(page, "02-load-booked")

  console.log("2. Dispatcher advances the load to Dispatched")
  check(await clickByText(page, "Mark Dispatched"), "clicked Mark Dispatched on the load detail page")
  await waitForText(page, "Moved to Dispatched")
  await sleep(500)
  await page.reload({ waitUntil: "networkidle2" })
  check(
    await page.evaluate(() => document.body.innerText.toLowerCase().includes("dispatched")),
    "load detail now shows Dispatched status"
  )
  await shot(page, "03-load-dispatched")

  console.log("3. Driver sees the dispatch notification")
  const ctx = await browser.createBrowserContext()
  const driverPage = await ctx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  const driverConsoleErrors = []
  driverPage.on("console", (msg) => {
    if (msg.type() === "error") driverConsoleErrors.push(msg.text())
  })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await sleep(1500) // NotificationsBell's first fetch is deferred off the mount effect

  const badge = await driverPage.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Notifications"]')
    return btn?.getAttribute("aria-label") ?? null
  })
  check(Boolean(badge?.includes("unread")), `bell shows an unread badge (${badge})`)

  await driverPage.click('button[aria-label^="Notifications"]')
  await waitForText(driverPage, "dispatched to you")
  await shot(driverPage, "04-driver-notification-feed")

  const feedText = await driverPage.evaluate(() => document.body.innerText)
  check(
    feedText.toLowerCase().includes(`load ${reference?.toLowerCase()} dispatched to you`),
    `feed item names the load (${reference})`
  )

  await driverPage.click('a[href="/hub/driver"]')
  await sleep(500)
  const badgeAfterOpen = await driverPage.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Notifications"]')
    return btn?.getAttribute("aria-label") ?? null
  })
  check(badgeAfterOpen === "Notifications", `opening the feed cleared the unread badge (${badgeAfterOpen})`)

  const realDispatcherErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  const realDriverErrors = driverConsoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realDispatcherErrors.length === 0, `no dispatcher console errors (${realDispatcherErrors.length})`)
  check(realDriverErrors.length === 0, `no driver console errors (${realDriverErrors.length})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nDispatch driver-notify smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDispatch driver-notify smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
