/**
 * DVIR smoke (49 CFR 396.11/.13): driver files a post-trip with an unsafe
 * defect → truck grounded + work order; office certifies the repair; the
 * next pre-trip review sign-off releases the truck to 'active'.
 *
 * Usage: node scripts/e2e-dvir-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, clickByText, waitForText, textAppears, waitForPath, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-dvir"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

/**
 * Draw a signature stroke, then wait for `fileButtonText`'s button to enable —
 * SignaturePad emits onChange on pointerup, and a click before that lands on a
 * disabled button and is silently lost (same race the office/recruiting
 * smokes guard against). `behavior: "instant"` on scrollIntoView sidesteps the
 * global `scroll-behavior: smooth` CSS so the canvas's boundingBox is correct
 * the instant scrollIntoView returns, instead of racing its scroll animation.
 */
async function sign(page, fileButtonText) {
  const canvas = await page.$("canvas")
  await canvas.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }))
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 30, box.y + 60)
  await page.mouse.down()
  await page.mouse.move(box.x + 150, box.y + 40, { steps: 10 })
  await page.mouse.move(box.x + 240, box.y + 80, { steps: 10 })
  await page.mouse.up()
  await page
    .waitForFunction(
      (text) => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(text))
        return !!btn && !btn.disabled
      },
      { timeout: 20000 },
      fileButtonText
    )
    .catch(() => { throw new Error(`"${fileButtonText}" stayed disabled after drawing a signature`) })
}

async function main() {
  const browser = await launchBrowser()

  // Driver: post-trip with an unsafe brake defect
  const driverCtx = await browser.createBrowserContext()
  const driver = await driverCtx.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  console.log("1. Driver files a defective post-trip")
  await login(driver, "driver@demo.thind")
  await driver.goto(`${BASE}/hub/driver/dvir`, { waitUntil: "networkidle2" })
  await waitForText(driver, "End-of-day inspection")
  // Mark "Service brakes" as a problem
  await driver.evaluate(() => {
    const row = [...document.querySelectorAll("li")].find((li) => li.textContent?.includes("Service brakes"))
    const problem = [...row.querySelectorAll("button")].find((b) => b.textContent === "Problem")
    problem.click()
  })
  await driver.waitForSelector("li input", { visible: true, timeout: 8000 })
  await driver.type("li input", "Air leak, pressure drops fast")
  await waitForText(driver, "Is the truck still safe to drive?")
  await clickByText(driver, "No — park it")
  await shot(driver, "01-post-trip-defect")
  await sign(driver, "File the post-trip")
  await clickByText(driver, "File the post-trip")
  await waitForText(driver, "truck is grounded")
  if (!(await waitForPath(driver, "/hub/driver"))) throw new Error("post-trip form did not return to the driver home after grounding the truck")
  console.log("   defect filed, truck grounded ✓")

  // Office: sees grounded truck, certifies the repair
  const office = await browser.newPage()
  await office.setViewport({ width: 1440, height: 950 })
  console.log("2. Office certifies the repair")
  await login(office, "dispatch@demo.thind")
  await office.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  const truckHref = await office.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href")?.includes("/hub/fleet/trucks/") && a.textContent?.includes("101"))
    return link?.getAttribute("href")
  })
  await office.goto(`${BASE}${truckHref}`, { waitUntil: "networkidle2" })
  await waitForText(office, "Grounded — defects awaiting repair certification")
  await shot(office, "02-grounded")
  await office.type('input[aria-label="Repair vendor"]', "Petes Truck Service")
  await office.type('input[aria-label="Repair cost"]', "485.00")
  await office.type('input[aria-label="Repair notes"]', "Replaced air line + fitting, leak test passed")
  await clickByText(office, "Certify the repair")
  await waitForText(office, "pre-trip sign-off releases the truck")
  // The toast fires on the certify action's own resolution, before
  // router.refresh() re-renders the truck panel from the DB — wait for the
  // panel's persistent (not toast) copy so the next screenshot and the
  // driver's reload both see the certified state, not a stale "Grounded" one.
  if (!(await textAppears(office, "waiting on the next driver's pre-trip sign-off"))) throw new Error("repair certification did not refresh the truck panel to awaiting_review")
  await shot(office, "03-certified")

  // Driver: pre-trip review releases the truck
  console.log("3. Driver pre-trip review releases the truck")
  await driver.goto(`${BASE}/hub/driver/dvir`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Review before you roll")
  await waitForText(driver, "Repairs certified by")
  await shot(driver, "04-pre-trip-review")
  await sign(driver, "File the pre-trip")
  await clickByText(driver, "File the pre-trip")
  await waitForText(driver, "Inspection filed")
  if (!(await waitForPath(driver, "/hub/driver"))) throw new Error("pre-trip form did not return to the driver home after filing")

  // Verify the truck is active again
  await office.reload({ waitUntil: "networkidle2" })
  const status = await office.evaluate(() => {
    const select = document.querySelector('select#status, select[name="status"]')
    if (select) return select.value
    return document.body.innerText.includes("Grounded") ? "still-grounded" : "released"
  })
  console.log(`   truck state after sign-off: ${status}`)
  await shot(office, "05-released")
  if (status === "still-grounded" || status === "shop") throw new Error("Truck was not released")

  console.log("\nDVIR loop smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nDVIR SMOKE FAILED:", err.message)
  process.exit(1)
})
