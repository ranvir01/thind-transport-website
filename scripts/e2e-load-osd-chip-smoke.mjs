/**
 * Load detail OS&D chip smoke: the driver OS&D-on-POD flow flags a load
 * (hub.loads.osd_flagged) and auto-opens a draft cargo claim, but the load
 * detail page gave no hint either existed — a flagged load with real money
 * on the line (a cargo claim) was reachable only by knowing to check
 * Safety > Claims. This drives the real gap: a driver notes OS&D on a POD,
 * the office opens that load and sees the new chip, follows it to the exact
 * claim the flow opened, and a load that was never flagged shows no chip.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — advances a driver's
 * seeded load through delivery with an OS&D POD upload.
 *
 * Usage: node scripts/e2e-load-osd-chip-smoke.mjs [outputDir]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  launchBrowser, BASE, failures, check, waitForText, textAppears, textGone,
  login, makeShot, clickByText, reseed, realConsoleErrors,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-load-osd-chip"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

/** Mirrors scripts/e2e-safety-smoke.mjs — advances the driver's home load through delivery. */
async function advanceDriverLoadToDelivered(page) {
  await waitForText(page, "THD-")
  await clickByText(page, "confirm this dispatch")
  await waitForText(page, "Dispatch confirmed")
  check(await textGone(page, "confirm this dispatch"), "dispatch ack committed (confirm button gone)")

  await clickByText(page, "I'm heading to the pickup")
  await waitForText(page, "Status updated")
  check(await textAppears(page, "Loaded — rolling now"), "status advanced to at_pickup (next advance offered)")

  await clickByText(page, "I'm here")
  await waitForText(page, "Arrival recorded")
  check(await textAppears(page, "Leaving now"), "pickup arrival committed (Leaving now offered)")
  await clickByText(page, "Leaving now")
  await waitForText(page, "Departure recorded")
  check(await textGone(page, "Leaving now"), "pickup departure committed (stop closed out)")

  await clickByText(page, "Loaded — rolling now")
  await waitForText(page, "Status updated")
  check(await textGone(page, "Loaded — rolling now"), "status advanced to in_transit")

  await clickByText(page, "I'm here")
  await waitForText(page, "Arrival recorded")
  check(await textAppears(page, "Leaving now"), "delivery arrival committed (Leaving now offered)")
  await clickByText(page, "Leaving now")
  await waitForText(page, "Departure recorded")
  check(await textGone(page, "Leaving now"), "delivery departure committed (stop closed out)")

  await clickByText(page, "Delivered", { timeout: 20000 })
  await waitForText(page, "Status updated")
  check(await textAppears(page, "delivered — send the pod"), "load is delivered and awaiting POD")
}

/** Mirrors scripts/e2e-safety-smoke.mjs — the OS&D checkbox lives inside the POD upload card. */
async function uploadOsdPod(page, fixturePath) {
  const fileInputHandle = await page.evaluateHandle(() => {
    const box = [...document.querySelectorAll("label")].find((l) =>
      (l.textContent ?? "").includes("Exceptions noted on the POD")
    )
    if (!box) return null
    const checkbox = box.querySelector('input[type="checkbox"]')
    if (checkbox && !checkbox.checked) checkbox.click()
    const card = box.closest("div.rounded-xl") ?? box.parentElement
    return card ? card.querySelector('input[type="file"]') : null
  })
  const fileInput = fileInputHandle.asElement()
  if (!fileInput) throw new Error("Could not find the POD file input near the OS&D checkbox")
  await fileInput.uploadFile(fixturePath)
  await waitForText(page, "opened a claim file", 20000)
}

async function main() {
  reseed()
  const tmpDir = path.join(OUT, "_tmp")
  mkdirSync(tmpDir, { recursive: true })
  const fixturePath = path.join(tmpDir, "e2e-osd-chip-pod.pdf")
  writeFileSync(fixturePath, "%PDF-1.4\n% minimal fixture for load OS&D chip smoke\n")

  const browser = await launchBrowser()
  const ownerPage = await browser.newPage()
  await ownerPage.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  ownerPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. A load with no OS&D exception shows no chip on its detail page")
  await login(ownerPage, "owner@demo.thind")
  await ownerPage.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(ownerPage, "Search, filter, and manage every load.")
  const cleanLoadHref = await ownerPage.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href") ?? "")
      .find((href) => /^\/hub\/loads\/[0-9a-f-]{36}$/.test(href))
  )
  check(!!cleanLoadHref, `found a seeded load to use as the negative case (${cleanLoadHref})`)
  await ownerPage.goto(`${BASE}${cleanLoadHref}`, { waitUntil: "networkidle2" })
  check(await textGone(ownerPage, "OS&D"), "a load never flagged for OS&D shows no chip")
  await shot(ownerPage, "01-no-chip-before-osd")

  console.log("2. Driver delivers their load and sends POD with OS&D noted (opens draft claim)")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await advanceDriverLoadToDelivered(driverPage)
  await uploadOsdPod(driverPage, fixturePath)
  await shot(driverPage, "02-driver-osd-pod-sent")

  console.log("3. Office finds the new claim on Safety > Claims, follows it back to the load")
  await ownerPage.goto(`${BASE}/hub/safety/claims`, { waitUntil: "networkidle2" })
  await waitForText(ownerPage, "Being worked")
  const claimHref = await ownerPage.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href") ?? "")
      .find((href) => /^\/hub\/safety\/claims\/[0-9a-f-]{36}$/.test(href))
  )
  check(!!claimHref, `draft claim row links to a detail page (${claimHref})`)
  await ownerPage.goto(`${BASE}${claimHref}`, { waitUntil: "networkidle2" })
  const loadHref = await ownerPage.evaluate(() => {
    const panelLabel = [...document.querySelectorAll("p")].find((p) => p.textContent?.trim() === "Load")
    const link = panelLabel?.parentElement?.querySelector("a")
    return link?.getAttribute("href") ?? null
  })
  check(!!loadHref, `claim detail links its load (${loadHref})`)

  console.log("4. Load detail page chips the OS&D flag, linking to this exact claim")
  await ownerPage.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  check(await textAppears(ownerPage, "OS&D"), "flagged load shows the OS&D chip")
  check(await textAppears(ownerPage, "Claim open"), "chip names the claim's open status")
  await shot(ownerPage, "03-load-shows-osd-chip")

  await clickByText(ownerPage, "OS&D", { tag: "a" })
  await ownerPage.waitForFunction(
    (expected) => location.pathname === expected,
    { timeout: 20000 },
    claimHref
  )
  check(ownerPage.url().endsWith(claimHref), "chip navigates to the exact claim the driver flow opened")
  await shot(ownerPage, "04-chip-lands-on-claim")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/service.?worker/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nLoad OS&D chip smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nLoad OS&D chip smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
