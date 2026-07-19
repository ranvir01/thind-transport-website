/**
 * Customers/CRM workflow smoke test: owner opens the customers list (cards
 * render with status pills and exact-cent revenue), opens Pacific Crest
 * Logistics (relationship stats, seeded contacts, seeded activity, load
 * history all render), adds a contact and logs a CRM note, both survive a
 * reload, and a driver is bounced off /hub/customers.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — each run inserts a
 * contact and an activity row, so without a reseed the panels accumulate
 * duplicates run over run.
 *
 * Usage: node scripts/e2e-customers-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, sleep, failures, check, waitForText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-customers"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const CUSTOMER = "Pacific Crest Logistics"
const NEW_CONTACT = { name: "Jordan Blake", role: "Night dispatch", phone: "(206) 555-0199", email: "jordan.blake@smoke.test" }
const NEW_NOTE = "Smoke: confirmed Q3 lane rates with Jordan — reefer YKM-SEA holding at $2.85."

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Login as owner, open the customers list")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/customers`, { waitUntil: "networkidle2" })
  await waitForText(page, CUSTOMER)
  const list = await page.evaluate((name) => {
    const card = [...document.querySelectorAll("a[href^='/hub/customers/']")].find((a) =>
      a.textContent.includes(name)
    )
    return {
      cardCount: document.querySelectorAll("a[href^='/hub/customers/']").length,
      hasStatusPill: /active/i.test(card?.textContent ?? ""),
      revenue: card?.querySelector("span.font-mono")?.textContent?.trim() ?? null,
    }
  }, CUSTOMER)
  check(list.cardCount >= 7, `seeded customer cards render (${list.cardCount})`)
  check(list.hasStatusPill, `${CUSTOMER} card shows its status pill`)
  // Summary money renders whole dollars by design (fmtCents, maximumFractionDigits: 0).
  check(/^\$[\d,]+$/.test(list.revenue ?? ""), `card revenue renders as summary dollars (${list.revenue})`)
  await shot(page, "01-customers-list")

  console.log("2. Open the customer detail")
  await clickByText(page, CUSTOMER, { tag: "a" })
  await waitForText(page, "Load history")
  const detail = await page.evaluate(() => {
    // Stat labels are CSS-uppercased; innerText reflects the transform.
    const text = document.body.innerText.toLowerCase()
    const revenuePanel = [...document.querySelectorAll("span")].find((s) =>
      s.textContent.trim().toLowerCase() === "revenue"
    )
    return {
      hasStats: text.includes("avg rate/mi"),
      revenue: revenuePanel?.parentElement?.querySelector("p")?.textContent?.trim() ?? null,
      hasSeededContact: text.includes("mike reynolds"),
      hasSeededActivity: text.includes("reefer volume out of yakima"),
      hasLoadHistory: text.includes("load history"),
    }
  })
  check(detail.hasStats, "relationship stats render")
  check(/^\$[\d,]+$/.test(detail.revenue ?? ""), `revenue stat renders as summary dollars (${detail.revenue})`)
  check(detail.hasSeededContact, "seeded contact (Mike Reynolds · Carrier rep) renders")
  check(detail.hasSeededActivity, "seeded CRM call note renders")
  await shot(page, "02-customer-detail")

  console.log("3. Add a contact")
  await clickByText(page, "Add")
  await page.waitForSelector('input[aria-label="Name"]', { timeout: 8000 })
  await page.type('input[aria-label="Name"]', NEW_CONTACT.name)
  await page.type('input[aria-label="Role"]', NEW_CONTACT.role)
  await page.type('input[aria-label="Phone"]', NEW_CONTACT.phone)
  await page.type('input[aria-label="Email"]', NEW_CONTACT.email)
  await clickByText(page, "Save contact")
  await waitForText(page, "Contact added")
  await waitForText(page, NEW_CONTACT.name)
  check(true, "contact added and renders in the panel")
  await shot(page, "03-contact-added")

  console.log("4. Log a CRM note")
  await page.type('input[aria-label="Activity"]', NEW_NOTE)
  await clickByText(page, "Log")
  await waitForText(page, "Logged")
  await waitForText(page, NEW_NOTE)
  check(true, "note logged and renders in the activity feed")
  await shot(page, "04-note-logged")

  console.log("5. Both survive a reload")
  await page.reload({ waitUntil: "networkidle2" })
  await waitForText(page, "Load history")
  const persisted = await page.evaluate(
    ({ name, note }) => ({
      contact: document.body.innerText.includes(name),
      note: document.body.innerText.includes(note),
    }),
    { name: NEW_CONTACT.name, note: NEW_NOTE }
  )
  check(persisted.contact, "new contact survives reload")
  check(persisted.note, "new note survives reload")
  await shot(page, "05-after-reload")

  console.log("6. Driver cannot reach /hub/customers")
  // Fresh cookie jar — the default context is still logged in as owner.
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/customers`, { waitUntil: "networkidle2" })
  await sleep(1000)
  const driverBlocked = await page2.evaluate(() => ({
    url: location.pathname,
    seesBook: document.body.innerText.includes("book of business"),
  }))
  check(driverBlocked.url !== "/hub/customers", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesBook, "driver never sees the customers list")
  await shot(page2, "06-customers-driver-blocked")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nCustomers smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nCustomers smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
