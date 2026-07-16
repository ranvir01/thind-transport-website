/**
 * Planner + Today smoke (E1): the Today huddle renders with real sections;
 * the week grid renders trucks/blocks; a drag-to-reassign hits the same
 * legality wall as dispatch (approved time off blocks the move).
 *
 * Usage: node scripts/e2e-planner-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import path from "node:path"
import { launchBrowser, BASE, sleep, waitForText, login } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-planner"
mkdirSync(OUT, { recursive: true })

/** Synthetic HTML5 drag-and-drop (puppeteer mouse events don't carry DataTransfer). */
async function syntheticDrag(page, sourceSelectorText, targetTruckUnit, targetDayIdx) {
  return page.evaluate(
    ({ sourceSelectorText, targetTruckUnit, targetDayIdx }) => {
      const source = [...document.querySelectorAll('[draggable="true"]')].find((el) =>
        el.textContent?.includes(sourceSelectorText)
      )
      if (!source) return { ok: false, error: `source ${sourceSelectorText} not found` }
      const row = [...document.querySelectorAll("div")].find(
        (el) =>
          el.className?.includes?.("grid items-stretch") &&
          el.textContent?.includes(`#${targetTruckUnit}`)
      )
      if (!row) return { ok: false, error: `truck row #${targetTruckUnit} not found` }
      const cells = row.querySelectorAll(".relative.col-span-7 > div.absolute > div")
      const target = cells[targetDayIdx]
      if (!target) return { ok: false, error: `day cell ${targetDayIdx} not found (${cells.length} cells)` }

      const dt = new DataTransfer()
      source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }))
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }))
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }))
      return { ok: true }
    },
    { sourceSelectorText, targetTruckUnit, targetDayIdx }
  )
}

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 950 })

  console.log("1. Login as dispatcher")
  await login(page, "dispatch@demo.thind")

  console.log("2. Today command center")
  // Dispatchers land on /hub/loadboard since Phase 3 (hubLandingPath) — the
  // Today page lives at /hub and greets with the product mission line.
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await waitForText(page, "first load to last invoice")
  await page.screenshot({ path: path.join(OUT, "01-today.png"), fullPage: true })
  console.log("  📸 01-today")

  console.log("3. Planner grid")
  await page.goto(`${BASE}/hub/planner`, { waitUntil: "networkidle2" })
  await waitForText(page, "Planner")
  await sleep(800)
  await page.screenshot({ path: path.join(OUT, "02-planner.png"), fullPage: true })
  console.log("  📸 02-planner")

  console.log("4. Drag a booked load to another truck/day")
  const reference = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[draggable="true"]')].find((n) => n.textContent?.includes("THD-"))
    return el?.textContent?.match(/THD-\d+/)?.[0] ?? null
  })
  if (!reference) throw new Error("No draggable load block found on the planner")
  console.log(`   dragging ${reference} → truck #106, Friday`)
  const drag = await syntheticDrag(page, reference, "106", 4)
  if (!drag.ok) throw new Error(drag.error)
  await waitForText(page, reference, 5000) // toast mentions the reference
  await sleep(1500)
  await page.screenshot({ path: path.join(OUT, "03-after-drag.png"), fullPage: true })
  console.log("  📸 03-after-drag")

  console.log("5. Mobile 390px sanity: Today + planner scroll")
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await page.screenshot({ path: path.join(OUT, "04-today-mobile.png"), fullPage: true })
  await page.goto(`${BASE}/hub/planner`, { waitUntil: "networkidle2" })
  await page.screenshot({ path: path.join(OUT, "05-planner-mobile.png") })
  console.log("  📸 04/05 mobile")

  console.log("\nPlanner + Today smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nPLANNER SMOKE FAILED:", err.message)
  process.exit(1)
})
