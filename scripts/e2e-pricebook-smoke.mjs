/**
 * E2E smoke: accessorial price book workflow (settings → booking).
 *
 * Owner @1440: /hub/settings/pricebook lists the 6 migration defaults;
 * editing Detention's default persists across a reload; adding a new
 * "Chains" entry persists; both show up as quick-add chips on
 * /hub/loads/new and clicking a chip fills the accessorial line with the
 * pricebook default. Dispatcher (no money:write) is redirected away from
 * the pricebook page — permission is enforced by the page guard, not nav.
 *
 * State-consuming (edits Detention, inserts Chains) — reseeds first.
 * Usage: node scripts/e2e-pricebook-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  BASE, login, check, failures, waitForText, waitForPath, makeShot, clickByText, reseed, launchBrowser
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-pricebook"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

reseed()

const browser = await launchBrowser()

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log("Owner: pricebook page")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/settings/pricebook`, { waitUntil: "networkidle2" })
  await waitForText(page, "Accessorial Price Book")
  const body = await page.evaluate(() => document.body.innerText)
  for (const name of ["Detention", "Layover", "TONU", "Stop-off", "Tarp", "Lumper"]) {
    check(body.includes(name), `default entry "${name}" listed`)
  }
  await shot(page, "01-pricebook-defaults")

  console.log("Edit Detention 60 -> 75, save, reload")
  const detentionSel = 'input[aria-label="Detention default amount"]'
  await page.waitForSelector(detentionSel)
  const before = await page.$eval(detentionSel, (el) => el.value)
  check(before === "60.00", `Detention default starts at 60.00 (got ${before})`)
  await page.click(detentionSel, { clickCount: 3 })
  await page.type(detentionSel, "75.00")
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="Detention default amount"]')
    input.closest("div.flex").querySelector("button").click()
  })
  await waitForText(page, "Price book updated")
  await page.goto(`${BASE}/hub/settings/pricebook`, { waitUntil: "networkidle2" })
  await page.waitForSelector(detentionSel)
  const after = await page.$eval(detentionSel, (el) => el.value)
  check(after === "75.00", `Detention default persisted as 75.00 (got ${after})`)

  console.log("Add new entry: Chains, $50, flat")
  await page.type('input[aria-label="Name"]', "Chains")
  await page.type('input[aria-label="Default amount"]', "50")
  await clickByText(page, "Add")
  await waitForText(page, "Price book updated")
  await page.goto(`${BASE}/hub/settings/pricebook`, { waitUntil: "networkidle2" })
  await waitForText(page, "Chains")
  const chainsVal = await page.$eval('input[aria-label="Chains default amount"]', (el) => el.value)
  check(chainsVal === "50.00", `Chains persisted at 50.00 (got ${chainsVal})`)
  await shot(page, "02-pricebook-after-edits")

  console.log("Load form quick-add chips reflect the pricebook")
  await page.goto(`${BASE}/hub/loads/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Chains")
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .map((b) => b.textContent.trim())
      .filter((t) => t.startsWith("+ "))
  )
  check(chips.some((t) => t.includes("Chains") && t.includes("$50")), `Chains chip shows $50 (chips: ${chips.join(", ")})`)
  check(chips.some((t) => t.includes("Detention") && t.includes("$75")), "Detention chip shows edited $75")

  await clickByText(page, "+ Chains")
  await page.waitForFunction(
    () => document.querySelector('input[aria-label="Accessorial label"]')?.value === "Chains",
    { timeout: 8000 }
  )
  const accLabel = await page.$eval('input[aria-label="Accessorial label"]', (el) => el.value)
  const accAmount = await page.$eval('input[aria-label="Accessorial amount"]', (el) => el.value)
  check(accLabel === "Chains", `quick-add filled label (got "${accLabel}")`)
  check(accAmount === "50.00", `quick-add filled amount 50.00 (got "${accAmount}")`)
  await shot(page, "03-loadform-quickadd")

  console.log("Dispatcher is redirected away from the pricebook")
  const dispatchCtx = await browser.createBrowserContext()
  const page2 = await dispatchCtx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}/hub/settings/pricebook`, { waitUntil: "networkidle2" })
  await waitForPath(page2, "/hub")
  // Pathname flips before the Today screen streams in — wait for a body
  // tile, not the always-present "Today" nav label.
  await waitForText(page2, "Unconfirmed drivers")
  const url2 = page2.url()
  const body2 = await page2.evaluate(() => document.body.innerText)
  check(!url2.includes("/settings/pricebook") && !body2.includes("Accessorial Price Book"),
    `dispatcher redirected (landed on ${url2})`)
  await dispatchCtx.close()
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):\n  - ${failures.join("\n  - ")}`)
  process.exit(1)
}
console.log("\nPricebook smoke clean ✔")
