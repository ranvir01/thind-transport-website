/**
 * Recruiting smoke (E5): applicant → referral attached → stage drag → offer
 * extended and finger-signed → orientation completed → converted to a
 * dispatch-legal driver with the DQ file pre-loaded and the referral payable.
 *
 * Usage: node scripts/e2e-recruiting-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, clickByText, waitForText, textAppears, textGone, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-recruiting"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 950 })

  console.log("1. Login + open recruiting")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/recruiting`, { waitUntil: "networkidle2" })
  await waitForText(page, "Application to dispatch-legal driver, all in one place — drag between stages.")
  await shot(page, "01-board")

  console.log("2. Add applicant")
  await page.type('input[aria-label="First name"]', "Maria")
  await page.type('input[aria-label="Last name"]', "Gonzales")
  await page.type('input[aria-label="Phone"]', "(509) 555-0188")
  await page.type('input[aria-label="Years experience"]', "6")
  await clickByText(page, "Add")
  // Every mutation on this screen toasts then router.refresh()es; the toast
  // confirms the server commit but the board still shows the old data until
  // the refresh lands, so each step below waits on the DOM change its own
  // refresh causes instead of sleeping through it.
  await waitForText(page, "Applicant added")
  check(await textAppears(page, "Maria Gonzales"), "applicant committed (card rendered on the board)")

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
  // The toast fires before the refresh moves the card; wait for the card to
  // actually sit inside the Screened column before shooting it.
  const screened = await page
    .waitForFunction(
      () => {
        const columns = [...document.querySelectorAll("div")].filter((el) =>
          el.className?.includes?.("w-[225px]")
        )
        const target = columns.find((c) => c.textContent?.includes("Screened"))
        return !!target?.textContent?.includes("Maria Gonzales")
      },
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false)
  check(screened, "stage move committed (card rendered in Screened column)")
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
  // The refresh swaps the attach form for the "Referred by …" banner.
  check(await textGone(page, "Attach referral"), "referral committed (attach form replaced)")

  console.log("5. Extend + sign the offer")
  await page.type("#offer-pay", "$0.63/mile loaded, weekly settlements, $1,000 sign-on")
  await clickByText(page, "Extend the offer")
  await waitForText(page, "hand them the screen")
  // The refresh replaces the offer form with the signature pad; the toast text
  // alone can't prove the canvas is mounted yet.
  const padReady = await page
    .waitForSelector("canvas", { visible: true, timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check(padReady, "offer committed (signature pad rendered)")
  const canvas = await page.$("canvas")
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 40, box.y + 70)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 10 })
  await page.mouse.move(box.x + 260, box.y + 90, { steps: 10 })
  await page.mouse.up()
  // SignaturePad emits onChange on pointerup, which enables the accept button;
  // a click before that lands on a disabled button and is silently lost.
  const signReady = await page
    .waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("Accept & sign as")
        )
        return !!btn && !btn.disabled
      },
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false)
  check(signReady, "signature captured (accept button enabled)")
  await clickByText(page, "Accept & sign as")
  await waitForText(page, "orientation unlocked")
  check(await textAppears(page, "Signed by"), "offer signature committed (Signed by rendered)")
  await shot(page, "03-offer-signed")

  console.log("6. Conversion is gated until orientation is done")
  // The hire button stays disabled (labeled "Finish orientation + signed offer
  // first") — a click no-ops, so assert the gate directly instead of sleeping
  // and hoping nothing happened.
  await clickByText(page, "Finish orientation")
  const gated = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Finish orientation")
    )
    return !!btn?.disabled
  })
  check(gated, "conversion gated (hire button disabled until orientation done)")

  console.log("7. Complete orientation checklist")
  // Each toggle commits then refreshes, and every checkbox is disabled while
  // the write is pending — an early click on the next box is silently lost.
  // Gate each click on the "n/total done" counter advancing, re-querying the
  // handles each pass in case the refresh replaced the nodes.
  const total = (await page.$$('input[type="checkbox"]')).length
  let done = 0
  for (const box of await page.$$('input[type="checkbox"]')) {
    if (await box.evaluate((el) => el.checked)) done++
  }
  while (done < total) {
    const boxes = await page.$$('input[type="checkbox"]')
    let clicked = false
    for (const box of boxes) {
      if (!(await box.evaluate((el) => el.checked))) {
        await box.click()
        clicked = true
        break
      }
    }
    if (!clicked) throw new Error(`orientation counter says ${done}/${total} but no unchecked box found`)
    done++
    check(await textAppears(page, `${done}/${total} done`), `orientation item ${done}/${total} committed`)
  }
  await waitForText(page, "5/5 done")
  await shot(page, "04-orientation-done")

  console.log("8. Convert to driver")
  await clickByText(page, "Hire — create the driver file")
  await waitForText(page, "Welcome aboard")
  // The refresh swaps the convert form for the hired panel.
  check(await textAppears(page, "Hired — driver record created"), "conversion committed (hired panel rendered)")
  await shot(page, "05-hired")

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nRECRUITING SMOKE FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nRecruiting smoke passed ✔")
}

main().catch((err) => {
  console.error("\nRECRUITING SMOKE FAILED:", err.message)
  process.exit(1)
})
