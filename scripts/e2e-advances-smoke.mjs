/**
 * Advances workflow smoke test: the driver asks for cash from the PWA at
 * 390px (over-$1,000 requests are refused server-side), the office sees the
 * request land on /hub/money/advances with per-driver exposure math pinned to
 * the cent (seeded $200 EFS advance + both live requests), approve flips
 * pending → outstanding, deny flips pending → cancelled and drops it from
 * exposure, an office-issued advance posts exactly, a dispatcher (money:read,
 * no write/approve) gets a read-only page, and the driver's pay screen
 * reflects the decisions.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — exposure totals
 * assume Harpreet's seeded $200 outstanding advance has not been applied by
 * a settlements run.
 *
 * Usage: node scripts/e2e-advances-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, sleep, failures, check, waitForText, login, makeShot, clickByText, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-advances"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Harpreet Singh (driver@demo.thind) starts with the seeded outstanding
// advance: 20000 cents (EFS code 4417).
//   request A: $150.75 -> 15075 pending (approved below)
//   request B: $60.50  ->  6050 pending (denied below)
// Exposure panel renders fmtCents (whole dollars, rounded);
// per-advance amounts render fmtCentsExact.
const EXPOSURE_BOTH_PENDING = "$411" // 20000 + 15075 + 6050 = 41125
const AWAITING_BOTH = "$211.25 awaiting approval"
const AWAITING_AFTER_APPROVE = "$60.50 awaiting approval"
const EXPOSURE_FINAL = "$351" // 20000 + 15075 after the deny
const OFFICE_ISSUED = { amount: "80.25", exact: "$80.25", reference: "EFS code 9911" }

/** Innertext of the advance list row that contains `needle`. */
const rowText = (page, needle) =>
  page.evaluate((n) => {
    const rows = [...document.querySelectorAll("span")]
      .filter((s) => s.textContent.includes(n))
      .map((s) => s.closest("div.flex.items-center.justify-between"))
      .filter(Boolean)
    return rows[0]?.innerText ?? null
  }, needle)

/** Click Approve/Deny inside the advance row whose text contains `needle`. */
const decideRow = (page, needle, label) =>
  page.evaluate(
    (n, l) => {
      const row = [...document.querySelectorAll("div.flex.items-center.justify-between")].find(
        (d) => d.innerText.includes(n) && d.querySelector(`button[aria-label="${l}"]`)
      )
      const btn = row?.querySelector(`button[aria-label="${l}"]`)
      if (btn) btn.click()
      return Boolean(btn)
    },
    needle,
    label
  )

