/**
 * Push-to-QBO invoice button smoke test: the invoice detail page exposes a
 * "Push to QBO" control (money:write, mirrors Submit to factor), clicking it
 * against a carrier with no QuickBooks credentials fails gracefully with a
 * toast that names the setup path instead of crashing, and a dispatcher
 * (money:read only) never sees the control at all.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-qbo-push-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, sleep, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-qbo-push"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Login as owner, open an invoice's detail page")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/money/invoices`, { waitUntil: "networkidle2" })
  await waitForText(page, "Invoices")
  const detailHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")].find((a) => /\/hub\/money\/invoices\/[^/]+$/.test(a.href))?.href ?? null
  )
  check(!!detailHref, `found an invoice detail link (${detailHref})`)
  await page.goto(detailHref, { waitUntil: "networkidle2" })
  const hasButton = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Push to QBO"))
  )
  check(hasButton, "Push to QBO button present for owner")
  await shot(page, "01-invoice-detail")

  console.log("2. Carrier has no QBO credentials — push fails gracefully")
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Push to QBO"))
    btn.click()
  })
  await sleep(1200)
  const toastText = await page.evaluate(() => document.body.innerText)
  check(/QuickBooks Online isn.t connected/i.test(toastText), "toast names the QBO setup path instead of crashing")
  await shot(page, "02-not-connected-toast")

  console.log("3. Dispatcher (money:read only) never sees the control")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(detailHref, { waitUntil: "networkidle2" })
  const dispatcherHasButton = await page2.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Push to QBO"))
  )
  check(!dispatcherHasButton, "dispatcher (money:read) has no Push to QBO button")
  await shot(page2, "03-invoice-dispatcher")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nQBO push smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nQBO push smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
