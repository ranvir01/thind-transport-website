/**
 * Compliance docs workflow smoke test: the wall renders red/amber/green
 * summary tiles from seeded credential expiries; a manual company item can be
 * added and resolved; a driver document uploads through DocumentsPanel;
 * expired rows (Amrit Bains med card, Truck #107 registration) show expiry
 * pills; a mileage-only PM schedule (Truck #102's Tire rotation, no
 * interval_days) correctly shows red/overdue-by-miles on both the wall and
 * the truck detail page instead of sitting stuck amber forever; the driver
 * app login cannot reach the office compliance wall.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run resolves the
 * seeded "Drug & alcohol consortium" item and asserts the red tile drops by
 * one, so a prior run leaves nothing to resolve.
 *
 * Usage: node scripts/e2e-compliance-smoke.mjs [outputDir]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { launchBrowser, BASE, failures, check, waitForText, textAppears, textGone, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-compliance"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const readSummary = (page) =>
  page.evaluate(() => {
    const panels = [...document.querySelectorAll("section.rounded-card")]
    const nums = panels
      .slice(0, 3)
      // The tile's only <p> is its count. Anchored on structure, not on a
      // font class: the restyle dropped `font-display` and this read null for
      // all three tiles, failing four checks with no hint of why.
      .map((p) => Number(p.querySelector("p")?.textContent?.trim() ?? "NaN"))
    return { red: nums[0], amber: nums[1], green: nums[2] }
  })

const rowDotColor = (page, kindText) =>
  page.evaluate((kind) => {
    const rows = [...document.querySelectorAll("div.flex.items-center.gap-3.p-3")]
    const row = rows.find((r) => r.innerText.includes(kind))
    if (!row) return null
    const dot = row.querySelector("span.rounded-full")
    if (!dot) return null
    if (dot.className.includes("bg-bad")) return "red"
    if (dot.className.includes("bg-warn")) return "amber"
    if (dot.className.includes("bg-ok")) return "green"
    return "unknown"
  }, kindText)

const resolveManualItem = (page, kindText) =>
  page.evaluate((kind) => {
    const rows = [...document.querySelectorAll("div.flex.items-center.gap-3.p-3")]
    for (const row of rows) {
      if (row.innerText.includes(kind)) {
        const btn = row.querySelector('button[aria-label="Mark done"]')
        if (btn) {
          btn.click()
          return true
        }
      }
    }
    return false
  }, kindText)

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  const marker = `E2E compliance ${Date.now().toString(36)}`
  const tmpDir = path.join(OUT, "_tmp")
  mkdirSync(tmpDir, { recursive: true })
  const fixturePath = path.join(tmpDir, "e2e-compliance.pdf")
  writeFileSync(fixturePath, "%PDF-1.4\n% minimal fixture for compliance upload smoke\n")

  console.log("1. Owner opens the compliance wall")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/compliance`, { waitUntil: "networkidle2" })
  await waitForText(page, "CDLs, med cards")
  const before = await readSummary(page)
  check(Number.isFinite(before.red) && before.red > 0, `red summary > 0 (got ${before.red})`)
  check(Number.isFinite(before.amber) && before.amber > 0, `amber summary > 0 (got ${before.amber})`)
  check(Number.isFinite(before.green) && before.green > 0, `green summary > 0 (got ${before.green})`)
  const wall = await page.evaluate(() => document.body.innerText)
  check(wall.includes("Amrit Bains") && wall.includes("Medical card"), "wall lists Amrit Bains med card")
  check(wall.includes("expired"), "wall shows an expired pill")
  check(wall.includes("Truck #107") && wall.includes("Registration"), "wall lists Truck #107 registration")
  check(wall.includes("Drug & alcohol consortium"), "wall lists the overdue consortium item")
  // Truck 102's mileage-only "Tire rotation" schedule (20k mi interval, last
  // done at 100k, current ~130k from its seeded position-ping trail) has no
  // interval_days at all — before the odometer-aware due-status fix this sat
  // on the wall stuck amber forever with no signal of how overdue it was.
  check(wall.includes("Truck #102") && wall.includes("PM: Tire rotation"), "wall lists Truck #102's Tire rotation PM")
  check(wall.includes("mi overdue"), "wall shows a mileage-overdue pill")
  check((await rowDotColor(page, "Tire rotation")) === "red", "Tire rotation row is red, not stuck amber")
  // Auto-tracked IFTA filing entries come from complianceEntries() alone; the
  // page once merged iftaFilingComplianceEntries() a second time, so every
  // "IFTA filing <quarter>" row rendered twice and the summary double-counted.
  const iftaKinds = wall.match(/IFTA filing \d{4}Q\d/g) ?? []
  check(iftaKinds.length > 0, `wall auto-tracks the IFTA quarterly filing (${iftaKinds.length} row(s))`)
  check(
    new Set(iftaKinds).size === iftaKinds.length,
    `no duplicated IFTA filing rows (${iftaKinds.join(", ") || "none"})`
  )
  await shot(page, "01-compliance-wall")

  console.log("2. Track a new company item")
  const dueOn = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
  await page.type('input[aria-label="Item"]', marker)
  await page.type('input[aria-label="Due date"]', dueOn)
  await page.click('form button[type="submit"]')
  await waitForText(page, "Item tracked")
  check(await textAppears(page, marker), "new manual item appears on the wall")
  await shot(page, "02-item-added")

  console.log("3. Resolve the overdue consortium enrollment")
  check(await resolveManualItem(page, "Drug & alcohol consortium"), "clicked Mark done on consortium item")
  await waitForText(page, "Done")
  check(await textGone(page, "Drug & alcohol consortium"), "consortium item left the open wall")
  const afterResolve = await readSummary(page)
  check(afterResolve.red === before.red - 1, `red count dropped by 1 (${before.red} -> ${afterResolve.red})`)
  await shot(page, "03-consortium-resolved")

  console.log("4. Upload a driver document on Harpreet's file")
  await page.goto(`${BASE}/hub/drivers`, { waitUntil: "networkidle2" })
  await waitForText(page, "Roster, pay setup, and qualification files.")
  const driverHref = await page.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Harpreet"))?.getAttribute("href")
  )
  check(!!driverHref, `found Harpreet driver link (${driverHref})`)
  await page.goto(`${BASE}${driverHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Documents")
  const fileInput = await page.waitForSelector('input[aria-label="File"]')
  await fileInput.uploadFile(fixturePath)
  await page.evaluate(() => {
    const form = document.querySelector('input[aria-label="File"]')?.closest("form")
    form?.querySelector('button[type="submit"]')?.click()
  })
  await waitForText(page, "uploaded")
  check(await textAppears(page, "e2e-compliance.pdf"), "uploaded PDF appears in the documents list")
  await shot(page, "04-driver-doc-uploaded")

  console.log("5. Truck 102's detail page shows the same mileage-overdue PM")
  await page.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(page, "Trucks, trailers, and their paperwork.")
  const truckHref = await page.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.textContent.includes("#102"))?.getAttribute("href")
  )
  check(!!truckHref, `found Truck #102 link (${truckHref})`)
  await page.goto(`${BASE}${truckHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Maintenance")
  const truckPageText = await page.evaluate(() => document.body.innerText)
  check(truckPageText.includes("Tire rotation"), "truck page lists the Tire rotation schedule")
  check(truckPageText.includes("mi overdue"), "truck page shows the same mileage-overdue status")
  await shot(page, "05-truck-mileage-overdue")

  console.log("6. Driver login cannot reach the office compliance wall")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/compliance`, { waitUntil: "networkidle2" })
  const redirected = await page2
    .waitForFunction(() => !location.pathname.startsWith("/hub/compliance"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check(redirected, `driver redirected away from compliance (at ${page2.url()})`)
  await shot(page2, "06-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nCompliance smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nCompliance smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
