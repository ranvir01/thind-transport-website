/**
 * Invoices workflow smoke test: owner one-click-invoices the seeded
 * POD-received steel-beams load, the draft invoice totals linehaul + FSC +
 * accessorials to the cent, a partial payment with odd cents flips it to
 * partial with an exact open balance, paying the remainder flips it to paid
 * (and advances the load to paid), the list shows the settled row, and a
 * dispatcher (money:read only) sees the detail but no payment form or
 * invoice actions.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run consumes the
 * pod_received steel-beams load.
 *
 * Usage: node scripts/e2e-invoices-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, login, makeShot, clickByText, reseed, trackPageErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-invoices"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Steel-beams seed load: 295000 linehaul + 31000 FSC + 10000 tarp.
const EXPECTED_TOTAL_CENTS = 336000
const PARTIAL_CENTS = 123456 // odd cents on purpose
const REMAINDER_CENTS = EXPECTED_TOTAL_CENTS - PARTIAL_CENTS

const parseCents = (s) => {
  const m = (s ?? "").match(/(-?)\$?([\d,]+)\.(\d{2})/)
  if (!m) return null
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
}

/** Value shown next to a Summary <dt> label on the invoice detail page. */
const summaryValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

async function recordPayment(page, dollars, expectedOpenCents) {
  await page.evaluate(() => (document.querySelector("#pay_amount").value = ""))
  await page.type("#pay_amount", dollars)
  // Assert what the field actually holds BEFORE submitting. The milestone
  // overlay used to mount mid-keystroke and pull focus onto itself, so
  // "2125.44" left "2" in the field and recorded a $2.00 payment under a
  // success toast — which surfaced here only as the balance never reaching 0,
  // three steps and one misleading error message later.
  const typed = await page.evaluate(() => document.querySelector("#pay_amount")?.value ?? null)
  check(typed === dollars, `amount field holds the full amount before submit (${JSON.stringify(typed)} vs ${dollars})`)
  if (typed !== dollars) {
    throw new Error(`keystrokes lost: field holds ${JSON.stringify(typed)}, expected ${dollars}`)
  }
  await clickByText(page, "Record payment", { tag: "button" })
  await waitForText(page, "Payment recorded")
  // The Summary block only reflects the new balance after the server action
  // resolves and router.refresh() re-renders — poll the "Open balance" dd
  // for the expected cents instead of sleeping a fixed 1500ms.
  await page
    .waitForFunction(
      (expectedCents) => {
        const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === "Open balance")
        const text = dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? ""
        const m = text.match(/(-?)\$?([\d,]+)\.(\d{2})/)
        if (!m) return false
        const cents = (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
        return cents === expectedCents
      },
      { timeout: 20000 },
      expectedOpenCents
    )
    .catch(() => { throw new Error(`open balance did not update to ${expectedOpenCents} cents after payment`) })
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const { errors: consoleErrors } = trackPageErrors(page)

  console.log("1. Login as owner, open the invoice list")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money/invoices`, { waitUntil: "networkidle2" })
  await waitForText(page, "Every invoice, paid or open")
  const seeded = await page.evaluate(() => document.body.innerText.match(/THD-INV-\d+/g) ?? [])
  check(seeded.length >= 3, `seeded invoices listed (${seeded.length} numbers visible)`)
  await shot(page, "01-invoice-list")

  console.log("2. Status filter narrows the list")
  await page.goto(`${BASE}/hub/money/invoices?status=paid`, { waitUntil: "networkidle2" })
  await waitForText(page, "Every invoice, paid or open")
  const pills = await page.evaluate(() =>
    [...document.querySelectorAll("table tbody span")]
      .map((s) => s.textContent.trim().toLowerCase())
      .filter((t) => ["draft", "sent", "partial", "paid", "overdue", "disputed"].includes(t))
  )
  check(pills.length > 0 && pills.every((p) => p === "paid"), `paid filter shows only paid (${pills.join(",")})`)

  console.log("3. Find the POD-received steel-beams load")
  await page.goto(`${BASE}/hub/loads?status=pod_received`, { waitUntil: "networkidle2" })
  const hrefs = await page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll('a[href^="/hub/loads/"]')]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/hub\/loads\/[0-9a-f-]{36}$/.test(h))
    )]
  )
  check(hrefs.length > 0, `pod_received loads listed (${hrefs.length})`)
  let loadUrl = null
  for (const href of hrefs) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
    const text = await page.evaluate(() => document.body.innerText)
    if (text.includes("Steel beams")) {
      loadUrl = href
      break
    }
  }
  check(!!loadUrl, `steel-beams load found (${loadUrl})`)
  if (!loadUrl) throw new Error("Seed load missing — reseed with npm run seed:demo")
  await shot(page, "02-load-before-invoice")

  console.log("4. One-click invoice the load")
  await clickByText(page, "Invoice this load", { tag: "button" })
  await page.waitForFunction(
    () => /\/hub\/money\/invoices\/[0-9a-f-]{36}$/.test(location.pathname),
    { timeout: 20000 }
  )
  await waitForText(page, "Open balance")
  const invoiceUrl = await page.evaluate(() => location.pathname)
  const number = await page.evaluate(() => document.body.innerText.match(/THD-INV-\d+/)?.[0] ?? null)
  check(!!number, `invoice numbered from tenant settings (${number})`)
  check((await summaryValue(page, "Status"))?.toLowerCase() === "draft", "status is draft (no SMTP configured)")
  const amount = parseCents(await summaryValue(page, "Amount"))
  check(amount === EXPECTED_TOTAL_CENTS,
    `amount is linehaul+FSC+tarp to the cent (${amount} vs ${EXPECTED_TOTAL_CENTS})`)
  const open0 = parseCents(await summaryValue(page, "Open balance"))
  check(open0 === EXPECTED_TOTAL_CENTS, `open balance equals amount (${open0})`)
  // innerText reflects CSS text-transform (the label renders "REMIT TO") — compare lowercased.
  check(
    await page.evaluate(() => document.body.innerText.toLowerCase().includes("remit to")),
    "remit-to block renders"
  )
  const pdfOk = await page.evaluate(async () => {
    const a = [...document.querySelectorAll("a")].find((n) => n.textContent.includes("Invoice PDF"))
    if (!a) return { found: false }
    const res = await fetch(a.href)
    // Check the body's magic bytes, not just headers — a route serving an
    // error page or empty body with a pdf content-type must still fail here.
    const buf = new Uint8Array(await res.arrayBuffer())
    const magic = String.fromCharCode(...buf.slice(0, 5))
    return { found: true, status: res.status, type: res.headers.get("content-type"), magic, bytes: buf.length }
  })
  check(pdfOk.found && pdfOk.status === 200 && /pdf/.test(pdfOk.type ?? "") &&
    pdfOk.magic === "%PDF-" && pdfOk.bytes > 1000,
    `invoice PDF stored and served (${pdfOk.status} ${pdfOk.type} magic=${pdfOk.magic} ${pdfOk.bytes}B)`)
  await shot(page, "03-invoice-draft")

  console.log("5. Load advanced to invoiced")
  await page.goto(`${BASE}${loadUrl}`, { waitUntil: "networkidle2" })
  const loadText = await page.evaluate(() => document.body.innerText.toLowerCase())
  check(loadText.includes("invoiced"), "load status shows invoiced")
  check(!loadText.includes("invoice this load"), "create button gone after invoicing")

  console.log("6. Partial payment with odd cents")
  await page.goto(`${BASE}${invoiceUrl}`, { waitUntil: "networkidle2" })
  await page.waitForSelector("#pay_amount", { timeout: 10000 })
  await recordPayment(page, (PARTIAL_CENTS / 100).toFixed(2), REMAINDER_CENTS)
  check((await summaryValue(page, "Status"))?.toLowerCase() === "partial", "status flips to partial")
  check(parseCents(await summaryValue(page, "Paid")) === PARTIAL_CENTS,
    `paid shows exact cents (${await summaryValue(page, "Paid")})`)
  check(parseCents(await summaryValue(page, "Open balance")) === REMAINDER_CENTS,
    `open balance is exact remainder (${await summaryValue(page, "Open balance")})`)
  await shot(page, "04-invoice-partial")

  console.log("7. Pay the remainder — invoice paid, load paid")
  await recordPayment(page, (REMAINDER_CENTS / 100).toFixed(2), 0)
  check((await summaryValue(page, "Status"))?.toLowerCase() === "paid", "status flips to paid")
  check(parseCents(await summaryValue(page, "Open balance")) === 0, "open balance is $0.00")
  const formGone = await page.evaluate(() => !document.querySelector("#pay_amount"))
  check(formGone, "record-payment form hidden once settled")
  const paymentRows = await page.evaluate(() =>
    [...document.querySelectorAll("li")].filter((li) => /\$[\d,]+\.\d{2}/.test(li.textContent)).length
  )
  check(paymentRows >= 2, `both payments listed (${paymentRows})`)
  await page.goto(`${BASE}${loadUrl}`, { waitUntil: "networkidle2" })
  check(
    await page.evaluate(() => document.body.innerText.toLowerCase().includes("paid")),
    "load advanced to paid after final payment"
  )
  await shot(page, "05-invoice-paid")

  console.log("8. Dispatcher (money:read) sees detail read-only")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  trackPageErrors(page2, consoleErrors)
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}${invoiceUrl}`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Open balance")
  const dispatcher = await page2.evaluate(() => ({
    seesSummary: document.body.innerText.toLowerCase().includes("summary"),
    hasPayForm: !!document.querySelector("#pay_amount"),
    hasActions: [...document.querySelectorAll("button")].some((b) =>
      /dispute|factoring/i.test(b.textContent)),
  }))
  check(dispatcher.seesSummary, "dispatcher sees the invoice summary")
  check(!dispatcher.hasPayForm, "dispatcher has no record-payment form")
  check(!dispatcher.hasActions, "dispatcher has no dispute/factoring actions")
  await shot(page2, "06-invoice-dispatcher")

  check(consoleErrors.length === 0, `no console errors (${consoleErrors.length}: ${consoleErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nInvoices smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nInvoices smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
