/**
 * Load booking workflow smoke test — the one workflow every dispatch day
 * starts with and the only daily flow that had no dedicated smoke: dispatcher
 * opens Book a Load, fills customer/stops/rate (odd cents on purpose), the
 * client-side total agrees, booking lands on the load detail with a THD-
 * reference and cent-exact money, the load shows up on the loads list, and a
 * driver is bounced off /hub/loads/new.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — each run books a new
 * load, so without a reseed the list and the THD- reference counter drift
 * run over run.
 *
 * Usage: node scripts/e2e-loads-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-loads"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const CUSTOMER = "Pacific Crest Logistics"
const REFERENCE = "SMOKE-4417"
// Odd cents on purpose: 1850.75 + 214.30 + 75.25 = 2140.30 exercises the
// dollarsToCents path end to end (a float path shows drift on these).
const LINEHAUL = "1850.75"
const FSC = "214.30"
const DETENTION = "75.25"
const CLIENT_TOTAL = "$2,140.30"

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

  console.log("1. Login as dispatcher, open Book a Load")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/loads/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Book a Load")
  const form = await page.evaluate(() => ({
    customers: document.querySelectorAll("#customer option").length,
    stopCards: document.querySelectorAll('select[aria-label="Stop type"]').length,
  }))
  check(form.customers >= 7, `customer dropdown lists seeded customers (${form.customers - 1})`)
  check(form.stopCards === 2, `new form starts with pickup + delivery stops (${form.stopCards})`)
  await shot(page, "01-book-a-load")

  console.log("2. Fill booking, stops, and rate")
  const customerId = await page.evaluate((name) => {
    const opt = [...document.querySelectorAll("#customer option")].find((o) => o.textContent.includes(name))
    return opt?.value ?? null
  }, CUSTOMER)
  check(Boolean(customerId), `${CUSTOMER} present in the customer dropdown`)
  await page.select("#customer", customerId)
  await page.type("#customer_reference", REFERENCE)
  await page.type("#commodity", "Fresh apples")
  await page.type("#weight", "42000")

  const facilities = await page.$$('input[aria-label="Facility"]')
  const cities = await page.$$('input[aria-label="City"]')
  const states = await page.$$('input[aria-label="State"]')
  await facilities[0].type("Yakima Fresh Cold Storage")
  await cities[0].type("Yakima")
  await states[0].type("WA")
  await facilities[1].type("Harbor Island DC")
  await cities[1].type("Seattle")
  await states[1].type("WA")

  await page.type("#linehaul", LINEHAUL)
  await page.type("#fsc", FSC)
  await page.type("#loaded_miles", "145")
  await clickByText(page, "Custom accessorial")
  await page.type('input[aria-label="Accessorial label"]', "Detention")
  await page.type('input[aria-label="Accessorial amount"]', DETENTION)

  await waitForText(page, CLIENT_TOTAL)
  check(true, `client-side total sums odd cents exactly (${CLIENT_TOTAL})`)
  await shot(page, "02-form-filled")

  console.log("3. Book the load")
  await clickByText(page, "Book load")
  // Booking geocodes both stops server-side (geocodeStops -> geocodeCityState),
  // sequentially, against the live rate-limited Nominatim API on a cache miss
  // (src/lib/hub/geocode.ts) — a never-before-booked city pair costs real
  // network round trips here, not just DB time. The default 15s waitForText
  // budget is tuned for cached/local work and flakes on a cold geocode_cache;
  // give this specific wait room for two live lookups plus rate-limit spacing.
  await waitForText(page, "Load booked", 30000)
  await page.waitForFunction(
    () => /\/hub\/loads\/[0-9a-f-]{36}$/.test(location.pathname),
    { timeout: 30000 }
  )
  await waitForText(page, "Rate")
  const detail = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      reference: (text.match(/THD-\d+/) ?? [null])[0],
      hasBookedBadge: /booked/i.test(text),
      hasLinehaul: text.includes("$1,850.75"),
      hasFsc: text.includes("$214.30"),
      hasDetention: text.includes("$75.25"),
      hasTotal: text.includes("$2,140"),
      hasPickup: text.includes("Yakima"),
      hasDelivery: text.includes("Seattle"),
    }
  })
  check(Boolean(detail.reference), `detail assigned a carrier reference (${detail.reference})`)
  check(detail.hasBookedBadge, "load lands in booked status")
  check(detail.hasLinehaul, "linehaul renders cent-exact ($1,850.75)")
  check(detail.hasFsc, "fuel surcharge renders cent-exact ($214.30)")
  check(detail.hasDetention, "detention accessorial renders cent-exact ($75.25)")
  check(detail.hasTotal, "rate total renders ($2,140)")
  check(detail.hasPickup && detail.hasDelivery, "both stops render (Yakima → Seattle)")
  await shot(page, "03-load-detail")

  console.log("4. New load shows on the loads list")
  await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(page, detail.reference ?? "THD-")
  const list = await page.evaluate(
    ({ reference, brokerRef }) => {
      const text = document.body.innerText
      return { hasLoad: text.includes(reference), hasBrokerRef: text.includes(brokerRef) }
    },
    { reference: detail.reference ?? "", brokerRef: REFERENCE }
  )
  check(list.hasLoad, `loads list shows ${detail.reference}`)
  check(list.hasBrokerRef, `loads list shows the broker reference (${REFERENCE})`)
  await shot(page, "04-loads-list")

  console.log("5. Driver cannot reach Book a Load")
  // Fresh cookie jar — the default context is still logged in as dispatcher.
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/loads/new`, { waitUntil: "networkidle2" })
  await sleep(1000)
  const driverBlocked = await page2.evaluate(() => ({
    url: location.pathname,
    seesForm: document.body.innerText.includes("Book a Load"),
  }))
  check(driverBlocked.url !== "/hub/loads/new", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesForm, "driver never sees the booking form")
  await shot(page2, "05-loads-new-driver-blocked")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nLoads smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nLoads smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
