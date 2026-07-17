/**
 * Public recruiting-conversion smoke: /pre-qualify and /apply — the two
 * surfaces that turn a visiting CDL driver into a submitted application
 * (AGENTS.md calls this the primary business goal), yet the only public
 * flows with zero automated coverage: e2e-sweep and every role smoke log
 * into /hub, and prod-smoke only pings /hub/login.
 *
 * Drives, at 390px (drivers apply from phones):
 *   1. /pre-qualify happy path — all 8 text fields + all 10 Radix selects,
 *      submit, expect the "Congratulations! You Pre-Qualify" result card.
 *   2. /pre-qualify manual-review path — same form with SAP Driver = Yes,
 *      expect the "Thank You for Your Interest" review card (the
 *      checkQualification disqualifier branch).
 *   3. /apply full 4-step wizard — qualify radios → contact → details →
 *      docs (uploads optional) → submit → "Thank You for Submitting Your
 *      Info" success step. Step 2→3 also fires the captureLead action.
 *
 * Persistence caveat: the public actions write through src/lib/driver-db.ts,
 * which with POSTGRES_URL set routes to @vercel/postgres (Neon HTTP driver)
 * and therefore CANNOT reach the local rig's plain Postgres (known pitfall —
 * dev-workflow-testing skill #7). Both actions swallow the persist error and
 * still return success, so this smoke verifies the user-visible flow, not
 * the row. It also means a prod outage of BOTH Postgres and SMTP would lose
 * leads silently — flagged in the repo backlog, asserted nowhere.
 *
 * No reseed(): these flows touch legacy tables / email only, never hub.*.
 *
 * Usage: node scripts/e2e-apply-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000 (no DB needed for the UI flow).
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, check, failures, makeShot, clickByText, waitForText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-apply"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

/** Open the nth Radix Select (button[role=combobox]) and pick the option with exact text. */
async function pickSelect(page, index, optionText) {
  const deadline = Date.now() + 10000
  let lastErr
  while (Date.now() < deadline) {
    try {
      const triggers = await page.$$('button[role="combobox"]')
      if (index >= triggers.length) throw new Error(`only ${triggers.length} comboboxes on page`)
      // Center the trigger first: at 390px the fixed mobile command bar can
      // cover an edge-scrolled trigger and swallow the click.
      await triggers[index].evaluate((n) => n.scrollIntoView({ block: "center" }))
      await sleep(150)
      await triggers[index].click()
      await page.waitForSelector('[role="option"]', { visible: true, timeout: 3000 })
      const picked = await page.evaluate((text) => {
        const opt = [...document.querySelectorAll('[role="option"]')].find(
          (n) => (n.textContent ?? "").trim() === text
        )
        if (!opt) return false
        // Radix listens on pointerup/click; dispatch both for reliability.
        opt.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
        opt.click()
        return true
      }, optionText)
      if (!picked) throw new Error(`option "${optionText}" not found`)
      // Wait for the portal to close so the next trigger index is stable.
      await page.waitForFunction(() => !document.querySelector('[role="option"]'), { timeout: 3000 })
      return
    } catch (err) {
      lastErr = err
      await page.keyboard.press("Escape").catch(() => {})
      await sleep(300)
    }
  }
  throw new Error(`pickSelect #${index} "${optionText}": ${lastErr?.message}`)
}

async function fill(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 })
  await page.click(selector, { clickCount: 3 })
  await page.type(selector, value)
}

/** Click the (sr-only-radio) label whose text contains `text`. */
async function clickRadioLabel(page, text) {
  await clickByText(page, text, { tag: "label" })
}

const PREQUALIFY_TEXT = [
  ["#firstName", "Test"],
  ["#lastName", "Driver"],
  ["#phone", "2065551234"],
  ["#email", "e2e-prequalify@example.com"],
  ["#cityState", "Kent, WA"],
  ["#cdlExperience", "5 years"],
  ["#homeTimeDuration", "Weekly"],
  ["#jobsInLast3Years", "2"],
]

