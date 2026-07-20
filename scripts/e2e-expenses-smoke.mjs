/**
 * Expenses workflow smoke test: owner records a toll expense with odd cents,
 * the list renders it exactly, the QuickBooks CSV export and the per-truck
 * P&L both reconcile to the cent, a reimbursable expense is tagged for the
 * next settlement, and a dispatcher (money:read only) sees the list but no
 * record form.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — each run records the
 * same $84.37 toll, so without a reseed duplicates pile up and the CSV/P&L
 * row matching turns ambiguous.
 *
 * Usage: node scripts/e2e-expenses-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, textAppears, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-expenses"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// The list renders fmtCentsExact -> "$84.37"; CSV exports render "84.37".
const parseCents = (s) => {
  const m = (s ?? "").match(/(-?)\$?([\d,]+)\.(\d{2})/)
  if (!m) return null
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
}

const fetchCsv = (page, kind) =>
  page.evaluate(async (k) => {
    const res = await fetch(`/api/hub/exports/${k}`)
    return { status: res.status, body: await res.text() }
  }, kind)

// OtherExpenses cents for one truck row of the per-truck P&L export.
const pnlOtherCents = (csv, unit) => {
  const lines = csv.trim().split("\n")
  const headers = lines[0].split(",")
  const col = headers.findIndex((h) => /otherexpenses/i.test(h))
  const row = lines.slice(1).find((l) => l.split(",")[0] === unit)
  if (!row || col < 0) return null
  return Math.round(Number(row.split(",")[col]) * 100)
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  const marker = `E2E toll ${Date.now().toString(36)}`

  console.log("1. Login as owner, open expenses")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money/expenses`, { waitUntil: "networkidle2" })
  await waitForText(page, "Expenses")
  const ownerHasForm = await page
    .waitForSelector("#exp_cat", { timeout: 10000 })
    .then(() => true)
    .catch(() => false)
  check(ownerHasForm, "owner sees the record-expense form")
  await shot(page, "01-expenses-before")

  console.log("2. Read truck + driver options and the P&L baseline")
  const picked = await page.evaluate(() => {
    const opt = (id) => {
      const o = document.querySelector(`#${id} option:not([value=""])`)
      return o ? { value: o.value, label: o.textContent.trim() } : null
    }
    return { truck: opt("exp_truck"), driver: opt("exp_driver") }
  })
  check(!!picked.truck, `truck options populated (${picked.truck?.label})`)
  check(!!picked.driver, `driver options populated (${picked.driver?.label})`)
  const unit = picked.truck.label.replace(/^#/, "")
  const pnlBefore = await fetchCsv(page, "pnl")
  check(pnlBefore.status === 200, `pnl export responds 200 (got ${pnlBefore.status})`)
  const otherBefore = pnlOtherCents(pnlBefore.body, unit)
  check(otherBefore !== null, `pnl has a row for truck #${unit} (other=${otherBefore})`)

  console.log("3. Record a toll expense with odd cents ($84.37)")
  await page.select("#exp_cat", "tolls")
  await page.type("#exp_amount", "84.37")
  await page.select("#exp_truck", picked.truck.value)
  await page.select("#exp_driver", picked.driver.value)
  await page.type("#exp_memo", marker)
  await page.click('button[type="submit"]')
  await waitForText(page, "Expense recorded")
  // The list only reflects the new row after router.refresh() re-renders —
  // poll for the memo marker instead of sleeping a fixed 1500ms.
  await textAppears(page, marker)
  const listed = await page.evaluate((memo) => {
    const row = [...document.querySelectorAll("p")].find((p) => p.textContent.includes(memo))
    const container = row?.closest("div.flex")
    return {
      found: !!row,
      amount: container?.querySelector("span.font-mono")?.textContent?.trim() ?? null,
      meta: container?.querySelectorAll("p")[1]?.textContent ?? "",
    }
  }, marker)
  check(listed.found, "new expense appears in the list")
  check(parseCents(listed.amount) === 8437, `list shows exact cents (got ${listed.amount})`)
  check(listed.meta.includes(`#${unit}`), `list row shows truck #${unit}`)
  check(listed.meta.includes(picked.driver.label), `list row shows driver ${picked.driver.label}`)
  await shot(page, "02-expenses-recorded")

  console.log("4. Reconcile the QuickBooks CSV export")
  const csv = await fetchCsv(page, "expenses")
  check(csv.status === 200, `expenses.csv responds 200 (got ${csv.status})`)
  const line = csv.body.split("\n").find((l) => l.includes(marker))
  check(!!line, "expenses.csv contains the new expense")
  check(
    !!line && Math.round(Number(line.split(",")[2]) * 100) === 8437,
    `expenses.csv amount is 84.37 (line: ${line?.slice(0, 80)})`
  )

  console.log("5. Per-truck P&L other-expenses moved by exactly 8437 cents")
  const pnlAfter = await fetchCsv(page, "pnl")
  const otherAfter = pnlOtherCents(pnlAfter.body, unit)
  check(
    otherAfter !== null && otherAfter - otherBefore === 8437,
    `pnl OtherExpenses delta is 8437 (${otherBefore} -> ${otherAfter})`
  )

  console.log("6. Record a reimbursable lumper expense")
  await page.select("#exp_cat", "lumper")
  await page.type("#exp_amount", "45.00")
  await page.type("#exp_memo", `${marker} reimb`)
  await page.click('label:has(input[type="checkbox"])')
  await page.click('button[type="submit"]')
  await waitForText(page, "Expense recorded")
  await textAppears(page, `${marker} reimb`)
  const reimb = await page.evaluate((memo) => {
    const row = [...document.querySelectorAll("p")].find((p) => p.textContent.includes(memo))
    return row?.closest("div.flex")?.querySelectorAll("p")[1]?.textContent ?? ""
  }, `${marker} reimb`)
  check(reimb.includes("reimbursable"), `reimbursable tag shows (meta: ${reimb.slice(0, 80)})`)
  check(!reimb.includes("settled"), "not yet settled (no settlement line)")
  await shot(page, "03-expenses-reimbursable")

  console.log("7. Dispatcher (money:read) sees the list but no form")
  // Fresh cookie jar — the default context is still logged in as owner.
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}/hub/money/expenses`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Expenses")
  // capitalize on the category row title-cases the memo in innerText.
  const dispatcher = await page2.evaluate((memo) => ({
    hasForm: document.body.innerText.includes("Record expense"),
    seesList: document.body.innerText.toLowerCase().includes(memo.toLowerCase()),
  }), marker)
  check(!dispatcher.hasForm, "dispatcher has no record-expense form")
  check(dispatcher.seesList, "dispatcher still sees the expense list")
  await shot(page2, "04-expenses-dispatcher")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nExpenses smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nExpenses smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
