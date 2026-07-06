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
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

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
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
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

  console.log("3. Lanes CSV export stays graceful (empty seed is OK)")
  const lanesCsv = await fetchCsv(page, "lanes")
  check(lanesCsv.status === 200 && /csv/i.test(lanesCsv.type ?? ""), `lanes CSV served (${lanesCsv.status} ${lanesCsv.type})`)
  check(/^Lane|Origin|Loads/i.test(lanesCsv.body.trim()), "lanes CSV has a header row")

  console.log("4. Owner dashboard revenue charts render")
  await page.goto(`${BASE}/hub/reports/owner`, { waitUntil: "networkidle2" })
  await waitForText(page, "Owner Dashboard")
  const ownerDash = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase()
    return {
      hasWeekly: text.includes("revenue — last 8 weeks"),
      hasMonthly: text.includes("revenue — last 6 months"),
      barCount: document.querySelectorAll(".bg-accent.rounded-t-md").length,
      backLink: [...document.querySelectorAll("a")].some((a) => a.getAttribute("href") === "/hub/reports"),
    }
  })
  check(ownerDash.hasWeekly, "weekly revenue panel renders")
  check(ownerDash.hasMonthly, "monthly revenue panel renders")
  check(ownerDash.barCount >= 8, `revenue bars render (${ownerDash.barCount} bars)`)
  check(ownerDash.backLink, "link back to full P&L reports")
  await shot(page, "02-owner-dashboard")

  console.log("5. Dispatcher (money:read) shares the reports view")
  const dispatchCtx = await browser.createBrowserContext()
  const dispatchPage = await dispatchCtx.newPage()
  await dispatchPage.setViewport({ width: 1440, height: 900 })
  dispatchPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
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
  await sleep(1000)
  const driverBlocked = await driverPage.evaluate(() => ({
    url: location.pathname,
    seesPnl: document.body.innerText.includes("Per-truck P&L"),
  }))
  check(driverBlocked.url !== "/hub/reports", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesPnl, "driver never sees the P&L table")
  await shot(driverPage, "04-reports-driver-blocked")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
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
