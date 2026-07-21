/**
 * Fuel workflow smoke test: owner opens the fuel screen (stats, fraud flags,
 * unassigned inbox all render), links a pump receipt to a load and the load
 * detail shows the same exact cents ("Fuel on this load"), the unassigned
 * count drops by exactly one, a transaction is reclassified road → reefer and
 * the change survives a reload, and a driver is bounced off /hub/fuel.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — each run consumes an
 * unassigned receipt and flips a road badge to reefer, so without a reseed
 * the inbox drains and the reefer count drifts run over run.
 *
 * Usage: node scripts/e2e-fuel-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, textGone, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-fuel"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// "Unassigned fuel · 36" -> 36
const unassignedCount = (page) =>
  page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned fuel")
    )
    const m = h2?.textContent.match(/·\s*(\d+)/)
    return m ? Number(m[1]) : null
  })

// FuelUseBadge renders the short label as the button's whole text.
const badgeCount = (page, label) =>
  page.evaluate(
    (l) => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === l).length,
    label
  )

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Login as owner, open the fuel screen")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  await waitForText(page, "Fuel spend")
  // Headings render CSS-uppercased, and innerText reflects the transform.
  const screen = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase()
    return {
      hasFlags: text.includes("flags"),
      hasPerTruck: text.includes("per truck"),
      hasByProgram: text.includes("by card program"),
    }
  })
  check(screen.hasPerTruck, "per-truck table renders")
  check(screen.hasByProgram, "by-program table renders")
  // Seed plants one over-capacity Comdata purchase (312 gal on a 240 gal tank).
  check(screen.hasFlags, "fraud flags panel renders the seeded over-capacity flag")
  const countBefore = await unassignedCount(page)
  check(countBefore !== null && countBefore > 0, `unassigned inbox has receipts (${countBefore})`)
  await shot(page, "01-fuel-before")

  console.log("2. Link the top unassigned receipt to a load")
  const receipt = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned fuel")
    )
    const row = h2?.closest("div.mb-4")?.querySelector("div.divide-y > div")
    const select = row?.querySelector("select")
    const option = select?.querySelector('option:not([value=""])')
    // Exact cents from the row meta, e.g. "Jun 30 · #102 · 107.0 gal · $448.33"
    const cents = row?.querySelector("span.font-mono")?.textContent?.trim() ?? null
    return option
      ? { loadId: option.value, loadLabel: option.textContent.trim(), cents }
      : null
  })
  check(!!receipt, "top receipt has an assignable load option")
  check(/\$[\d,]+\.\d{2}$/.test(receipt?.cents ?? ""), `receipt shows exact cents (${receipt?.cents})`)
  await page.evaluate((loadId) => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned fuel")
    )
    const select = h2?.closest("div.mb-4")?.querySelector("div.divide-y > div select")
    select.value = loadId
    select.dispatchEvent(new Event("change", { bubbles: true }))
  }, receipt.loadId)
  await clickByText(page, "Link")
  await waitForText(page, "Linked to")
  await shot(page, "02-fuel-linked")

  console.log("3. Load detail shows the receipt at the same exact cents")
  await page.goto(`${BASE}/hub/loads/${receipt.loadId}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Fuel on this load")
  const onLoad = await page.evaluate((cents) => {
    const section = [...document.querySelectorAll("section")].find((s) =>
      s.textContent.includes("Fuel on this load")
    )
    return {
      hasCents: section?.textContent.includes(cents) ?? false,
      hasNet: section?.textContent.includes("Revenue after fuel") ?? false,
    }
  }, receipt.cents)
  check(onLoad.hasCents, `load shows the receipt's exact cents (${receipt.cents})`)
  check(onLoad.hasNet, "load shows revenue-after-fuel economics")
  await shot(page, "03-load-fuel-panel")

  console.log("4. Unassigned count dropped by exactly one")
  await page.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  await waitForText(page, "Fuel spend")
  const countAfter = await unassignedCount(page)
  check(
    countAfter === countBefore - 1,
    `unassigned count ${countBefore} -> ${countAfter} (expected ${countBefore - 1})`
  )

  console.log("5. Reclassify a road transaction as reefer; survives reload")
  const reeferBefore = await badgeCount(page, "Reefer")
  const roadBefore = await badgeCount(page, "Road")
  check(roadBefore > 0, `road badges present to reclassify (${roadBefore})`)
  await clickByText(page, "Road")
  await clickByText(page, "Reefer fuel")
  await waitForText(page, "Marked as reefer")
  await page.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  await waitForText(page, "Fuel spend")
  const reeferAfter = await badgeCount(page, "Reefer")
  check(
    reeferAfter === reeferBefore + 1,
    `reefer badge count ${reeferBefore} -> ${reeferAfter} after reload (expected +1)`
  )
  await shot(page, "04-fuel-reclassified")

  console.log("6. Driver cannot reach /hub/fuel")
  // Fresh cookie jar — the default context is still logged in as owner.
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  const inboxGone = await textGone(page2, "Unassigned fuel")
  check(inboxGone, "driver never sees the unassigned-fuel inbox")
  const driverBlocked = await page2.evaluate(() => ({ url: location.pathname }))
  check(driverBlocked.url !== "/hub/fuel", `driver redirected away (landed on ${driverBlocked.url})`)
  await shot(page2, "05-fuel-driver-blocked")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nFuel smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nFuel smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