// DOM order of the 10 Radix selects on /pre-qualify.
const QUALIFIED_PICKS = [
  "Yes", // ownSleeperTruck
  "Yes", // canDriveManual
  "Yes", // paidBiMonthly
  "Yes", // runLower40
  "Yes", // runWaToAnywhere
  "No", // hasRiderOrPet
  "No", // isSapDriver
  "No", // hasFelony
  "None", // accident5Year
  "None", // movingViolations5Year
]

async function drivePreQualify(page, picks, expectText, label) {
  await page.goto(`${BASE}/pre-qualify`, { waitUntil: "networkidle2" })
  await waitForText(page, "Driver Pre-Qualification")
  for (const [sel, val] of PREQUALIFY_TEXT) await fill(page, sel, val)
  for (let i = 0; i < picks.length; i++) await pickSelect(page, i, picks[i])
  await clickByText(page, "Submit Pre-Qualification")
  let ok = true
  try {
    await waitForText(page, expectText, 20000)
  } catch {
    ok = false
  }
  check(ok, `${label}: "${expectText}" card shown`)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  // ---- 1. Pre-qualify, qualified driver ----
  console.log("Pre-qualify @ 390px — qualified path")
  await drivePreQualify(page, QUALIFIED_PICKS, "Congratulations! You Pre-Qualify", "pre-qualify qualified")
  const applyCta = await page.evaluate(() =>
    [...document.querySelectorAll('a[href="/apply"]')].some((a) => /full application/i.test(a.textContent ?? ""))
  )
  check(applyCta, "qualified card links to /apply (Complete Full Application)")
  await shot(page, "prequalify-qualified-390")

  // ---- 2. Pre-qualify, SAP driver → manual review ----
  console.log("Pre-qualify @ 390px — manual-review path (SAP driver)")
  const reviewPicks = [...QUALIFIED_PICKS]
  reviewPicks[6] = "Yes" // isSapDriver — critical disqualifier
  await drivePreQualify(page, reviewPicks, "Thank You for Your Interest", "pre-qualify manual review")
  await shot(page, "prequalify-review-390")

  // ---- 3. /apply 4-step wizard ----
  console.log("Apply wizard @ 390px — 4 steps to submitted")
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle2" })
  await waitForText(page, "Step 1 of 4")

  const noHscroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  )
  check(noHscroll, "apply page: no horizontal scroll at 390px")

  // Step 1: qualify
  await clickRadioLabel(page, "Company Driver")
  await clickRadioLabel(page, "Class A")
  await clickRadioLabel(page, "3-5 Years")
  await clickByText(page, "Continue Application")
  await waitForText(page, "Step 2 of 4")
  check(true, "step 1 (qualify) advances")

  // Step 2: contact — advancing fires captureLead
  await fill(page, "#firstName", "Test")
  await fill(page, "#lastName", "Applicant")
  await fill(page, "#email", "e2e-apply@example.com")
  await fill(page, "#phone", "2065556789")
  await clickByText(page, "Continue Application")
  await waitForText(page, "Step 3 of 4", 20000)
  check(true, "step 2 (contact) advances through captureLead")

  // Step 3: details
  await fill(page, "#cdlNumber", "WDL1234567")
  await fill(page, "#previousEmployer", "Example Freight LLC")
  await page.select("#availability", "immediate")
  await clickRadioLabel(page, "Regional")
  await clickByText(page, "Continue Application")
  await waitForText(page, "Step 4 of 4")
  check(true, "step 3 (details) advances")

  // Step 4: docs are optional — submit
  await waitForText(page, "You're Almost Done!")
  await clickByText(page, "Submit Application")
  let submitted = true
  try {
    await waitForText(page, "Thank You for Submitting Your Info", 25000)
  } catch {
    submitted = false
  }
  check(submitted, "application submits to the success step")
  await shot(page, "apply-submitted-390")

  const realErrors = consoleErrors.filter(
    (e) => !/favicon|404|Failed to load resource/i.test(e)
  )
  check(realErrors.length === 0, `no browser console errors (${realErrors.length})`)
  if (realErrors.length) realErrors.slice(0, 5).forEach((e) => console.log(`    · ${e.slice(0, 200)}`))

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed:`)
    failures.forEach((f) => console.error(`  ✗ ${f}`))
    process.exit(1)
  }
  console.log("\nApply/pre-qualify conversion smoke green ✔")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
