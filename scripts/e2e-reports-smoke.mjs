/**
 * Reports workflow smoke test — per-truck P&L, lane leaderboard, and owner
 * revenue dashboard were the last office money screens without a dedicated
 * smoke: owner opens Reports and sees fleet KPI cards plus seeded trucks in
 * the 92-day P&L table, P&L and lane CSV exports return real text/csv, the
 * owner dashboard renders weekly + monthly revenue bars, a dispatcher
 * (money:read) shares the same view, and a driver is bounced off /hub/reports.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-reports-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, waitForPath, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-reports"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const fetchCsv = (page, kind) =>
  page.evaluate(async (k) => {
    const res = await fetch(`/api/hub/exports/${k}`)
    return { status: res.status, type: res.headers.get("content-type"), body: await res.text() }
  }, kind)

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
  const reports = await page.evaluate(() => {
    // Panel/section labels render through a global uppercase text-transform
    // (brand h2/label style) — innerText reflects the CSS-rendered case, so
    // compare lowercased (same convention as e2e-sweep.mjs anchors).
    const text = document.body.innerText.toLowerCase()
    return {
      hasKpis: text.includes("operating cost / mi") && text.includes("revenue / loaded mi"),
      hasTotals: text.includes("net margin") && /revenue[\s\S]*\$/.test(text),
      truckUnits: [...document.querySelectorAll("td.font-bold")].map((td) => td.textContent.trim()),
      hasLaneSection: text.includes("lane leaderboard"),
    }
  })
  check(reports.hasKpis, "fleet KPI cards render")
  check(reports.hasTotals, "summary totals row renders with dollar amounts")
  check(reports.truckUnits.includes("#101"), `seeded truck #101 in P&L table (${reports.truckUnits.slice(0, 4).join(", ")})`)
  check(reports.truckUnits.includes("#102"), "seeded truck #102 in P&L table")
  check(reports.hasLaneSection, "lane leaderboard section renders")
  await shot(page, "01-reports-pnl")

  console.log("2. P&L CSV export returns text/csv with truck rows")
  const pnlCsv = await fetchCsv(page, "pnl")
  check(pnlCsv.status === 200 && /csv/i.test(pnlCsv.type ?? ""), `P&L CSV served (${pnlCsv.status} ${pnlCsv.type})`)
  check(/101/.test(pnlCsv.body), "P&L CSV includes seeded truck unit 101")
  check(/Revenue|Net/i.test(pnlCsv.body), "P&L CSV has expected column headers")

  console.log("2b. Per-driver rollup (#10): table with pay-null rule, and its CSV")
  const drivers = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="driver-pnl"]')
    const rows = [...(panel?.querySelectorAll("tbody tr") ?? [])]
    return {
      heading: document.body.innerText.toLowerCase().includes("by driver"),
      names: rows.map((r) => r.querySelector("td")?.textContent.trim() ?? ""),
      // a seeded driver with settlements shows dollars; one without shows the dash
      payCells: rows.map((r) => r.querySelectorAll("td")[5]?.textContent.trim() ?? ""),
    }
  })
  check(drivers.heading, "By driver section renders")
  check(drivers.names.includes("Harpreet Singh"), `seeded driver in the driver table (${drivers.names.slice(0, 3).join(", ")})`)
  check(drivers.payCells.some((c) => /^\$/.test(c)), "a settled driver shows pay in dollars")
  check(drivers.payCells.some((c) => c === "—"), "a driver with no settlement in range shows — not $0")
  const driversCsv = await page.evaluate(async () => {
    const res = await fetch("/hub/reports/export/drivers")
    return { status: res.status, type: res.headers.get("content-type"), body: await res.text() }
  })
  check(driversCsv.status === 200 && /csv/i.test(driversCsv.type ?? ""), `drivers CSV served (${driversCsv.status} ${driversCsv.type})`)
  check(driversCsv.body.startsWith("Driver,Loads,Revenue,LoadedMiles"), "drivers CSV has the per-mile headers")
  check(/Harpreet Singh/.test(driversCsv.body), "drivers CSV includes the seeded driver")

  console.log("3. Lanes CSV export stays graceful (empty seed is OK)")
  const lanesCsv = await fetchCsv(page, "lanes")
  check(lanesCsv.status === 200 && /csv/i.test(lanesCsv.type ?? ""), `lanes CSV served (${lanesCsv.status} ${lanesCsv.type})`)
  check(/^Lane|Origin|Loads/i.test(lanesCsv.body.trim()), "lanes CSV has a header row")

  console.log("3b. Range-following lanes export (/hub/reports/export/lanes) follows ?from/?to")
  const rangeLanesCsv = await page.evaluate(async () => {
    const res = await fetch("/hub/reports/export/lanes?from=2020-01-01&to=2020-01-31")
    return { status: res.status, type: res.headers.get("content-type"), disposition: res.headers.get("content-disposition"), body: await res.text() }
  })
  check(
    rangeLanesCsv.status === 200 && /csv/i.test(rangeLanesCsv.type ?? ""),
    `range lanes CSV served (${rangeLanesCsv.status} ${rangeLanesCsv.type})`
  )
  check(
    (rangeLanesCsv.disposition ?? "").includes('filename="lanes_2020-01-01_2020-01-31.csv"'),
    `range lanes CSV filename encodes the requested range (${rangeLanesCsv.disposition})`
  )
  check(
    /^Origin,OriginState,Destination,DestState,Loads,Revenue,Miles,EstMargin,AvgRPM/.test(rangeLanesCsv.body.trim()),
    "range lanes CSV has expected column headers"
  )

  console.log("4. Owner dashboard revenue charts render")
  await page.goto(`${BASE}/hub/reports/owner`, { waitUntil: "networkidle2" })
  // Title "Owner Dashboard" is not a nav label, but it still isn't a
  // render gate — wait for the page subtitle.
  await waitForText(page, "an owner checks first")
  const ownerDash = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase()
    return {
      hasWeekly: text.includes("revenue — last 8 weeks"),
      hasMonthly: text.includes("revenue — last 6 months"),
      hasArAging: text.includes("ar aging trend"),
      hasLoadedDeadhead: text.includes("loaded vs. deadhead"),
      hasOperatingCost: text.includes("operating cost / mi"),
      hasRevenuePerLoaded: text.includes("revenue / loaded mi"),
      hasLoadedShare: /loaded\s+\d+(\.\d+)?%/.test(text),
      // data-testid, not the utility classes: these two counts used to key on
      // `.rounded-t-md` and `.h-2.w-2.rounded-sm`, so a radius sweep silently
      // zeroed them. The page now carries stable hooks.
      revenueBarCount: document.querySelectorAll('[data-testid="revenue-bar"]').length,
      arLegendCount: [...document.querySelectorAll('[data-testid="ar-legend-swatch"]')].filter((el) =>
        /current|1-30|31-60|61-90|90\+/i.test(el.parentElement?.textContent ?? "")
      ).length,
      backLink: [...document.querySelectorAll("a")].some((a) => a.getAttribute("href") === "/hub/reports"),
    }
  })
  check(ownerDash.hasWeekly, "weekly revenue panel renders")
  check(ownerDash.hasMonthly, "monthly revenue panel renders")
  check(ownerDash.revenueBarCount >= 8, `revenue bars render (${ownerDash.revenueBarCount} bars)`)
  check(ownerDash.hasArAging, "AR aging trend panel renders")
  check(ownerDash.arLegendCount >= 4, `AR aging legend segments render (${ownerDash.arLegendCount})`)
  check(ownerDash.hasLoadedDeadhead, "loaded vs. deadhead panel renders")
  check(ownerDash.hasOperatingCost, "operating cost / mi KPI renders")
  check(ownerDash.hasRevenuePerLoaded, "revenue / loaded mi KPI renders")
  check(ownerDash.hasLoadedShare, "loaded-mile share percentage renders")
  check(ownerDash.backLink, "link back to full P&L reports")
  await shot(page, "02-owner-dashboard")

  console.log("5. Dispatcher (money:read) shares the reports view")
  const dispatchCtx = await browser.createBrowserContext()
  const dispatchPage = await dispatchCtx.newPage()
  await dispatchPage.setViewport({ width: 1440, height: 900 })
  dispatchPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(dispatchPage, "dispatch@demo.thind")
  await dispatchPage.goto(`${BASE}/hub/reports`, { waitUntil: "networkidle2" })
  await waitForText(dispatchPage, "Per-truck P&L")
  const dispatcherView = await dispatchPage.evaluate(() => ({
    seesTruck: document.body.innerText.includes("#101"),
    hasExport: [...document.querySelectorAll("a")].some((a) => (a.getAttribute("href") ?? "").includes("/api/hub/exports/pnl")),
  }))
  check(dispatcherView.seesTruck, "dispatcher sees the P&L table")
  check(dispatcherView.hasExport, "dispatcher can download P&L CSV (money:read)")
  await shot(dispatchPage, "03-reports-dispatcher")

  console.log("6. Driver cannot reach Reports")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/reports`, { waitUntil: "networkidle2" })
  await waitForPath(driverPage, "/hub/driver")
  // Pathname flips before the PWA streams in — "Last pay" is home-body copy,
  // not chrome.
  await waitForText(driverPage, "Last pay")
  const driverBlocked = await driverPage.evaluate(() => ({
    url: location.pathname,
    seesPnl: document.body.innerText.includes("Per-truck P&L"),
  }))
  check(driverBlocked.url !== "/hub/reports", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesPnl, "driver never sees the P&L table")
  await shot(driverPage, "04-reports-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nReports smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nReports smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
