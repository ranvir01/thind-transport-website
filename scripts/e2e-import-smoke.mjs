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
import { BASE, failures, check, waitForText, waitForPath, login, makeShot, reseed, launchBrowser } from "./e2e-lib.mjs"

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
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Login as dispatcher, open Import > Trucks")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/import?kind=trucks`, { waitUntil: "networkidle2" })
  await waitForText(page, "map columns once, reuse forever")
  await shot(page, "01-import-trucks-empty")

  console.log("2. Upload CSV, confirm auto-mapping")
  const fileInput = await page.$('input[type="file"]')
  await fileInput.uploadFile(fixturePath)
  await waitForText(page, "1 data rows")
  const unitMapped = await page.$eval("#map-unit_number", (el) => el.value !== "")
  check(unitMapped, "unit_number column auto-mapped from 'Unit #' header")
  await shot(page, "02-import-trucks-mapped")

  console.log("3. Run the import")
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Import 1 rows"))
    btn?.click()
  })
  await waitForText(page, "Import finished")
  const resultText = await page.evaluate(() => document.body.innerText)
  check(resultText.includes("1 imported"), "result panel reports 1 imported")
  check(!resultText.includes("1 failed"), "no rows failed")
  await shot(page, "03-import-trucks-result")

  console.log("4. Verify the truck landed on Fleet")
  await page.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(page, IMPORTED_UNIT)
  await shot(page, "04-fleet-shows-imported-truck")

  console.log("5. Cross-tenant isolation: Cascade Demo Lines never sees Thind's imported truck")
  const otherCtx = await browser.createBrowserContext()
  const otherPage = await otherCtx.newPage()
  await otherPage.setViewport({ width: 1440, height: 900 })
  await login(otherPage, "owner@cascademo.example")
  await otherPage.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
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
  const driverBlocked = await driverPage.evaluate(() => ({
    url: window.location.pathname,
    seesImport: document.body.innerText.includes("Upload"),
  }))
  check(driverBlocked.url !== "/hub/import", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesImport, "driver never sees the import screen")
  await shot(driverPage, "06-import-driver-blocked")
  await driverCtx.close()

  check(consoleErrors.length === 0, `no console errors (${consoleErrors.length} found)`)
  if (consoleErrors.length > 0) console.log(consoleErrors.slice(0, 5))

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
