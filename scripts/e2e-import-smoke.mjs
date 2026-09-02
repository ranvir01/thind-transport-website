/**
 * Import wizard smoke test — the universal CSV import engine
 * (src/app/hub/_actions/import.ts) had no dedicated E2E coverage despite
 * being the only bulk-write surface that touches 8 tables in one action.
 * Drives the trucks import end to end: dispatcher uploads a CSV, the column
 * mapper auto-guesses from headers, the import lands and the truck appears
 * on the Fleet screen; a second tenant confirms the imported row is
 * carrier-scoped (never visible cross-tenant); a driver never reaches
 * /hub/import at all (no office permissions).
 *
 * Reseeds demo data first.
 *
 * Usage: node scripts/e2e-import-smoke.mjs [outputDir]
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import { ANCHORS, BASE, failures, check, waitForText, waitForPath, login, makeShot, reseed, launchBrowser, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-import"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const IMPORTED_UNIT = "IMP-501"

async function main() {
  reseed()

  const fixtureDir = mkdtempSync(path.join(os.tmpdir(), "import-smoke-"))
  const fixturePath = path.join(fixtureDir, "trucks.csv")
  writeFileSync(
    fixturePath,
    ["Unit #,Year,Make,Model", `${IMPORTED_UNIT},2024,Peterbilt,579`].join("\n")
  )

  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as dispatcher, open Import > Trucks")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/import?kind=trucks`, { waitUntil: "networkidle2" })
  await waitForText(page, "map columns once, reuse forever")
  await shot(page, "01-import-trucks-empty")

  console.log("2. Upload CSV, confirm auto-mapping")
  const fileInput = await page.$('input[type="file"]')
  await fileInput.uploadFile(fixturePath)
  // The mapping step gained pluralization, so a single-row fixture renders
  // "1 data row" — the old assertion hard-coded the plural "1 data rows".
  // Match the stem so either form passes.
  await waitForText(page, "1 data row")
  const unitMapped = await page.$eval("#map-unit_number", (el) => el.value !== "")
  check(unitMapped, "unit_number column auto-mapped from 'Unit #' header")
  await shot(page, "02-import-trucks-mapped")

  console.log("3. Review, then run the import")
  // The wizard gained a client-side review step between mapping and import:
  // "Review rows" → "Import N row(s)". The old smoke clicked a hard-coded
  // "Import 1 rows" that now neither exists on this step nor matches the
  // pluralization.
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")]
      .find((b) => b.textContent?.includes("Review rows"))
      ?.click()
  })
  await waitForText(page, "1 row ready")
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")]
      .find((b) => /^Import \d+ rows?$/.test(b.textContent?.trim() ?? ""))
      ?.click()
  })
  await waitForText(page, "row imported")
  const resultText = await page.evaluate(() => document.body.innerText)
  // "1 <entity label> row imported" — the entity label carries its own
  // pluralization, so pin the count and the verb, not the noun in between.
  check(/\b1 \w+ rows? imported/.test(resultText), "result panel reports 1 imported")
  check(!resultText.includes("1 failed"), "no rows failed")
  await shot(page, "03-import-trucks-result")

  console.log("4. Verify the truck landed on Fleet")
  await page.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(page, ANCHORS.fleet)
  await waitForText(page, IMPORTED_UNIT)
  await shot(page, "04-fleet-shows-imported-truck")

  console.log("5. Cross-tenant isolation: Cascade Demo Lines never sees Thind's imported truck")
  const otherCtx = await browser.createBrowserContext()
  const otherPage = await otherCtx.newPage()
  await otherPage.setViewport({ width: 1440, height: 900 })
  await login(otherPage, "owner@cascademo.example")
  await otherPage.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(otherPage, ANCHORS.fleet)
  const otherFleetText = await otherPage.evaluate(() => document.body.innerText)
  check(!otherFleetText.includes(IMPORTED_UNIT), "other tenant's Fleet screen never shows the imported unit")
  await shot(otherPage, "05-other-tenant-fleet")
  await otherCtx.close()

  console.log("6. A driver never reaches Import at all")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/import`, { waitUntil: "networkidle2" })
  await waitForPath(driverPage, "/hub/driver")
  // Pathname flips before the PWA streams in — "Last pay" is home-body copy,
  // not chrome.
  await waitForText(driverPage, "Last pay")
  const driverBlocked = await driverPage.evaluate(() => ({
    url: window.location.pathname,
    seesImport: document.body.innerText.includes("Upload"),
  }))
  check(driverBlocked.url !== "/hub/import", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesImport, "driver never sees the import screen")
  await shot(driverPage, "06-import-driver-blocked")
  await driverCtx.close()

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length} found)`)
  if (realErrors.length > 0) console.log(realErrors.slice(0, 5))

  await browser.close()

  console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failure(s)`)
  if (failures.length > 0) {
    for (const f of failures) console.log(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
