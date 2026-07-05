/**
 * Office comms + tasks smoke test (E3/E4): dispatcher sends an ack-required
 * announcement and a document request, adds and completes a recurring task;
 * the driver signs the announcement; the office sees 100% on the ack report.
 *
 * Usage: node scripts/e2e-office-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, clickByText, waitForText, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-office"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })

  // ---- Office side (desktop) ----
  const office = await browser.newPage()
  await office.setViewport({ width: 1440, height: 900 })
  console.log("1. Office: login as dispatcher")
  await login(office, "dispatch@demo.thind")

  console.log("2. Office: send ack-required announcement")
  await office.goto(`${BASE}/hub/messages/announcements`, { waitUntil: "networkidle2" })
  await office.type("#ann-title", "Winter chain policy")
  await office.type("#ann-body", "Chains required over Snoqualmie starting Nov 1. Check your kit before every run.")
  await clickByText(office, "Send announcement")
  await waitForText(office, "Announcement sent")
  await sleep(800)
  await shot(office, "01-announcement-sent")

  console.log("3. Office: request a POD from Harpreet")
  await office.goto(`${BASE}/hub/drivers`, { waitUntil: "networkidle2" })
  const driverHref = await office.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Harpreet"))?.getAttribute("href")
  )
  if (!driverHref) throw new Error("Driver link not found")
  await office.goto(`${BASE}${driverHref}`, { waitUntil: "networkidle2" })
  await waitForText(office, "Ask for paperwork")
  await clickByText(office, "Send")
  await waitForText(office, "pinned to the driver")
  await sleep(600)
  await shot(office, "02-doc-request-sent")

  console.log("4. Office: add + complete a recurring task")
  await office.goto(`${BASE}/hub/tasks`, { waitUntil: "networkidle2" })
  await office.type('input[aria-label="New task"]', "Morning ops huddle checklist")
  await clickByText(office, "", { tag: 'button[aria-label="More options"]' })
  await office.select('select[aria-label="Repeats"]', "weekdays")
  await office.type('textarea[aria-label="Checklist (one item per line)"]', "Check overnight statuses\nReview unacknowledged dispatches")
  await clickByText(office, "", { tag: 'button[type="submit"]' })
  await waitForText(office, "Recurring task created")
  await sleep(800)
  await shot(office, "03-task-created")
  // Complete OUR task specifically (automation tasks may sit above it).
  await office.evaluate(() => {
    const button = [...document.querySelectorAll('button[aria-label="Mark done"]')].find((b) =>
      b.closest("div.rounded-xl")?.textContent?.includes("Morning ops huddle checklist")
    )
    button?.click()
  })
  await waitForText(office, "next one is already on the list")
  await sleep(800)
  await shot(office, "04-task-recurred")

  // ---- Driver side (phone, isolated session) ----
  const driverContext = await browser.createBrowserContext()
  const driver = await driverContext.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  console.log("5. Driver: sees the announcement pinned, signs it")
  await login(driver, "driver@demo.thind")
  await waitForText(driver, "Winter chain policy")
  await shot(driver, "05-driver-sees-announcement")
  // Draw a signature stroke on the canvas
  const canvas = await driver.$("canvas")
  const box = await canvas.boundingBox()
  await driver.mouse.move(box.x + 30, box.y + 60)
  await driver.mouse.down()
  await driver.mouse.move(box.x + 120, box.y + 40, { steps: 12 })
  await driver.mouse.move(box.x + 200, box.y + 80, { steps: 12 })
  await driver.mouse.up()
  await sleep(300)
  await clickByText(driver, "Sign & acknowledge")
  await waitForText(driver, "Acknowledged")
  await sleep(800)
  await shot(driver, "06-driver-signed")

  console.log("6. Driver: sees the POD request pinned")
  await waitForText(driver, "The office needs something")
  await shot(driver, "07-driver-doc-request")

  console.log("7. Office: ack report shows 100% for drivers... checking")
  await office.goto(`${BASE}/hub/messages/announcements`, { waitUntil: "networkidle2" })
  await clickByText(office, "Winter chain policy", { tag: "a" })
  await waitForText(office, "Acknowledged (")
  await shot(office, "08-ack-report")
  const reportText = await office.evaluate(() => document.body.innerText)
  if (!reportText.includes("Harpreet Singh")) throw new Error("Driver missing from ack report")

  console.log("\nOffice comms + tasks smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nOFFICE SMOKE FAILED:", err.message)
  process.exit(1)
})
