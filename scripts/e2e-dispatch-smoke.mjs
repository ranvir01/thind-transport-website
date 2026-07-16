/**
 * Dispatch board workflow smoke test: the board renders every status column
 * with the seeded legality stop visible; a legal booked load advances to
 * Dispatched; a load whose driver has an expired medical card is refused
 * server-side (f4a43d2); cancellation goes through the confirm flow and the
 * cancel-only status action (5656a5f); an accountant (no loads:status) is
 * refused by requirePermission when clicking Advance.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run advances the
 * legal booked load and cancels another.
 *
 * Usage: node scripts/e2e-dispatch-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, sleep, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-dispatch"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

/**
 * Board geography: each status column is a <section> whose <h2> is the label;
 * each card is itself a <section class="rounded-card"> (the Panel component).
 * Identify cards by unique innerText (origin → dest from the seed) instead of
 * THD refs, which renumber if the seed grows.
 */
const boardCard = (marker) => {
  const cards = [...document.querySelectorAll("section.rounded-card")]
    .filter((c) => c.querySelector("a[href^='/hub/loads/']"))
  for (const card of cards) {
    if (card.innerText.toLowerCase().includes(marker.toLowerCase())) {
      const column =
        card.parentElement.closest("section")?.querySelector("h2")?.textContent?.trim() ?? null
      return { column, card }
    }
  }
  return null
}

const findColumn = (page, marker) =>
  page.evaluate((m, fn) => {
    const found = new Function(`return (${fn})`)()(m)
    return found ? found.column : null
  }, marker, boardCard.toString())

const clickAdvance = (page, marker) =>
  page.evaluate((m, fn) => {
    const found = new Function(`return (${fn})`)()(m)
    if (!found) return false
    const btn = found.card.querySelector("button")
    if (!btn) return false
    btn.click()
    return true
  }, marker, boardCard.toString())

const cardHref = (page, marker) =>
  page.evaluate((m, fn) => {
    const found = new Function(`return (${fn})`)()(m)
    return found?.card.querySelector("a[href^='/hub/loads/']")?.getAttribute("href") ?? null
  }, marker, boardCard.toString())

async function clickByText(page, text, tag = "button") {
  return page.evaluate(
    ({ text, tag }) => {
      const el = [...document.querySelectorAll(tag)].find((n) =>
        (n.textContent ?? "").toLowerCase().includes(text.toLowerCase())
      )
      if (el) {
        el.click()
        return true
      }
      return false
    },
    { text, tag }
  )
}

// Seed fixtures (scripts/seed-demo.mjs): the legal booked load runs Kent →
// Sacramento; the booked load with driver 5 (expired medical card) runs
// Portland → Boise. Other loads also end in Boise, so the illegal marker
// keeps the origin state to stay unique on the board.
const LEGAL = "Sacramento"
const ILLEGAL = "Portland, OR → Boise"

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Dispatcher opens the board")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page, "Dispatch Board")
  check((await findColumn(page, LEGAL)) === "Booked", `${LEGAL} load starts in Booked`)
  check((await findColumn(page, ILLEGAL)) === "Booked", `${ILLEGAL} load starts in Booked`)
  const stopShown = await page.evaluate(
    () => document.body.innerText.toLowerCase().includes("medical card expired")
  )
  check(stopShown, "board shows the expired-medical-card hard stop")
  await shot(page, "01-board-before")

  console.log("2. Advance the legal booked load")
  check(await clickAdvance(page, LEGAL), `clicked Advance on the ${LEGAL} card`)
  await waitForText(page, "Moved to Dispatched")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  check((await findColumn(page, LEGAL)) === "Dispatched", `${LEGAL} load is now in Dispatched`)
  await shot(page, "02-board-advanced")

  console.log("3. Server refuses to dispatch the expired-medical-card load")
  check(await clickAdvance(page, ILLEGAL), `clicked Advance on the ${ILLEGAL} card`)
  await waitForText(page, "medical card expired")
  await sleep(1000)
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  check((await findColumn(page, ILLEGAL)) === "Booked", `${ILLEGAL} load stayed in Booked`)
  await shot(page, "03-board-refused")

  console.log("4. Cancel the stopped load through the confirm flow")
  const href = await cardHref(page, ILLEGAL)
  check(!!href, `found detail link for the ${ILLEGAL} load (${href})`)
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
  check(await clickByText(page, "Cancel load"), "Cancel load opens the confirm step")
  await waitForText(page, "Confirm cancel")
  await shot(page, "04-cancel-confirm")
  check(await clickByText(page, "Confirm cancel"), "confirmed the cancellation")
  await waitForText(page, "Load cancelled")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page, "Dispatch Board")
  check((await findColumn(page, ILLEGAL)) === null, `${ILLEGAL} load left the active board`)
  await shot(page, "05-board-after-cancel")

  console.log("5. Accountant (loads:read only) is refused server-side")
  // A fresh context: the accountant must not inherit the dispatcher session.
  const context2 = await browser.createBrowserContext()
  const page2 = await context2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "accounting@demo.thind")
  await page2.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Dispatch Board")
  const beforeCol = await findColumn(page2, LEGAL)
  check(await clickAdvance(page2, LEGAL), "accountant clicked Advance")
  await waitForText(page2, "Forbidden")
  await sleep(1000)
  await page2.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  check((await findColumn(page2, LEGAL)) === beforeCol, "load did not move for the accountant")
  await shot(page2, "06-board-accountant")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nDispatch smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDispatch smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
