/**
 * Two-tenant isolation smoke — proves zero data bleed between the seeded
 * carriers (Thind Transport and Cascade Demo Lines, scripts/seed-demo.mjs
 * Phase 7). Three angles:
 *
 *   1. List screens: each owner sees only their tenant's references
 *      (THD- vs CAS-) on dispatch, loads, fleet, and money.
 *   2. Direct-URL probes: a Cascade owner requesting a Thind load, invoice,
 *      and truck detail by id must get the not-found page, never the record
 *      (carrier-scoped queries → notFound(), e.g. getLoad in
 *      src/lib/hub/loads.ts).
 *   3. Driver PWA: the Cascade driver's phone view never references a
 *      Thind load or invoice.
 *
 * Token discipline: Thind seeds a customer literally named "Cascade Produce
 * Co.", so asserting on the bare word "Cascade" would false-positive —
 * assertions use exact refs (CAS-5001, "Cascade Demo Lines", THD-) only.
 *
 * Usage: node scripts/e2e-tenant-isolation-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-tenant-isolation"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function bodyText(page) {
  return page.evaluate(() => document.body?.innerText ?? "")
}

/**
 * First anchor href of the form `${prefix}<uuid>` — the UUID requirement
 * skips static siblings like /hub/loads/paste and /hub/fleet/trucks/new.
 */
async function firstHref(page, prefix) {
  return page.evaluate((p) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return (
      [...document.querySelectorAll("a")]
        .map((a) => a.getAttribute("href"))
        .find((h) => h?.startsWith(p) && uuid.test(h.slice(p.length))) ?? null
    )
  }, prefix)
}

async function main() {
  reseed()
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })

  // ---- 1. Thind owner: collect real detail URLs + confirm no Cascade refs ----
  console.log("1. Thind owner — list screens show THD- only; collect probe URLs")
  const thind = await browser.newPage()
  await thind.setViewport({ width: 1440, height: 950 })
  const consoleErrors = []
  thind.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(thind, "owner@demo.thind")

  await thind.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(thind, "THD-")
  const thindLoadsWall = await bodyText(thind)
  check(!thindLoadsWall.includes("CAS-5"), "Thind loads list has no CAS- reference")
  const loadUrl = await firstHref(thind, "/hub/loads/")
  check(Boolean(loadUrl), `got a Thind load detail URL (${loadUrl})`)

  await thind.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(thind, "receivables, invoices, and driver pay")
  const invoiceUrl = await firstHref(thind, "/hub/money/invoices/")
  check(Boolean(invoiceUrl), `got a Thind invoice detail URL (${invoiceUrl})`)
  check(!(await bodyText(thind)).includes("CAS-INV"), "Thind money screen has no CAS-INV reference")

  await thind.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await sleep(600)
  const thindFleetWall = await bodyText(thind)
  check(!/\bC-0[12]\b/.test(thindFleetWall), "Thind fleet has no Cascade unit (C-01/C-02)")
  const truckUrl = await firstHref(thind, "/hub/fleet/trucks/")
  check(Boolean(truckUrl), `got a Thind truck detail URL (${truckUrl})`)

  // The Thind load reference the Cascade owner must never see, e.g. "THD-1001"
  await thind.goto(`${BASE}${loadUrl}`, { waitUntil: "networkidle2" })
  await waitForText(thind, "THD-")
  const thindLoadRef = (await bodyText(thind)).match(/THD-\d+/)?.[0]
  check(Boolean(thindLoadRef), `Thind load detail renders its reference (${thindLoadRef})`)
  await shot(thind, "01-thind-load-detail")

  // ---- 2. Cascade owner: own data present, Thind refs absent ----
  console.log("2. Cascade owner — sees CAS- data, zero THD- references")
  const cascadeCtx = await browser.createBrowserContext()
  const cascade = await cascadeCtx.newPage()
  await cascade.setViewport({ width: 1440, height: 950 })
  cascade.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(cascade, "owner@cascademo.example")

  await cascade.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(cascade, "every active load, booking to pod")
  const cascadeDispatchWall = await bodyText(cascade)
  check(cascadeDispatchWall.includes("CAS-5001"), "Cascade dispatch shows its in-transit load CAS-5001")
  check(!cascadeDispatchWall.includes("THD-"), "Cascade dispatch has no THD- reference")
  await shot(cascade, "02-cascade-dispatch")

  await cascade.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await sleep(600)
  const cascadeFleetWall = await bodyText(cascade)
  check(cascadeFleetWall.includes("C-01") && cascadeFleetWall.includes("C-02"), "Cascade fleet shows C-01 and C-02")
  check(!/\b10[1-7]\b|\b20[1-3]\b/.test(cascadeFleetWall), "Cascade fleet has no Thind unit numbers (101–107/201–203)")

  await cascade.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(cascade, "receivables, invoices, and driver pay")
  const cascadeMoneyWall = await bodyText(cascade)
  check(!cascadeMoneyWall.includes("THD-"), "Cascade money screen has no THD- reference")
  await shot(cascade, "03-cascade-money")

  // ---- 3. Direct-URL probes: Thind records by id must not render ----
  console.log("3. Cascade owner probes Thind detail URLs by id — must all be not-found")
  for (const [label, url, leak] of [
    ["load", loadUrl, thindLoadRef],
    ["invoice", invoiceUrl, "THD-INV"],
    ["truck", truckUrl, "Freightliner"],
  ]) {
    if (!url) continue
    await cascade.goto(`${BASE}${url}`, { waitUntil: "networkidle2" })
    await sleep(600)
    const wall = await bodyText(cascade)
    const leaked = leak ? wall.includes(leak) : false
    const notFound = wall.toLowerCase().includes("road not found") || wall.toLowerCase().includes("could not be found")
    check(!leaked, `cross-tenant ${label} probe leaks nothing (no "${leak}")`)
    check(notFound, `cross-tenant ${label} probe lands on the not-found page`)
  }
  await shot(cascade, "04-cascade-cross-tenant-probe")

  // ---- 4. Cascade driver PWA at phone width ----
  console.log("4. Cascade driver @390px — own load only, no THD- anywhere")
  const driverCtx = await browser.createBrowserContext()
  const driver = await driverCtx.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  driver.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(driver, "driver@cascademo.example")
  await driver.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await waitForText(driver, "my cards")
  const driverHomeWall = await bodyText(driver)
  check(driverHomeWall.length > 40, "Cascade driver home renders real content")
  check(!driverHomeWall.includes("THD-"), "Cascade driver home has no THD- reference")
  await shot(driver, "05-cascade-driver-home")

  await driver.goto(`${BASE}/hub/driver/pay`, { waitUntil: "networkidle2" })
  await waitForText(driver, "line by line")
  check(!(await bodyText(driver)).includes("THD-"), "Cascade driver pay has no THD- reference")
  await shot(driver, "06-cascade-driver-pay")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nTenant-isolation smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nTenant-isolation smoke passed.")
}

main().catch((err) => {
  console.error("\nTENANT-ISOLATION SMOKE FAILED:", err.message)
  process.exit(1)
})
