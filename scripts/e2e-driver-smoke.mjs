/**
 * Driver-app smoke test: logs in as the demo driver on a 390×844 viewport and
 * walks the core phone flow — confirm dispatch, arrive/depart taps, facility
 * tip, message dispatch, pay + more screens — saving screenshots along the way.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — step 2 needs the
 * seeded driver's load still sitting in "dispatched, unacknowledged". Other
 * state-consuming smokes (e.g. e2e-safety-smoke's OS&D flow) advance that
 * same load past "dispatched" if they run first in the same session, so
 * without its own reseed this smoke fails on run order alone.
 *
 * Usage: node scripts/e2e-driver-smoke.mjs [outputDir]
 * Requires: npm run dev (or start) on localhost:3000.
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, clickByText, waitForText, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  reseed()
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  try {
    console.log("1. Login as demo driver")
    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    await page.type("#email", "driver@demo.thind")
    await page.type("#password", "ThindDemo1!")
    await shot(page, "01-login")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      page.click('button[type="submit"]'),
    ])
    if (!page.url().includes("/hub/driver")) throw new Error(`Expected /hub/driver, got ${page.url()}`)
    await waitForText(page, "THD-")
    await shot(page, "02-driver-home")

    console.log("2. Confirm dispatch (acknowledge)")
    await clickByText(page, "confirm this dispatch")
    await waitForText(page, "Dispatch confirmed")
    await sleep(1200)
    await shot(page, "03-acknowledged")

    console.log("3. Arrive at the pickup")
    await clickByText(page, "I'm here")
    await waitForText(page, "Arrival recorded")
    await sleep(1500)
    await shot(page, "04-arrived")

    console.log("4. Depart the pickup")
    await clickByText(page, "Leaving now")
    await waitForText(page, "Departure recorded")
    await sleep(1500)
    await shot(page, "05-departed")

    console.log("5. Leave a facility tip (two taps)")
    await clickByText(page, "Leave a tip")
    await waitForText(page, "Tap what applies")
    await clickByText(page, "parking")
    await clickByText(page, "slow")
    await shot(page, "06-facility-tip")
    await clickByText(page, "Save tip")
    await waitForText(page, "every driver after you")
    await sleep(800)

    console.log("6. Message dispatch")
    await page.goto(`${BASE}/hub/driver/messages`, { waitUntil: "networkidle2" })
    await shot(page, "07-messages-list")
    await clickByText(page, "Dispatch / office", { tag: "a" })
    await page.waitForSelector("textarea", { timeout: 10000 })
    await page.type("textarea", "Made the pickup, rolling to Boise. ETA tomorrow 14:00.")
    await clickByText(page, "", { tag: 'button[aria-label="Send"]' })
    await waitForText(page, "Made the pickup")
    await sleep(800)
    await shot(page, "08-chat")

    console.log("7. Pay screen")
    await page.goto(`${BASE}/hub/driver/pay`, { waitUntil: "networkidle2" })
    await shot(page, "09-pay")

    console.log("8. Time off request")
    await page.goto(`${BASE}/hub/driver/timeoff`, { waitUntil: "networkidle2" })
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const nextWeekEnd = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10)
    await page.evaluate((start, end) => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel)
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
        setter.call(el, val)
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }
      setVal("#to-start", start)
      setVal("#to-end", end)
    }, nextWeek, nextWeekEnd)
    await page.type("#to-reason", "Kid's birthday")
    await shot(page, "10-timeoff-form")
    await clickByText(page, "Ask for these days")
    await waitForText(page, "Request sent")
    await sleep(1000)
    await shot(page, "11-timeoff-requested")

    console.log("9. More + docs")
    await page.goto(`${BASE}/hub/driver/more`, { waitUntil: "networkidle2" })
    await shot(page, "12-more")
    await page.goto(`${BASE}/hub/driver/docs`, { waitUntil: "networkidle2" })
    await shot(page, "13-docs")

    console.log("10. Incident report")
    await page.goto(`${BASE}/hub/driver/incident`, { waitUntil: "networkidle2" })
    await page.type("#inc-location", "I-84 EB MP 213, Baker City OR")
    await page.type("#inc-desc", "Deer strike, front bumper damage. Truck drivable. No injuries.")
    await shot(page, "14-incident-form")
    await clickByText(page, "File the report")
    await waitForText(page, "Report filed")
    await sleep(1000)
    await shot(page, "15-after-incident")

    console.log("\nAll driver-app smoke steps passed ✔")
  } catch (err) {
    await shot(page, "ZZ-failure")
    console.error("\nSMOKE TEST FAILED:", err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main()
