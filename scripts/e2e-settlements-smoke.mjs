/**
 * Settlements workflow smoke test: owner runs the weekly draft, the engine
 * itemizes Harpreet's per-mile settlement to the cent (two seeded pod_received
 * loads + lumper reimbursement − EFS advance − insurance), a second draft run
 * creates nothing (no double-pay), approving generates a served statement PDF
 * and flips the advance to applied, mark-paid closes the settlement, approving
 * the O/O percentage draft posts exactly one weekly escrow contribution, and a
 * dispatcher (money:read only) sees everything read-only.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run applies the
 * seeded EFS advance and settles the pod_received loads.
 *
 * Usage: node scripts/e2e-settlements-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-settlements"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Harpreet Singh (company per-mile $0.63 loaded-only, $75/wk insurance):
//   settle1 520 mi -> 32760, settle2 480 mi -> 30240, lumper reimb 15000
//   deductions: outstanding advance 20000 (EFS code 4417) + insurance 7500
const HARPREET = {
  grossCents: 78000,
  deductionsCents: 27500,
  netCents: 50500,
  lineAmounts: ["$327.60", "$302.40", "$150.00", "$200.00", "$75.00"],
}
// Jasdeep Brar (O/O 90% linehaul+accessorials, FSC passthrough, $50/wk escrow):
//   settle3 (250000+15000)*0.9 = 238500, Juice invoiced load 310000*0.9 = 279000
//   FSC 30000 + 34000; escrow deduction 5000 -> net 576500
const JASDEEP = { netCents: 576500 }
// Seeded escrow: opening 150000 + 5000 from the seeded paid settlement.
// The balances panel renders fmtCents (whole dollars).
const ESCROW_BEFORE = "$1,550"
const ESCROW_AFTER = "$1,600" // exactly one weekly contribution posted

const parseCents = (s) => {
  const m = (s ?? "").match(/\$([\d,]+)\.(\d{2})/)
  if (!m) return null
  return Number(m[1].replace(/,/g, "")) * 100 + Number(m[2])
}

/** Value shown next to a Totals <dt> label on the settlement detail page. */
const totalsValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

