/**
 * Toll reconciliation smoke test: the CSV-imported toll data (hub.toll_transactions,
 * BestPass/PrePass statements) was invisible everywhere before this — no
 * dashboard, no unmatched-truck review, revalidatePath("/hub/fuel") pointed at
 * a page with zero mention of tolls. This drives the new /hub/fuel/tolls
 * screen: headline stats render, an unmatched toll gets assigned to a truck,
 * the unmatched count drops by exactly one, the assignment survives a
 * reload, and a driver is bounced off the screen.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the seed plants two
 * unmatched tolls (truck_id = NULL); each run consumes one, so without a
 * reseed the inbox drains run over run.
 *
 * Usage: node scripts/e2e-tolls-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, textGone, login, makeShot, clickByText, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-tolls"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// "Unassigned tolls · 2" -> 2
const unassignedCount = (page) =>
  page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned tolls")
    )
    const m = h2?.textContent.match(/·\s*(\d+)/)
    return m ? Number(m[1]) : null
  })

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as owner, open the fuel screen, follow the new Tolls link")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  await waitForText(page, "Last 92 days across every card program.")
  await clickByText(page, "Tolls", { tag: "a" })
  await waitForText(page, "Toll spend")
  await shot(page, "01-tolls-dashboard")

  const stats = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase()
    return {
      hasPerTruck: text.includes("per truck"),
      hasRecent: text.includes("recent transactions"),
    }
  })
  check(stats.hasPerTruck, "per-truck toll table renders")
  check(stats.hasRecent, "recent toll transactions list renders")

  const countBefore = await unassignedCount(page)
  check(countBefore !== null && countBefore > 0, `unassigned toll inbox has rows (${countBefore})`)

  console.log("2. Assign the top unassigned toll to a truck")
  const toll = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned tolls")
    )
    const row = h2?.closest("div.mb-4")?.querySelector("div.divide-y > div")
    const select = row?.querySelector("select")
    const option = select?.querySelector('option:not([value=""])')
    const cents = row?.querySelector("span.font-mono")?.textContent?.trim() ?? null
    return option
      ? { truckId: option.value, truckLabel: option.textContent.trim(), cents }
      : null
  })
  check(!!toll, "top unassigned toll has an assignable truck option")
  check(/\$[\d,]+\.\d{2}$/.test(toll?.cents ?? ""), `toll shows exact cents (${toll?.cents})`)
  await page.evaluate((truckId) => {
    const h2 = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Unassigned tolls")
    )
    const select = h2?.closest("div.mb-4")?.querySelector("div.divide-y > div select")
    select.value = truckId
    select.dispatchEvent(new Event("change", { bubbles: true }))
  }, toll.truckId)
  await clickByText(page, "Assign")
  await waitForText(page, "Assigned to")
  await shot(page, "02-tolls-assigned")

  console.log("3. Unassigned count dropped by exactly one, survives a reload")
  await page.goto(`${BASE}/hub/fuel/tolls`, { waitUntil: "networkidle2" })
  await waitForText(page, "Toll spend")
  const countAfter = await unassignedCount(page)
  check(
    countAfter === countBefore - 1,
    `unassigned toll count ${countBefore} -> ${countAfter} (expected ${countBefore - 1})`
  )
  const perTruckHasAssignee = await page.evaluate(
    (label) => document.body.innerText.includes(label),
    toll.truckLabel
  )
  check(perTruckHasAssignee, `per-truck table now lists ${toll.truckLabel}`)
  await shot(page, "03-tolls-after-reload")

  console.log("4. Driver cannot reach /hub/fuel/tolls")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/fuel/tolls`, { waitUntil: "networkidle2" })
  const inboxGone = await textGone(page2, "Unassigned tolls")
  check(inboxGone, "driver never sees the unassigned-tolls inbox")
  const driverBlocked = await page2.evaluate(() => ({ url: location.pathname }))
  check(driverBlocked.url !== "/hub/fuel/tolls", `driver redirected away (landed on ${driverBlocked.url})`)
  await shot(page2, "04-tolls-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nTolls smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nTolls smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
