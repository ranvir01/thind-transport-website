/**
 * QuickBooks Desktop IIF export smoke test: the money page exposes an
 * "Expenses (QuickBooks .IIF)" link alongside the other CSV exports, it
 * serves a real IIF general-journal file (not CSV), the TRNS/SPL block
 * balances and uses the category's mapped account, and it's gated the same
 * as every other money export (money:read — owner/dispatcher/accountant see
 * it, driver does not).
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-qbo-iif-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, check, failures, login, makeShot, reseed, waitForText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-qbo-iif"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

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

  console.log("1. Login as owner, open the money page")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(page, "Customer statements")
  const iifHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find((a) => a.textContent.includes("QuickBooks .IIF"))
    return link?.getAttribute("href") ?? null
  })
  check(iifHref === "/api/hub/exports/qbo-iif", `QuickBooks .IIF export link present (${iifHref})`)
  await shot(page, "01-money-qbo-iif-link")

  console.log("2. The export serves a real IIF general-journal file, not CSV")
  const res = await page.evaluate(async (href) => {
    const r = await fetch(href)
    return { status: r.status, type: r.headers.get("content-type"), disposition: r.headers.get("content-disposition"), body: await r.text() }
  }, iifHref)
  check(res.status === 200, `IIF export served (${res.status})`)
  check(!/text\/csv/.test(res.type ?? ""), `content-type is not CSV (${res.type})`)
  check(/expenses-qbo\.iif/.test(res.disposition ?? ""), `filename is expenses-qbo.iif (${res.disposition})`)

  console.log("3. The IIF body is a well-formed, balanced general-journal export")
  const lines = res.body.split("\r\n").filter(Boolean)
  check(lines[0] === "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO", "header row 1 (!TRNS) correct")
  check(lines[1] === "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO", "header row 2 (!SPL) correct")
  check(lines[2] === "!ENDTRNS", "header row 3 (!ENDTRNS) correct")
  const trnsLines = lines.filter((l) => l.startsWith("TRNS\t"))
  const splLines = lines.filter((l) => l.startsWith("SPL\t"))
  const endLines = lines.filter((l) => l === "ENDTRNS")
  check(trnsLines.length > 0, `at least one TRNS line for seeded expenses (${trnsLines.length})`)
  check(trnsLines.length === splLines.length && splLines.length === endLines.length, `TRNS/SPL/ENDTRNS counts match (${trnsLines.length}/${splLines.length}/${endLines.length})`)
  const balanced = trnsLines.every((trns, i) => {
    const trnsAmt = Number(trns.split("\t")[7])
    const splAmt = Number(splLines[i].split("\t")[7])
    return Math.abs(trnsAmt + splAmt) < 0.001
  })
  check(balanced, "every TRNS/SPL pair nets to zero (debit and credit balance)")
  check(trnsLines.every((l) => l.includes("Business Checking")), "TRNS lines post against the offset bank account")
  const knownAccounts = ["Fuel Expense", "Tolls & Permits", "Repairs & Maintenance", "Insurance Expense", "Lumper Fees", "Other Business Expenses"]
  check(splLines.every((l) => knownAccounts.some((a) => l.includes(a))), "SPL lines use a mapped QBO expense account")

  console.log("4. Driver (no money:read) is bounced off /hub/money entirely")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  const driverUrl = page2.url()
  check(!driverUrl.includes("/hub/money"), `driver redirected away from /hub/money (landed on ${driverUrl})`)

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nQBO IIF export smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nQBO IIF export smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