/** Detail-page hrefs of settlement rows whose text matches every needle. */
const settlementLinks = (page, needles) =>
  page.evaluate((ns) => {
    return [...document.querySelectorAll('a[href^="/hub/money/settlements/"]')]
      .filter((a) => ns.every((n) => a.textContent.toLowerCase().includes(n.toLowerCase())))
      .map((a) => a.getAttribute("href"))
  }, needles)

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

  console.log("1. Login as owner, open settlements")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
  await waitForText(page, "Settlements")
  const seededPaid = await settlementLinks(page, ["paid"])
  check(seededPaid.length >= 2, `seeded paid settlements listed (${seededPaid.length})`)
  await waitForText(page, "Escrow balances")
  const escrowBefore = await page.evaluate(() => document.body.innerText)
  check(escrowBefore.includes(ESCROW_BEFORE),
    `Jasdeep escrow balance starts at ${ESCROW_BEFORE}`)
  await shot(page, "01-settlement-list")

  console.log("2. Draft this week's settlements")
  await clickByText(page, "Draft this week", { tag: "button" })
  await waitForText(page, "settlement draft(s) created")
  await sleep(1500) // router.refresh
  const harpreetDrafts = await settlementLinks(page, ["Harpreet Singh", "draft"])
  check(harpreetDrafts.length === 1, `Harpreet draft created (${harpreetDrafts.length})`)
  const jasdeepDrafts = await settlementLinks(page, ["Jasdeep Brar", "draft"])
  check(jasdeepDrafts.length === 1, `Jasdeep draft created (${jasdeepDrafts.length})`)
  await shot(page, "02-drafted-list")

  console.log("3. Second draft run creates nothing (no double-pay)")
  await clickByText(page, "Draft this week", { tag: "button" })
  await waitForText(page, "0 settlement draft(s) created")
  await sleep(1500)
  const harpreetAfterRerun = await settlementLinks(page, ["Harpreet Singh", "draft"])
  check(harpreetAfterRerun.length === 1,
    `rerun did not duplicate Harpreet's draft (${harpreetAfterRerun.length})`)

  console.log("4. Harpreet's draft itemizes to the cent")
  await page.goto(`${BASE}${harpreetDrafts[0]}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Net pay")
  check((await page.evaluate(() => document.body.innerText)).includes("Status: draft"), "status is draft")
  check(parseCents(await totalsValue(page, "Gross")) === HARPREET.grossCents,
    `gross is loads+reimbursement to the cent (${await totalsValue(page, "Gross")})`)
  check(parseCents(await totalsValue(page, "Deductions")) === HARPREET.deductionsCents,
    `deductions are advance+insurance to the cent (${await totalsValue(page, "Deductions")})`)
  check(parseCents(await totalsValue(page, "Net pay")) === HARPREET.netCents,
    `net pay is gross − deductions (${await totalsValue(page, "Net pay")})`)
  const detailText = await page.evaluate(() => document.body.innerText)
  for (const amount of HARPREET.lineAmounts) {
    check(detailText.includes(amount), `line amount ${amount} itemized`)
  }
  check(detailText.includes("EFS code 4417"), "advance line names its reference")
  const loadLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/hub/loads/"]')].length
  )
  check(loadLinks >= 2, `earning lines link to their source loads (${loadLinks})`)
  await shot(page, "03-draft-detail")

  console.log("5. Approve — statement PDF stored, advance applied")
  await clickByText(page, "Approve", { tag: "button" })
  await waitForText(page, "Status: approved", 20000)
  const pdfOk = await page.evaluate(async () => {
    const a = [...document.querySelectorAll("a")].find((n) => n.textContent.includes("Statement PDF"))
    if (!a) return { found: false }
    const res = await fetch(a.href)
    return { found: true, status: res.status, type: res.headers.get("content-type") }
  })
  check(pdfOk.found && pdfOk.status === 200 && /pdf/.test(pdfOk.type ?? ""),
    `statement PDF stored and served (${pdfOk.status} ${pdfOk.type})`)
  await shot(page, "04-approved")
  await page.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
  await waitForText(page, "Advances")
  const advanceRow = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((n) => n.textContent.includes("EFS code 4417"))
    return el?.closest("div.flex")?.textContent ?? null
  })
  check(/applied/i.test(advanceRow ?? "") && !/outstanding/i.test(advanceRow ?? ""),
    `EFS advance flipped to applied (${(advanceRow ?? "missing").trim().slice(0, 80)})`)

  console.log("6. Mark paid closes the settlement")
  await page.goto(`${BASE}${harpreetDrafts[0]}`, { waitUntil: "networkidle2" })
  await clickByText(page, "Mark paid", { tag: "button" })
  await waitForText(page, "Status: paid", 20000)
  const paidButtons = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /approve|mark paid/i.test(b.textContent)).length
  )
  check(paidButtons === 0, "no settlement actions once paid")
  await shot(page, "05-paid")

  console.log("7. O/O percentage draft: net to the cent, detention itemized, escrow posts once")
  await page.goto(`${BASE}${jasdeepDrafts[0]}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Net pay")
  check(parseCents(await totalsValue(page, "Net pay")) === JASDEEP.netCents,
    `O/O net is 90% linehaul + FSC − escrow (${await totalsValue(page, "Net pay")})`)
  // settle3 carries a $150 auto-billed Detention accessorial: the evaluator
  // names its 90% share on its own line instead of blending it into the base.
  const jasdeepDetail = await page.evaluate(() => document.body.innerText)
  check(jasdeepDetail.includes("90% of detention $150.00"),
    "detention share itemized as its own earning line")
  check(jasdeepDetail.includes("$135.00"), "detention line pays 90% × $150.00 = $135.00")
  check(jasdeepDetail.includes("90% of $2500.00") && jasdeepDetail.includes("$2,250.00"),
    "remainder line excludes detention from its base ($2,250.00 of $2500.00)")
  await clickByText(page, "Approve", { tag: "button" })
  await waitForText(page, "Status: approved", 20000)
  await page.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
  await waitForText(page, "Escrow balances")
  const escrowAfter = await page.evaluate(() => document.body.innerText)
  check(escrowAfter.includes(ESCROW_AFTER) && !escrowAfter.includes(ESCROW_BEFORE),
    `escrow bumped by exactly one weekly contribution (${ESCROW_AFTER})`)
  await shot(page, "06-escrow-bumped")

  console.log("8. Dispatcher (money:read) sees settlements read-only")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Settlements")
  const dispatcherDraftBtn = await page2.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Draft this week"))
  )
  check(!dispatcherDraftBtn, "dispatcher has no draft-settlements button")
  await page2.goto(`${BASE}${jasdeepDrafts[0]}`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Net pay")
  const dispatcherActions = await page2.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /approve|mark paid/i.test(b.textContent)).length
  )
  check(dispatcherActions === 0, "dispatcher has no approve/mark-paid actions")
  await shot(page2, "07-dispatcher")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nSettlements smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nSettlements smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
