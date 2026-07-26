/**
 * Claims lifecycle end-to-end smoke: the office can finally SEE and work the
 * hub.claims rows the driver OS&D flow auto-opens. Drives the real UI:
 * Safety shows a Claims rollup panel; the claims page starts at its empty
 * state; "Open a claim" files a cargo claim against a seeded load with an
 * amount and a filing deadline inside 30 days; the list shows the working
 * claim with an urgent days-to-file badge; editing the claim to Filed
 * persists and keeps it in "Being worked"; settling it moves it to Resolved;
 * and the Safety rollup counts update at each step.
 *
 * Reseeds demo data first (hub.claims is truncated by the load cascade —
 * verified empty-state depends on it).
 *
 * Usage: node scripts/e2e-claims-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  launchBrowser, BASE, failures, check, login, makeShot, reseed,
  textAppears, textGone, waitForPathAndText, clickByText, realConsoleErrors,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-claims"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

function isoDaysFromNow(days) {
  const d = new Date(Date.now() + days * 86_400_000)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Safety page shows the Claims rollup at 0 open")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  await textAppears(page, "Claims")
  check(await textAppears(page, "0 open"), "safety rollup starts at 0 open claims")
  await shot(page, "01-safety-rollup-zero")

  console.log("2. Claims page renders its empty state")
  await page.goto(`${BASE}/hub/safety/claims`, { waitUntil: "networkidle2" })
  check(await textAppears(page, "No claims on file"), "claims empty state renders")
  await shot(page, "02-claims-empty")

  console.log("3. Open a cargo claim: load, amount, deadline 21 days out")
  await page.goto(`${BASE}/hub/safety/claims/new`, { waitUntil: "networkidle2" })
  await textAppears(page, "Open a claim")
  // Pick the first seeded load in the dropdown.
  const pickedLoad = await page.evaluate(() => {
    const sel = document.querySelector("#claimLoad")
    if (!sel || sel.options.length < 2) return null
    sel.value = sel.options[1].value
    sel.dispatchEvent(new Event("change", { bubbles: true }))
    return sel.options[1].textContent
  })
  check(!!pickedLoad, `seeded load selectable on the claim form (${pickedLoad})`)
  await page.type("#claimAmount", "1250.50")
  const deadline = isoDaysFromNow(21)
  await page.evaluate((value) => {
    const el = document.querySelector("#claimDeadline")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
    setter.call(el, value)
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
  }, deadline)
  check(await textAppears(page, "21 days left to file"), "deadline field talks back with days remaining")
  await page.type("#claimNotes", "Two pallets crushed — E2E smoke claim")
  await shot(page, "03-claim-form-filled")
  await clickByText(page, "Open claim")
  check(await waitForPathAndText(page, "/hub/safety/claims", "Being worked"), "save lands back on the claims list")

  console.log("4. List shows the working claim with amount + urgent deadline badge")
  check(await textAppears(page, "Cargo claim"), "cargo claim row present")
  check(await textAppears(page, "$1,251"), "claimed amount rendered from integer cents")
  check(await textAppears(page, "21d to file"), "urgent (<30d) days-to-file badge shows")
  check(await textAppears(page, "Being worked (1)"), "claim counted as being worked")
  await shot(page, "04-claims-list-open")

  console.log("5. Safety rollup now counts it, with the 30-day warning")
  await page.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  check(await textAppears(page, "1 open"), "safety rollup shows 1 open claim")
  check(
    await textAppears(page, "1 inside 30 days of the filing deadline"),
    "safety rollup warns about the filing deadline"
  )
  await shot(page, "05-safety-rollup-one")

  console.log("6. Edit: mark the claim Filed — persists, stays in Being worked")
  await page.goto(`${BASE}/hub/safety/claims`, { waitUntil: "networkidle2" })
  const detailHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href") ?? "")
      .find((href) => /\/hub\/safety\/claims\/[0-9a-f-]{36}$/.test(href))
  )
  check(!!detailHref, `claim row links to a detail page (${detailHref})`)
  await page.goto(`${BASE}${detailHref}`, { waitUntil: "networkidle2" })
  check(await textAppears(page, "Save changes"), "claim detail page opens")
  check(await textAppears(page, "claim evidence"), "detail links the load as claim evidence")
  await page.select("#claimStatus", "filed")
  await shot(page, "06-claim-detail")
  await clickByText(page, "Save changes")
  check(await waitForPathAndText(page, "/hub/safety/claims", "FILED"), "filed status chip shows after save")
  check(await textAppears(page, "Being worked (1)"), "a filed claim is still being worked")

  console.log("7. Settle it — moves to Resolved and the rollup drops to 0")
  await page.goto(`${BASE}${detailHref}`, { waitUntil: "networkidle2" })
  check(await textAppears(page, "Save changes"), "claim detail page reopens")
  await page.select("#claimStatus", "settled")
  await clickByText(page, "Save changes")
  check(await waitForPathAndText(page, "/hub/safety/claims", "Resolved (1)"), "settled claim lands in Resolved")
  check(await textGone(page, "21d to file"), "no deadline badge once resolved")
  await shot(page, "07-claims-resolved")
  await page.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  check(await textAppears(page, "0 open"), "safety rollup back to 0 open")

  await browser.close()

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/service.?worker/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  if (failures.length) {
    console.error(`\n❌ ${failures.length} failure(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\n✅ claims smoke green")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
