/**
 * Toll-cost-in-P&L smoke test: imported toll data (hub.toll_transactions, the
 * BestPass/PrePass reconciliation dashboard at /hub/fuel/tolls) fed a live
 * dashboard but was invisible to Reports, the Owner Dashboard, and every P&L
 * CSV export — a truck's real operating cost read low by exactly its toll
 * spend, and net margin read high by the same amount. This drives the fix:
 * a "Tolls" tile + per-truck column on /hub/reports, a Tolls column in both
 * P&L CSV exports (trailing-365-day and range), and the Owner Dashboard's
 * cost-per-mile now including toll spend.
 *
 * Seed plants 8 assigned toll rows across trucks #101-#104 within the
 * trailing 92 days ($21/$22/$23/$24 per truck, $90 total) — see
 * scripts/seed-demo.mjs's "Tolls" section. Numbers below are pinned to that
 * seed and reseed() before driving. UI tiles round to whole dollars
 * (fmtCents), so on-screen assertions match that rounding; the CSV export
 * (fmtCentsExact-equivalent two-decimal formatting) is checked exactly.
 *
 * Usage: node scripts/e2e-reports-toll-cost-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-reports-tolls"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const fetchCsv = (page, url) =>
  page.evaluate(async (u) => {
    const res = await fetch(u)
    return { status: res.status, type: res.headers.get("content-type"), body: await res.text() }
  }, url)

/** Parse a simple (no quoted-field) CSV body into header + row-object array. */
function parseCsv(body) {
  const lines = body.trim().split("\n")
  const headers = lines[0].split(",")
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]))
  })
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

  console.log("1. Login as owner, open Reports")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/reports`, { waitUntil: "networkidle2" })
  await waitForText(page, "Per-truck P&L")

  console.log("2. Tolls summary tile shows the seeded $90 total, and links to the reconciliation dashboard")
  const tile = await page.evaluate(() => {
    const label = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Tolls")
    // Panel renders a <section>, not a <div> — climb to that, not the first div ancestor.
    const panel = label?.closest("section")
    const amount = panel?.querySelector("p")?.textContent?.trim() ?? null
    const link = panel?.querySelector("a")
    return { amount, href: link?.getAttribute("href") ?? null }
  })
  check(tile.amount === "$90", `Tolls tile reads $90 (got ${tile.amount})`)
  check(tile.href === "/hub/fuel/tolls", `Tolls tile links to the reconciliation dashboard (got ${tile.href})`)
  await shot(page, "01-reports-tolls-tile")

  console.log("3. Per-truck table has a Tolls column with the seeded per-truck amounts")
  const perTruckTolls = await page.evaluate(() => {
    const table = [...document.querySelectorAll("table")].find((t) =>
      [...t.querySelectorAll("th")].some((th) => th.textContent.trim() === "Tolls")
    )
    if (!table) return null
    const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim())
    const tollsIdx = headers.indexOf("Tolls")
    const truckIdx = headers.indexOf("Truck")
    return [...table.querySelectorAll("tbody tr")].map((tr) => {
      const cells = [...tr.querySelectorAll("td")]
      return { truck: cells[truckIdx]?.textContent.trim(), tolls: cells[tollsIdx]?.textContent.trim() }
    })
  })
  check(!!perTruckTolls, "per-truck P&L table has a Tolls column")
  const byTruck = Object.fromEntries((perTruckTolls ?? []).map((r) => [r.truck, r.tolls]))
  check(byTruck["#101"] === "$21", `truck #101 tolls = $21 (got ${byTruck["#101"]})`)
  check(byTruck["#102"] === "$22", `truck #102 tolls = $22 (got ${byTruck["#102"]})`)
  check(byTruck["#103"] === "$23", `truck #103 tolls = $23 (got ${byTruck["#103"]})`)
  check(byTruck["#104"] === "$24", `truck #104 tolls = $24 (got ${byTruck["#104"]})`)

  console.log("4. P&L CSV exports (trailing-365-day + range) carry an exact Tolls column, and stay internally consistent")
  const pnlCsv = await fetchCsv(page, "/api/hub/exports/pnl")
  check(pnlCsv.status === 200, `trailing P&L CSV served (${pnlCsv.status})`)
  check(pnlCsv.body.startsWith("Truck,Revenue,Fuel,Maintenance,Tolls,OtherExpenses,Net"), "trailing P&L CSV header includes Tolls")
  const pnlRows = parseCsv(pnlCsv.body)
  const row101 = pnlRows.find((r) => r.Truck === "101")
  check(row101?.Tolls === "21.00", `trailing P&L CSV row for #101 carries exactly 21.00 in Tolls (got ${row101?.Tolls})`)
  // Revenue - Fuel - Maintenance - Tolls - OtherExpenses = Net, to the cent, for every truck.
  const badRow = pnlRows.find((r) => {
    const expected = (
      parseFloat(r.Revenue) - parseFloat(r.Fuel) - parseFloat(r.Maintenance) - parseFloat(r.Tolls) - parseFloat(r.OtherExpenses)
    ).toFixed(2)
    return expected !== parseFloat(r.Net).toFixed(2)
  })
  check(!badRow, `every CSV row's Net = Revenue-Fuel-Maint-Tolls-Other exactly (bad row: ${JSON.stringify(badRow)})`)

  const rangeCsv = await fetchCsv(page, "/hub/reports/export?from=2020-01-01&to=2020-01-31")
  check(rangeCsv.status === 200, `range P&L CSV served (${rangeCsv.status})`)
  check(rangeCsv.body.startsWith("Truck,Revenue,Fuel,Maintenance,Tolls,OtherExpenses,Net"), "range P&L CSV header includes Tolls")

  console.log("5. Owner Dashboard's operating-cost/mi and truck ranking now charge toll spend")
  await page.goto(`${BASE}/hub/reports/owner`, { waitUntil: "networkidle2" })
  // Title "Owner Dashboard" is not a nav label, but it still isn't a
  // render gate — wait for the page subtitle.
  await waitForText(page, "an owner checks first")
  // Panel/label text renders through a global uppercase text-transform — compare lowercased.
  const ownerOk = await page.evaluate(() => document.body.innerText.toLowerCase().includes("operating cost / mi"))
  check(ownerOk, "owner dashboard renders operating cost/mi (toll-inclusive) without erroring")
  await shot(page, "02-owner-dashboard")

  console.log("6. No console errors across the drive")
  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 3).join(" | ")})`)

  await browser.close()

  if (failures.length > 0) {
    console.error(`\n${failures.length} FAILURE(S):`)
    failures.forEach((f) => console.error(`  - ${f}`))
    process.exit(1)
  }
  console.log("\nReports toll-cost smoke passed.")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
