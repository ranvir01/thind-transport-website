/**
 * Customer statements workflow smoke test: the money page rolls up open
 * invoices per customer (skips fully-paid customers), the PDF link opens a
 * real application/pdf, and sending a statement without SMTP configured
 * stays graceful (a toast, not a crash) while a dispatcher (money:read only)
 * sees no send button at all.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-statements-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { ANCHORS, launchBrowser, BASE, failures, check, waitForText, textAppears, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-statements"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

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
  await waitForText(page, ANCHORS.money)
  await waitForText(page, "Customer statements")
  await shot(page, "01-money-statements-panel")

  console.log("2. Seeded open-invoice customers are rolled up, paid ones are not")
  const names = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Customer statements")
    const panel = h2?.nextElementSibling
    return panel ? [...panel.querySelectorAll("p.font-semibold")].map((p) => p.textContent.trim()) : []
  })
  check(names.includes("Evergreen Freight Partners"), `Evergreen Freight Partners (open) listed (${names.join(", ")})`)
  check(names.includes("High Desert Freight"), `High Desert Freight (overdue) listed (${names.join(", ")})`)
  check(names.includes("Summit Brokerage Group"), `Summit Brokerage Group (open) listed (${names.join(", ")})`)
  check(!names.includes("Pacific Crest Logistics"), "Pacific Crest Logistics (fully paid) is NOT listed")

  console.log("3. Statement PDF link opens a real application/pdf")
  const pdfHref = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Customer statements")
    const link = h2?.nextElementSibling?.querySelector('a[href*="/api/hub/customer-statements/"]')
    return link?.getAttribute("href") ?? null
  })
  check(!!pdfHref, `statement PDF link found (${pdfHref})`)
  const pdfRes = await page.evaluate(async (href) => {
    const res = await fetch(href)
    return { status: res.status, type: res.headers.get("content-type") }
  }, pdfHref)
  check(pdfRes.status === 200 && /pdf/.test(pdfRes.type ?? ""), `statement PDF served (${pdfRes.status} ${pdfRes.type})`)

  console.log("4. Send statement without SMTP configured stays graceful")
  const sendClicked = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Customer statements")
    const btn = [...(h2?.nextElementSibling?.querySelectorAll("button") ?? [])].find((b) =>
      b.textContent.includes("Send statement")
    )
    if (btn) {
      btn.click()
      return true
    }
    return false
  })
  check(sendClicked, "Send statement button found and clicked")
  const toastAppeared = await textAppears(page, "email not configured")
  check(
    toastAppeared,
    "toast surfaces the email-not-configured message instead of crashing"
  )
  await shot(page, "02-money-send-statement-toast")

  console.log("5. Dispatcher (money:read only) sees the rollup with no send button")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(page2, ANCHORS.money)
  await waitForText(page2, "Customer statements")
  const dispatcherView = await page2.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Customer statements")
    const panel = h2?.nextElementSibling
    return {
      hasRows: (panel?.querySelectorAll("p.font-semibold").length ?? 0) > 0,
      hasSendButton: [...(panel?.querySelectorAll("button") ?? [])].some((b) =>
        b.textContent.includes("Send statement")
      ),
      hasPdfLink: !!panel?.querySelector('a[href*="/api/hub/customer-statements/"]'),
    }
  })
  check(dispatcherView.hasRows, "dispatcher sees the customer statement rollup")
  check(!dispatcherView.hasSendButton, "dispatcher has no send-statement button (money:write required)")
  check(dispatcherView.hasPdfLink, "dispatcher can still download the PDF (money:read)")
  await shot(page2, "03-money-statements-dispatcher")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nStatements smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nStatements smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
