/**
 * QuickBooks Desktop IIF export smoke test: the money page exposes four
 * "(QuickBooks .IIF)" links — expenses, invoices, payments, settlements —
 * each serves a real IIF general-journal file (not CSV), each TRNS/SPL block
 * balances and posts to the right accounts, and every export is gated the
 * same as the other money exports (money:read — owner/dispatcher/accountant
 * see it, driver does not).
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-qbo-iif-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, check, failures, login, makeShot, reseed, waitForText, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-qbo-iif"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const EXPORTS = [
  {
    kind: "qbo-iif",
    label: "Expenses (QuickBooks .IIF)",
    filename: "expenses-qbo.iif",
    trnsAccount: "Business Checking",
    splAccounts: ["Fuel Expense", "Tolls & Permits", "Repairs & Maintenance", "Insurance Expense", "Lumper Fees", "Other Business Expenses"],
  },
  {
    kind: "qbo-iif-invoices",
    label: "Invoices (QuickBooks .IIF)",
    filename: "invoices-qbo.iif",
    trnsAccount: "Accounts Receivable",
    splAccounts: ["Freight Revenue"],
  },
  {
    kind: "qbo-iif-payments",
    label: "Payments (QuickBooks .IIF)",
    filename: "payments-qbo.iif",
    trnsAccount: "Business Checking",
    splAccounts: ["Accounts Receivable"],
  },
  {
    kind: "qbo-iif-settlements",
    label: "Settlements (QuickBooks .IIF)",
    filename: "settlements-qbo.iif",
    trnsAccount: "Driver Pay Expense",
    // Settlement TRNS splits across checking (always) and deductions payable (when > 0);
    // per-TRNS balance check below sums every SPL line under a TRNS, not just the first.
    splAccounts: ["Business Checking", "Driver Deductions Payable"],
  },
]

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as owner, open the money page")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(page, "receivables, invoices, and driver pay")
  await waitForText(page, "Customer statements")

  // The nine-chip export wall became one "Export" button opening a sheet
  // (ExportSheet.tsx), so the four IIF rows are not on the page until it is
  // open — and they are labelled "Invoices (.IIF)" etc., not the old
  // "QuickBooks .IIF". Match on the export href, which is the contract that
  // actually matters and survives relabelling.
  // Two gates, not one: the "Export" button opens the sheet, and the IIF rows
  // sit behind a further "Using QuickBooks Desktop?" disclosure inside it
  // (Desktop-only .IIF is deliberately de-emphasised vs the CSV reports).
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Export")?.click()
  })
  await waitForText(page, "Using QuickBooks Desktop?")
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")]
      .find((b) => b.textContent?.includes("Using QuickBooks Desktop?"))
      ?.click()
  })
  const links = await page.evaluate(async () => {
    const read = () =>
      [...document.querySelectorAll('a[href*="/api/hub/exports/qbo-iif"]')].map((a) => ({
        text: a.textContent.trim(),
        href: a.getAttribute("href"),
      }))
    for (let i = 0; i < 30 && read().length < 4; i++) await new Promise((r) => setTimeout(r, 100))
    return read()
  })
  check(links.length === 4, `all 4 QuickBooks .IIF export links present (found ${links.length})`)
  await shot(page, "01-money-qbo-iif-links")

  for (const exp of EXPORTS) {
    console.log(`2. ${exp.label} export`)
    const link = links.find((l) => l.href === `/api/hub/exports/${exp.kind}`)
    check(!!link, `${exp.kind} link present with correct href`)

    const res = await page.evaluate(async (href) => {
      const r = await fetch(href)
      return { status: r.status, type: r.headers.get("content-type"), disposition: r.headers.get("content-disposition"), body: await r.text() }
    }, `/api/hub/exports/${exp.kind}`)
    check(res.status === 200, `${exp.kind}: served (${res.status})`)
    check(!/text\/csv/.test(res.type ?? ""), `${exp.kind}: content-type is not CSV (${res.type})`)
    check((res.disposition ?? "").includes(`filename="${exp.filename}"`), `${exp.kind}: filename is ${exp.filename} (${res.disposition})`)

    const lines = res.body.split("\r\n").filter(Boolean)
    check(lines[0] === "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO", `${exp.kind}: header row 1 (!TRNS) correct`)
    check(lines[1] === "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO", `${exp.kind}: header row 2 (!SPL) correct`)
    check(lines[2] === "!ENDTRNS", `${exp.kind}: header row 3 (!ENDTRNS) correct`)

    // Group lines into TRNS/SPL*/ENDTRNS blocks so multi-split settlements (one TRNS, two SPLs) verify correctly.
    const blocks = []
    let current = null
    for (const l of lines.slice(3)) {
      if (l.startsWith("TRNS\t")) current = { trns: l, spls: [] }
      else if (l.startsWith("SPL\t")) current.spls.push(l)
      else if (l === "ENDTRNS") { blocks.push(current); current = null }
    }
    check(blocks.length > 0, `${exp.kind}: at least one transaction block for seeded data (${blocks.length})`)
    const balanced = blocks.every((b) => {
      const trnsAmt = Number(b.trns.split("\t")[7])
      const splTotal = b.spls.reduce((sum, s) => sum + Number(s.split("\t")[7]), 0)
      return Math.abs(trnsAmt + splTotal) < 0.001
    })
    check(balanced, `${exp.kind}: every TRNS/SPL block nets to zero (debit and credit balance)`)
    check(blocks.every((b) => b.trns.includes(exp.trnsAccount)), `${exp.kind}: TRNS lines post against ${exp.trnsAccount}`)
    check(
      blocks.every((b) => b.spls.every((s) => exp.splAccounts.some((a) => s.includes(a)))),
      `${exp.kind}: SPL lines post against a known account (${exp.splAccounts.join(", ")})`
    )
  }

  console.log("6. Driver (no money:read) is bounced off /hub/money entirely")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  // Wait for the bounce rather than reading the URL on the tick after goto —
  // a client-side redirect can still be in flight at networkidle2. Mirrors
  // e2e-random-testing-smoke: catch to false so a page that never bounces
  // reports a failed check instead of throwing out of the drive.
  const bounced = await page2
    .waitForFunction(() => !location.pathname.startsWith("/hub/money"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  const driverUrl = page2.url()
  check(bounced && !driverUrl.includes("/hub/money"), `driver redirected away from /hub/money (landed on ${driverUrl})`)

  const realErrors = realConsoleErrors(consoleErrors)
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
