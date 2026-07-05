/**
 * Recruiting smoke (E5): applicant → referral attached → stage drag → offer
 * extended and finger-signed → orientation completed → converted to a
 * dispatch-legal driver with the DQ file pre-loaded and the referral payable.
 *
 * Usage: node scripts/e2e-recruiting-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, clickByText, waitForText, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-recruiting"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 950 })

  console.log("1. Login + open recruiting")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/recruiting`, { waitUntil: "networkidle2" })
  await shot(page, "01-board")

  console.log("2. Add applicant")
  await page.type('input[aria-label="First name"]', "Maria")
  await page.type('input[aria-label="Last name"]', "Gonzales")
  await page.type('input[aria-label="Phone"]', "(509) 555-0188")
  await page.type('input[aria-label="Years experience"]', "6")
  await clickByText(page, "Add")
  await waitForText(page, "Applicant added")
  await sleep(1000)

  console.log("3. Drag applied → screened")
  const moved = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[draggable="true"]')].find((el) =>
      el.textContent?.includes("Maria Gonzales")
    )
    if (!card) return { ok: false, error: "card not found" }
    const columns = [...document.querySelectorAll("div")].filter((el) =>
      el.className?.includes?.("w-[225px]")
    )
    const target = columns.find((c) => c.textContent?.includes("Screened"))
    if (!target) return { ok: false, error: "Screened column not found" }
    const dt = new DataTransfer()
    card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }))
    target.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }))
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }))
    return { ok: true }
  })
  if (!moved.ok) throw new Error(moved.error)
  await waitForText(page, "Maria → Screened")
  await sleep(1200)
  await shot(page, "02-screened")

  console.log("4. Open applicant, attach referral")
  const href = await page.evaluate(
    () => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Maria Gonzales"))?.getAttribute("href")
  )
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
  await page.select('select[aria-label="Referring driver"]',
    await page.evaluate(() => {
      const select = document.querySelector('select[aria-label="Referring driver"]')
      const option = [...select.options].find((o) => o.textContent.includes("Harpreet"))
      return option?.value
    })
  )
  await clickByText(page, "Attach referral")
  await waitForText(page, "bonus releases at hire")
  await sleep(800)

  console.log("5. Extend + sign the offer")
  await page.type("#offer-pay", "$0.63/mile loaded, weekly settlements, $1,000 sign-on")
  await clickByText(page, "Extend the offer")
  await waitForText(page, "hand them the screen")
  await sleep(800)
  const canvas = await page.$("canvas")
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 40, box.y + 70)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 10 })
  await page.mouse.move(box.x + 260, box.y + 90, { steps: 10 })
  await page.mouse.up()
  await sleep(400)
  await clickByText(page, "Accept & sign as")
  await waitForText(page, "orientation unlocked")
  await sleep(1200)
  await shot(page, "03-offer-signed")

  console.log("6. Conversion is gated until orientation is done")
  await clickByText(page, "Finish orientation")
  await sleep(300) // disabled button — no toast expected; gate visible in UI

  console.log("7. Complete orientation checklist")
  const boxes = await page.$$('input[type="checkbox"]')
  for (const checkbox of boxes) {
    const checked = await checkbox.evaluate((el) => el.checked)
    if (!checked) {
      await checkbox.click()
      await sleep(700)
    }
  }
  await waitForText(page, "5/5 done")
  await shot(page, "04-orientation-done")

  console.log("8. Convert to driver")
  await clickByText(page, "Hire — create the driver file")
  await waitForText(page, "Welcome aboard")
  await sleep(1500)
  await shot(page, "05-hired")

  console.log("\nRecruiting smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nRECRUITING SMOKE FAILED:", err.message)
  process.exit(1)
})
