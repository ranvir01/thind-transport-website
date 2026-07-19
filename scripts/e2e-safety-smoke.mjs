/**
 * Safety workflow smoke test — incident register + cargo-claim clock from OS&D POD.
 * The office Safety screen was the last daily office flow without a dedicated
 * smoke: dispatcher sees the seeded DOT accident register (tow-away on I-84),
 * closes a recordable incident, logs a new one, a driver files a first report
 * at 390px, then notes OS&D on a delivered POD (opens the draft claim file and
 * alerts the office), and a driver login is bounced off /hub/safety.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the run closes an
 * incident, adds two more, and advances Harpreet's lumber load through delivery
 * with an OS&D POD upload.
 *
 * Usage: node scripts/e2e-safety-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { BASE, sleep, failures, check, waitForText, waitForPathAndText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-safety"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const SEEDED_REGISTER = "I-84 EB MP 213, Baker City OR"
const SEEDED_MINOR = "Pilot #287, Kent WA"
const OFFICE_INCIDENT = "SMK: gate scrape at Kent yard — cosmetic only"
const DRIVER_INCIDENT_LOC = "I-90 WB near Cle Elum WA"

async function setNativeValue(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
      setter.call(el, v)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    },
    value
  )
}

async function registerCount(page) {
  return page.evaluate(() => {
    const heading = [...document.querySelectorAll("h2")].find((h) =>
      (h.textContent ?? "").includes("DOT accident register")
    )
    const badge = heading?.parentElement?.querySelector("span.rounded-full")
    return Number(badge?.textContent?.trim() ?? "NaN")
  })
}

async function advanceDriverLoadToDelivered(page) {
  await waitForText(page, "THD-")
  await clickByText(page, "confirm this dispatch")
  await waitForText(page, "Dispatch confirmed")
  await sleep(800)

  await clickByText(page, "I'm heading to the pickup")
  await waitForText(page, "Status updated")
  await sleep(800)

  await clickByText(page, "I'm here")
  await waitForText(page, "Arrival recorded")
  await sleep(800)
  await clickByText(page, "Leaving now")
  await waitForText(page, "Departure recorded")
  await sleep(800)

  await clickByText(page, "Loaded — rolling now")
  await waitForText(page, "Status updated")
  await sleep(800)

  await clickByText(page, "I'm here")
  await waitForText(page, "Arrival recorded")
  await sleep(800)
  await clickByText(page, "Leaving now")
  await waitForText(page, "Departure recorded")
  await sleep(800)

  // The arrival/departure waits above can match a still-visible toast from the
  // previous stop, letting the script outrun the server's status commits; under
  // full-suite CPU contention the Delivered button then takes >8s to render.
  await clickByText(page, "Delivered", { timeout: 20000 })
  await waitForText(page, "Status updated")
  const delivered = await page
    .waitForFunction(
      () => document.body.innerText.toLowerCase().includes("delivered — send the pod"),
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false)
  check(delivered, "load is delivered and awaiting POD")
}

/**
 * Scoped to the OS&D checkbox's own card — the driver home also pins an
 * unrelated document-request widget (e.g. "Receipt for THD-1005") with its
 * own hidden file input earlier in the DOM; grabbing the page's first
 * input[type=file] uploads to the wrong load and misreports as "isn't yours".
 */
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
  const fixturePath = path.join(tmpDir, "e2e-safety-pod.pdf")
  writeFileSync(fixturePath, "%PDF-1.4\n% minimal fixture for safety OS&D POD smoke\n")

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Owner opens Safety — DOT register + seeded incidents")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  await waitForText(page, "flow to the register automatically")
  const beforeCount = await registerCount(page)
  check(beforeCount === 1, `DOT register shows 1 recordable incident (got ${beforeCount})`)
  const wall = await page.evaluate(() => document.body.innerText)
  check(wall.includes(SEEDED_REGISTER) && wall.includes("Robert Castillo"), "register lists the seeded Baker City tow-away")
  check(wall.includes(SEEDED_MINOR), "all-incidents list includes the minor Kent bollard scrape")
  check(wall.includes("Tow-away") || wall.toLowerCase().includes("tow"), "register shows tow-away flag")
  await shot(page, "01-safety-register")

  console.log("2. Close the seeded DOT-recordable incident (stays on the register)")
  await clickByText(page, SEEDED_REGISTER, { tag: "a" })
  await waitForText(page, "Three questions that decide")
  await page.select("#status", "closed")
  await clickByText(page, "Save changes")
  await waitForText(page, "Incident updated")
  await sleep(1200)
  await page.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  const afterCloseWall = await page.evaluate(() => document.body.innerText)
  check(afterCloseWall.toLowerCase().includes("closed"), "closed incident shows Closed status on Safety")
  check((await registerCount(page)) === 1, "DOT register still lists the recordable incident after close (390.15 retention)")
  await shot(page, "02-incident-closed")

  console.log("3. Log a new non-recordable incident from the office")
  await page.goto(`${BASE}/hub/safety/new`, { waitUntil: "networkidle2" })
  await waitForText(page, "Log an incident")
  await setNativeValue(page, "#occurredAt", new Date().toISOString().slice(0, 16))
  await page.type("#location", OFFICE_INCIDENT)
  await page.type("#description", "Backed into a gate post at 5 mph. No injuries, truck drivable.")
  await clickByText(page, "Log incident")
  await waitForText(page, "Incident logged")
  // The form router.push()es back to /hub/safety after the toast; wait for
  // the register itself to show the new incident.
  check(await waitForPathAndText(page, "/hub/safety", OFFICE_INCIDENT), "new office incident appears on Safety")
  await shot(page, "03-office-incident-logged")

  console.log("4. Driver files a first report at 390px")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/driver/incident`, { waitUntil: "networkidle2" })
  await waitForText(driverPage, "Report an incident")
  await driverPage.type("#inc-location", DRIVER_INCIDENT_LOC)
  await driverPage.type("#inc-desc", "Deer strike — bumper damage only. Everyone safe, truck drivable.")
  await clickByText(driverPage, "File the report")
  await waitForText(driverPage, "Report filed")
  await sleep(1000)
  await shot(driverPage, "04-driver-incident-filed")

  console.log("5. Driver delivers lumber load and sends POD with OS&D (opens claim file)")
  await driverPage.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await advanceDriverLoadToDelivered(driverPage)
  await uploadOsdPod(driverPage, fixturePath)
  await shot(driverPage, "05-osd-pod-sent")

  console.log("6. Dispatcher sees the draft-claim alert in notifications")
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await page.waitForSelector('button[aria-label^="Notifications"]', { timeout: 20000 })
  await page.click('button[aria-label^="Notifications"]')
  await page
    .waitForFunction(() => document.body.innerText.toLowerCase().includes("draft claim"), { timeout: 20000 })
    .catch(() => {})
  const notify = await page.evaluate(() => document.body.innerText)
  check(notify.toLowerCase().includes("draft claim"), "notification mentions the draft claim opened from OS&D POD")
  check(notify.includes("THD-"), "notification references the load")
  await shot(page, "06-draft-claim-notification")

  console.log("7. Driver cannot reach the office Safety screen")
  await driverPage.goto(`${BASE}/hub/safety`, { waitUntil: "networkidle2" })
  await driverPage
    .waitForFunction(() => location.pathname !== "/hub/safety", { timeout: 20000 })
    .catch(() => {})
  const blocked = await driverPage.evaluate(() => ({
    url: location.pathname,
    seesRegister: document.body.innerText.includes("DOT accident register"),
  }))
  check(blocked.url !== "/hub/safety", `driver redirected away from Safety (at ${blocked.url})`)
  check(!blocked.seesRegister, "driver never sees the accident register")
  await shot(driverPage, "07-driver-blocked")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nSafety smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nSafety smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