async function main() {
  reseed()
  const browser = await launchBrowser()

  // ---- Driver at 390px: ask for an advance ----
  const driver = await browser.newPage()
  await driver.setViewport({ width: 390, height: 844 })
  const consoleErrors = []
  driver.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Driver requests an advance from My pay (390px)")
  await login(driver, "driver@demo.thind")
  await driver.goto(`${BASE}/hub/driver/pay`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Ask for an advance")
  await shot(driver, "01-driver-pay")

  // The PWA form keeps its values after a server rejection, so triple-click +
  // Backspace clears any leftovers before typing.
  const fill = async (selector, value) => {
    await driver.click(selector, { clickCount: 3 })
    await driver.keyboard.press("Backspace")
    await driver.type(selector, value)
  }
  const request = async (amount, note) => {
    await clickByText(driver, "Ask for an advance")
    await driver.waitForSelector('input[aria-label="Amount"]', { timeout: 8000 })
    await fill('input[aria-label="Amount"]', amount)
    if (note) await fill('input[aria-label="What for"]', note)
    await clickByText(driver, "Send request")
    await sleep(1500)
  }

  await request("1200", "too much")
  const overLimit = await driver.evaluate(() =>
    document.body.innerText.includes("Over $1,000 — call the office instead")
  )
  check(overLimit, "over-$1,000 request refused server-side")
  // The form stays open on error — abandon it before the real requests.
  await clickByText(driver, "Never mind")

  await request("150.75", "Tires — cash at TA Ontario")
  await waitForText(driver, "Request sent")
  await request("60.50", "Scale tickets")
  await waitForText(driver, "$60.50")
  const driverList = await driver.evaluate(() => document.body.innerText)
  check(driverList.includes("Advance requested — Tires — cash at TA Ontario"), "request A listed as requested")
  check(driverList.includes("$150.75"), "request A shows exact cents ($150.75)")
  check(driverList.includes("$60.50"), "request B shows exact cents ($60.50)")
  await shot(driver, "02-driver-requested")

  // ---- Office at 1440px: exposure, approve, deny, issue ----
  const officeCtx = await browser.createBrowserContext()
  const office = await officeCtx.newPage()
  await office.setViewport({ width: 1440, height: 900 })
  office.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("2. Owner reviews exposure on /hub/money/advances")
  await login(office, "owner@demo.thind")
  await office.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
  await waitForText(office, "Owed by driver")
  let body = await office.evaluate(() => document.body.innerText)
  check(body.includes(EXPOSURE_BOTH_PENDING), `Harpreet exposure ${EXPOSURE_BOTH_PENDING} with both requests pending`)
  check(body.includes(AWAITING_BOTH), `pending subtotal exact (${AWAITING_BOTH})`)
  check(body.includes("DRIVER ASKED"), "driver-requested advances wear the driver-asked pill")
  check(body.includes("EFS code 4417"), "seeded outstanding advance listed")
  await shot(office, "03-office-both-pending")

  console.log("3. Approve $150.75, deny $60.50")
  check(await decideRow(office, "$150.75", "Approve advance"), "approve button on the $150.75 row")
  await waitForText(office, "Approved — deducts on the next settlement")
  await sleep(1200)
  body = await office.evaluate(() => document.body.innerText)
  check(body.includes(AWAITING_AFTER_APPROVE), `pending subtotal drops to ${AWAITING_AFTER_APPROVE}`)
  const approvedRow = await rowText(office, "$150.75")
  check(/outstanding/i.test(approvedRow ?? ""), "$150.75 row now outstanding")

  check(await decideRow(office, "$60.50", "Deny advance"), "deny button on the $60.50 row")
  await waitForText(office, "Denied")
  await sleep(1200)
  body = await office.evaluate(() => document.body.innerText)
  check(body.includes(EXPOSURE_FINAL), `exposure settles at ${EXPOSURE_FINAL} (denied request excluded)`)
  check(!body.includes("awaiting approval"), "no pending money left awaiting approval")
  const deniedRow = await rowText(office, "$60.50")
  check(/cancelled/i.test(deniedRow ?? ""), "$60.50 row now cancelled")
  await shot(office, "04-office-decided")

  console.log("4. Office issues an advance directly")
  await office.select("#adv_driver", await office.evaluate(() => {
    const opts = [...document.querySelectorAll("#adv_driver option")]
    return opts.find((o) => o.textContent.includes("Jasdeep"))?.value ?? opts[1]?.value
  }))
  await office.type("#adv_amount", OFFICE_ISSUED.amount)
  await office.type("#adv_ref", OFFICE_ISSUED.reference)
  await clickByText(office, "Record advance")
  await waitForText(office, "Advance recorded")
  await sleep(1200)
  body = await office.evaluate(() => document.body.innerText)
  check(body.includes(OFFICE_ISSUED.exact), `issued advance posts exactly (${OFFICE_ISSUED.exact})`)
  check(body.includes(OFFICE_ISSUED.reference), "issued advance keeps its EFS reference")
  const issuedRow = await rowText(office, OFFICE_ISSUED.exact)
  check(/outstanding/i.test(issuedRow ?? ""), "issued advance lands outstanding (no approval loop)")
  await shot(office, "05-office-issued")

  // ---- Dispatcher: read-only ----
  console.log("5. Dispatcher sees a read-only advances page")
  const dispatchCtx = await browser.createBrowserContext()
  const dispatch = await dispatchCtx.newPage()
  await dispatch.setViewport({ width: 1440, height: 900 })
  await login(dispatch, "dispatch@demo.thind")
  await dispatch.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
  await waitForText(dispatch, "Advances")
  const dispatchView = await dispatch.evaluate(() => ({
    text: document.body.innerText,
    decideButtons: document.querySelectorAll('button[aria-label="Approve advance"], button[aria-label="Deny advance"]').length,
  }))
  check(!dispatchView.text.includes("Issue advance"), "dispatcher gets no issue-advance form")
  check(dispatchView.decideButtons === 0, "dispatcher gets no approve/deny buttons")
  check(dispatchView.text.includes(EXPOSURE_FINAL), "dispatcher still sees exposure (money:read)")
  await shot(dispatch, "06-dispatcher-readonly")

  // ---- Driver again: decisions reflected ----
  console.log("6. Driver pay screen reflects the decisions (390px)")
  await driver.goto(`${BASE}/hub/driver/pay`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Ask for an advance")
  const driverAfter = await driver.evaluate(() => document.body.innerText)
  check(driverAfter.includes("Advance approved — Tires — cash at TA Ontario"), "approved advance reads approved")
  check(!driverAfter.includes("$60.50"), "denied advance no longer listed")
  await shot(driver, "07-driver-decided")

  await browser.close()

  const realErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("Failed to load resource"))
  check(realErrors.length === 0, `no console errors (${realErrors.length})`)
  if (realErrors.length) realErrors.slice(0, 5).forEach((e) => console.log(`     ${e.slice(0, 160)}`))

  console.log(failures.length === 0 ? "\nAll advances checks passed ✅" : `\n${failures.length} FAILED ❌`)
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Smoke crashed:", err)
  process.exit(1)
})
