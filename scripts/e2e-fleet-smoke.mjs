/**
 * Fleet workflow smoke test — add-truck is the most daily of the office
 * screens that had no dedicated smoke: dispatcher opens Fleet, adds a truck
 * and a trailer, both land on their tab with the count bumped, the truck
 * detail prefills the edit form, trailer detail prefills its edit form with the
 * Documents panel, a duplicate unit number is rejected with the
 * friendly error, an accountant (fleet:read but not fleet:write) is refused
 * by the server action, and a driver never reaches Fleet at all.
 *
 * Reseeds demo data first — each run adds a truck + trailer, so without a
 * reseed the tab counts drift run over run.
 *
 * VIN decode is NOT exercised: it calls the external NHTSA API, which a local
 * rig can't promise. The form is filled by hand instead.
 *
 * Usage: node scripts/e2e-fleet-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, login, makeShot, clickByText, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-fleet"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Seed pins 10 trucks and 8 trailers (scripts/seed-demo.mjs truckSeed/trailerSeed).
const SEED_TRUCKS = 10
const SEED_TRAILERS = 8
const TRUCK_UNIT = "SMK-901"
const TRAILER_UNIT = "SMK-T71"

/**
 * Fill a React-controlled <input type="date"> — page.type() feeds digits into
 * locale-ordered segments and mangles ISO strings, so set the value natively
 * and fire the input event React listens for.
 */
