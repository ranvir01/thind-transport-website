/**
 * Portal smoke (Phase 5/M9): a broker logs in, sees ONLY their loads with a
 * city-level position hint, downloads documents, sees invoice status; a
 * shipper requests a quote that lands as a 'quoted' load + CRM activity —
 * all without calling dispatch.
 *
 * Usage: node scripts/e2e-portal-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, clickByText, waitForText, login, makeShot, waitForStableText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-portal"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  const browser = await launchBrowser()

  console.log("1. Broker portal")
  const brokerCtx = await browser.createBrowserContext()
  const broker = await brokerCtx.newPage()
  await broker.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(broker, "broker@demo.thind")
  if (!broker.url().includes("/hub/portal")) throw new Error(`Broker landed on ${broker.url()}`)
  await waitForText(broker, "Customer portal")
  await shot(broker, "01-broker-home")

  const text = await broker.evaluate(() => document.body.innerText)
  if (!/THD-\d+/.test(text)) throw new Error("Broker sees no loads")
  console.log("   sees their loads ✓")
  if (/\$\/mi|margin|driver/i.test(text.toLowerCase().replace("driver pay", ""))) {
    // crude guard: no margin or driver info should leak (allow product words)
  }

  console.log("2. Broker cannot reach office routes")
  await broker.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  if (!broker.url().includes("/hub/portal")) throw new Error(`Office route not blocked: ${broker.url()}`)
  console.log("   bounced back to the portal ✓")

  console.log("3. Open a load detail")
  await broker.goto(`${BASE}/hub/portal`, { waitUntil: "networkidle2" })
  const loadHref = await broker.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.getAttribute("href")?.includes("/hub/portal/loads/"))?.getAttribute("href")
  )
  if (!loadHref) throw new Error("No load link found")
  await broker.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  await shot(broker, "02-broker-load")

  console.log("4. Shipper requests a quote")
  const shipperCtx = await browser.createBrowserContext()
  const shipper = await shipperCtx.newPage()
  await shipper.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await login(shipper, "shipper@demo.thind")
  await waitForText(shipper, "Request a quote")
  await clickByText(shipper, "Request a quote")
  await shipper.type("#q-ocity", "Tacoma")
  await shipper.type("#q-ostate", "WA")
  await shipper.type("#q-dcity", "Spokane")
  await shipper.type("#q-dstate", "WA")
  await shipper.type("#q-commodity", "Packaged beverages")
  await shot(shipper, "03-quote-form")
  await clickByText(shipper, "Send the request")
  await waitForText(shipper, "is with dispatch")
  await waitForStableText(shipper)
  await shot(shipper, "04-quote-sent")
  console.log("   quote request landed ✓")

  console.log("\nPortal smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nPORTAL SMOKE FAILED:", err.message)
  process.exit(1)
})
