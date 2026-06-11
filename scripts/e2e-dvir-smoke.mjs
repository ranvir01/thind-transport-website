/**
 * DVIR smoke (49 CFR 396.11/.13): driver files a post-trip with an unsafe
 * defect → truck grounded + work order; office certifies the repair; the
 * next pre-trip review sign-off releases the truck to 'active'.
 *
 * Usage: node scripts/e2e-dvir-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import path from "node:path"

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const OUT = process.argv[2] ?? "e2e-shots-dvir"
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickByText(page, text, { tag = "button", timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const clicked = await page.evaluate(
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
    if (clicked) return true
    await sleep(250)
  }
  throw new Error(`Could not find ${tag} containing "${text}"`)
}

async function waitForText(page, text, timeout = 10000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text
  )
}

async function sign(page) {
  const canvas = await page.$("canvas")
  await canvas.evaluate((el) => el.scrollIntoView({ block: "center" }))
  await sleep(400)
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 30, box.y + 60)
  await page.mouse.down()
  await page.mouse.move(box.x + 150, box.y + 40, { steps: 10 })
  await page.mouse.move(box.x + 240, box.y + 80, { steps: 10 })
  await page.mouse.up()
  await sleep(300)
}

async function login(page, email) {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
  await page.type("#email", email)
  await page.type("#password", "ThindDemo1!")
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
    page.click('button[type="submit"]'),
  ])
}

const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log(`  📸 ${name}`)
}

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })

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
  await sleep(300)
  await driver.type("li input", "Air leak, pressure drops fast")
  await waitForText(driver, "Is the truck still safe to drive?")
  await clickByText(driver, "No — park it")
  await shot(driver, "01-post-trip-defect")
  await sign(driver)
  await clickByText(driver, "File the post-trip")
  await waitForText(driver, "truck is grounded")
  await sleep(1000)
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
  await sleep(1000)
  await shot(office, "03-certified")

  // Driver: pre-trip review releases the truck
  console.log("3. Driver pre-trip review releases the truck")
  await driver.goto(`${BASE}/hub/driver/dvir`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Review before you roll")
  await waitForText(driver, "Repairs certified by")
  await shot(driver, "04-pre-trip-review")
  await sign(driver)
  await clickByText(driver, "File the pre-trip")
  await waitForText(driver, "Inspection filed")
  await sleep(1200)

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