async function setDate(page, selector, iso) {
  await page.$eval(
    selector,
    (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
      setter.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    },
    iso
  )
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as dispatcher, open Fleet")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(page, "Trucks, trailers, and their paperwork.")
  await waitForText(page, `Trucks (${SEED_TRUCKS})`)
  const fleet = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      hasTrailerTab: /Trailers \(\d+\)/.test(text),
      hasSeedTruck: text.includes("#101"),
    }
  })
  check(fleet.hasTrailerTab, "trailers tab renders with a count")
  check(fleet.hasSeedTruck, "seeded truck #101 is on the trucks tab")
  await shot(page, "01-fleet-trucks")

  console.log("2. Add a truck")
  await page.goto(`${BASE}/hub/fleet/trucks/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Paste the VIN and decode to fill the specs.")
  await page.type("#unit_number", TRUCK_UNIT)
  await page.type("#vin", "1XKAD49X1SJ430911")
  await page.type("#year", "2025")
  await page.type("#make", "Kenworth")
  await page.type("#model", "T680E")
  await page.type("#plate", "D4471K")
  await page.type("#plate_state", "WA")
  await setDate(page, "#registration_expiry", "2027-03-31")
  await setDate(page, "#inspection_due", "2026-12-15")
  await page.type("#tank_capacity", "240")
  const driverOptions = await page.evaluate(() => document.querySelectorAll("#assigned_driver option").length)
  check(driverOptions > 1, `assigned-driver dropdown lists active drivers (${driverOptions - 1})`)
  await shot(page, "02-add-truck-filled")
  await clickByText(page, "Add truck")
  await waitForText(page, "Truck added")
  await page.waitForFunction(() => location.pathname === "/hub/fleet", { timeout: 15000 })
  await waitForText(page, `Trucks (${SEED_TRUCKS + 1})`)
  const afterTruck = await page.evaluate((unit) => document.body.innerText.includes(`#${unit}`), TRUCK_UNIT)
  check(afterTruck, `new truck #${TRUCK_UNIT} shows on the trucks tab (count ${SEED_TRUCKS + 1})`)
  await shot(page, "03-fleet-after-add")

  console.log("3. Truck detail prefills the edit form")
  await clickByText(page, `#${TRUCK_UNIT}`, { tag: "a" })
  await page.waitForFunction(
    () => /\/hub\/fleet\/trucks\/[0-9a-f-]{36}$/.test(location.pathname),
    { timeout: 15000 }
  )
  await waitForText(page, `Truck #${TRUCK_UNIT}`)
  const detail = await page.evaluate(() => ({
    unit: document.querySelector("#unit_number")?.value,
    make: document.querySelector("#make")?.value,
    model: document.querySelector("#model")?.value,
    tank: document.querySelector("#tank_capacity")?.value,
    subtitle: document.body.innerText.includes("2025 Kenworth T680E"),
    hasDvirPanel: /DVIR/i.test(document.body.innerText),
    hasDocsPanel: /Documents/i.test(document.body.innerText),
  }))
  check(detail.unit === TRUCK_UNIT, `edit form prefills unit number (${detail.unit})`)
  check(detail.make === "Kenworth" && detail.model === "T680E", "edit form prefills make/model")
  check(detail.tank === "240", `edit form prefills tank capacity (${detail.tank} gal)`)
  check(detail.subtitle, "header subtitle shows year make model")
  check(detail.hasDvirPanel && detail.hasDocsPanel, "DVIR and Documents panels render on the detail")
  await shot(page, "04-truck-detail")

  console.log("4. Add a trailer")
  await page.goto(`${BASE}/hub/fleet/trailers/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Unit number and type first — then plate and inspection dates.")
  await page.type("#t_unit", TRAILER_UNIT)
  await page.select("#t_type", "reefer")
  await page.type("#t_year", "2024")
  await page.type("#t_make", "Utility")
  await clickByText(page, "Add trailer")
  await waitForText(page, "Trailer added")
  await page.waitForFunction(
    () => location.pathname === "/hub/fleet" && location.search.includes("tab=trailers"),
    { timeout: 15000 }
  )
  await waitForText(page, `Trailers (${SEED_TRAILERS + 1})`)
  const afterTrailer = await page.evaluate((unit) => {
    const text = document.body.innerText
    return { hasUnit: text.includes(`#${unit}`), hasSpecs: text.includes("2024 Utility") }
  }, TRAILER_UNIT)
  check(afterTrailer.hasUnit, `new trailer #${TRAILER_UNIT} shows on the trailers tab (count ${SEED_TRAILERS + 1})`)
  check(afterTrailer.hasSpecs, "trailer card shows the reefer specs (2024 Utility)")
  await shot(page, "05-fleet-trailers")

  console.log("4b. Trailer detail prefills the edit form")
  await clickByText(page, `#${TRAILER_UNIT}`, { tag: "a" })
  await page.waitForFunction(
    () => /\/hub\/fleet\/trailers\/[0-9a-f-]{36}$/.test(location.pathname),
    { timeout: 15000 }
  )
  await waitForText(page, `Trailer #${TRAILER_UNIT}`)
  const trailerDetail = await page.evaluate(() => ({
    unit: document.querySelector("#t_unit")?.value,
    type: document.querySelector("#t_type")?.value,
    make: document.querySelector("#t_make")?.value,
    year: document.querySelector("#t_year")?.value,
    hasDocsPanel: /Documents/i.test(document.body.innerText),
  }))
  check(trailerDetail.unit === TRAILER_UNIT, `trailer edit form prefills unit number (${trailerDetail.unit})`)
  check(trailerDetail.type === "reefer", `trailer edit form prefills type (${trailerDetail.type})`)
  check(trailerDetail.make === "Utility" && trailerDetail.year === "2024", "trailer edit form prefills make/year")
  check(trailerDetail.hasDocsPanel, "Documents panel renders on the trailer detail")
  await shot(page, "05b-trailer-detail")

  console.log("5. Duplicate unit number is rejected")
  await page.goto(`${BASE}/hub/fleet/trucks/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Paste the VIN and decode to fill the specs.")
  await page.type("#unit_number", "101") // seeded unit
  await clickByText(page, "Add truck")
  await waitForText(page, "Unit number already exists")
  check(true, "duplicate unit number surfaces the friendly error")
  const stayedPut = await page.evaluate(() => location.pathname === "/hub/fleet/trucks/new")
  check(stayedPut, "rejected save stays on the form")
  await shot(page, "06-duplicate-unit-rejected")

  console.log("6. Accountant can view fleet but the write action refuses")
  // Fresh cookie jar — the default context is still logged in as dispatcher.
  const acctCtx = await browser.createBrowserContext()
  const acctPage = await acctCtx.newPage()
  await acctPage.setViewport({ width: 1440, height: 900 })
  await login(acctPage, "accounting@demo.thind")
  await acctPage.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(acctPage, "Trucks, trailers, and their paperwork.")
  await waitForText(acctPage, `Trucks (${SEED_TRUCKS + 1})`)
  check(true, "accountant sees the fleet list (fleet:read)")
  await acctPage.goto(`${BASE}/hub/fleet/trucks/new`, { waitUntil: "networkidle2" })
  await waitForText(acctPage, "Paste the VIN and decode to fill the specs.")
  await acctPage.type("#unit_number", "SMK-999")
  await clickByText(acctPage, "Add truck")
  await waitForText(acctPage, "cannot fleet:write")
  check(true, "server action refuses accountant (Forbidden: accountant cannot fleet:write)")
  await shot(acctPage, "07-accountant-refused")
  await acctPage.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(acctPage, "Trucks, trailers, and their paperwork.")
  await waitForText(acctPage, `Trucks (${SEED_TRUCKS + 1})`)
  const noPhantom = await acctPage.evaluate(() => !document.body.innerText.includes("SMK-999"))
  check(noPhantom, `refused save wrote nothing (still ${SEED_TRUCKS + 1} trucks, no SMK-999)`)

  console.log("7. Driver cannot reach Fleet")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  // Driver never sees the office subtitle — bounce on leaving /hub/fleet,
  // then wait for PWA home copy. Pathname flips before the body streams in.
  await driverPage.waitForFunction(() => !location.pathname.startsWith("/hub/fleet"), {
    timeout: 20000,
  })
  await waitForText(driverPage, "Last pay")
  const driverBlocked = await driverPage.evaluate(() => ({
    url: location.pathname,
    seesFleet: document.body.innerText.includes("Trucks, trailers, and their paperwork"),
  }))
  check(driverBlocked.url !== "/hub/fleet", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesFleet, "driver never sees the fleet screen")
  await shot(driverPage, "08-fleet-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nFleet smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nFleet smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
