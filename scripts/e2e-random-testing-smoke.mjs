/**
 * Random drug & alcohol testing pool smoke (49 CFR 382.305): carrier
 * settings already carried randomTesting.drugPct/alcoholPct, but nothing
 * ever read them before this feature — this drives the real gap end to end.
 * A dispatcher opens the new /hub/compliance/random-testing page, runs the
 * quarterly selection for both test types (idempotent — a second run tops
 * up rather than re-selecting), sees selected drivers get notified, and
 * records a completed result. Also asserts a second selection run is a
 * no-op once the quarter's pool is full.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-random-testing-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  launchBrowser, BASE, failures, check, waitForText, textAppears, textGone,
  login, makeShot, clickByText, clickSelector, reseed, IGNORABLE_CONSOLE_ERROR,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-random-testing"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const readPoolCounts = (page) =>
  page.evaluate(() => {
    const text = document.body.innerText
    const matches = [...text.matchAll(/(\d+) \/ (\d+) selected this quarter/g)]
    return matches.map((m) => ({ selected: Number(m[1]), target: Number(m[2]) }))
  })

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Dispatch opens Compliance and finds the Random testing entry point")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/compliance`, { waitUntil: "networkidle2" })
  await waitForText(page, "Compliance")
  check(await textAppears(page, "Random testing"), "compliance wall links to Random testing")

  await clickByText(page, "Random testing", { tag: "a" })
  await page.waitForFunction(() => location.pathname === "/hub/compliance/random-testing", { timeout: 10000 })
  await waitForText(page, "Random testing —")
  await shot(page, "01-empty-pool")

  const before = await readPoolCounts(page)
  check(before.length === 2, `two pool tiles rendered (drug, alcohol) — got ${before.length}`)
  check(before[0].selected === 0 && before[1].selected === 0, "no one selected yet this fresh quarter (reseed wiped prior events)")
  check(before[0].target > 0 || before[1].target > 0, "at least one pool has a nonzero target (seeded active drivers exist)")

  console.log("2. Run drug selection — pool fills and drivers get notified")
  await clickByText(page, "Run drug selection")
  await waitForText(page, "pool updated and drivers notified")
  await shot(page, "02-drug-selected")

  console.log("3. Run alcohol selection")
  await clickByText(page, "Run alcohol selection")
  await waitForText(page, "pool updated and drivers notified")

  await page.reload({ waitUntil: "networkidle2" })
  const afterFirstRun = await readPoolCounts(page)
  check(
    afterFirstRun[0].selected === afterFirstRun[0].target && afterFirstRun[0].selected > 0,
    `drug pool fully selected after one run (${afterFirstRun[0].selected}/${afterFirstRun[0].target})`
  )
  const eventRows = await page.evaluate(() => document.body.innerText.match(/— DRUG|— ALCOHOL/g)?.length ?? 0)
  check(eventRows > 0, `event list shows selected driver rows (${eventRows})`)
  check(await textAppears(page, "notified"), "at least one event row shows the notified status/marker")
  await shot(page, "03-both-pools-filled")

  console.log("4. Re-running selection on a full pool is a no-op (idempotent)")
  await clickByText(page, "Run drug selection")
  await waitForText(page, "Nothing to select")
  await shot(page, "04-rerun-noop")

  console.log("5. Record a completed result on the first selected driver")
  await clickByText(page, "Record result")
  await page.waitForSelector("form select", { visible: true, timeout: 8000 })
  await page.select("form select", "completed")
  const selects = await page.$$("form select")
  if (selects.length > 1) await selects[1].select("negative")
  await page.type('form input[placeholder*="Collection site"]', "Kent WA collection site, COC #E2E-12345")
  await clickSelector(page, 'form button[type="submit"]')
  await waitForText(page, "Result recorded")
  await shot(page, "05-result-recorded")

  await page.reload({ waitUntil: "networkidle2" })
  check(await textAppears(page, "negative"), "recorded result (negative) now shows on the event row")
  check(await textAppears(page, "completed"), "event status flipped to completed")

  console.log("6. Driver login cannot reach the office random-testing page")
  const ctx = await browser.createBrowserContext()
  const page2 = await ctx.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "driver@demo.thind")
  await page2.goto(`${BASE}/hub/compliance/random-testing`, { waitUntil: "networkidle2" })
  const redirected = await page2
    .waitForFunction(() => !location.pathname.startsWith("/hub/compliance"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check(redirected, `driver redirected away from random-testing (at ${page2.url()})`)

  console.log("7. 390px layout check — table doesn't overflow the viewport")
  await page.setViewport({ width: 390, height: 844 })
  await page.reload({ waitUntil: "networkidle2" })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(overflow <= 1, `no horizontal overflow at 390px (excess ${overflow}px)`)
  await shot(page, "06-390px")

  const realErrors = consoleErrors.filter((e) => !IGNORABLE_CONSOLE_ERROR.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nRandom testing smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nRandom testing smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
