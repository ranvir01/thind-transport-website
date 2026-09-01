/**
 * Messages thread reply smoke test: the office↔driver conversation loop that
 * e2e-office-smoke never covered (it only drives announcements/tasks). A
 * dispatcher opens the direct thread from the Messages list at 1440px, fills
 * the composer from a template chip, and sends a marker message; the driver
 * PWA at 390px shows the unread badge, opens the thread, and replies; the
 * office list then shows the reply unread, the thread shows the reply bubble
 * and the "Seen by" receipt. Driver logins are refused the office messages
 * routes (list and thread deep link).
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs) — the list check pins
 * the seeded "lumper receipt" preview as the last message, and a prior run's
 * markers replace it and leave stale unread badges.
 *
 * Usage: node scripts/e2e-messages-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-messages"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const COMPOSER = 'textarea[placeholder="Type a message…"]'
const SEND_BTN = 'button[aria-label="Send"]'

/** Native setter + input event so React's value tracker sees a real edit. */
async function setComposer(page, value) {
  await page.$eval(
    COMPOSER,
    (el, next) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set
      setter.call(el, next)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    },
    value
  )
}

/**
 * Fill the ChatThread composer and press Send.
 *
 * The textarea is React-controlled (`value={body}`; Send is
 * `disabled={pending || !body.trim()}`). After a template chip, React
 * `body` is already non-empty so Send is already enabled. Setting the
 * marker in the DOM and waiting for `ta.value === marker && !btn.disabled`
 * can pass before onChange flushes — click then send()s the chip text,
 * and waitForText(marker) times out. Empty first and wait until Send is
 * disabled so the next "enabled" transition means React holds `text`.
 */
async function sendChat(page, text) {
  await page.waitForSelector(COMPOSER)
  await setComposer(page, "")
  await page.waitForFunction(() => {
    const ta = document.querySelector('textarea[placeholder="Type a message…"]')
    const btn = document.querySelector('button[aria-label="Send"]')
    return ta?.value === "" && btn?.disabled === true
  }, { timeout: 8000 })
  await setComposer(page, text)
  await page.waitForFunction(
    (expected) => {
      const ta = document.querySelector('textarea[placeholder="Type a message…"]')
      const btn = document.querySelector('button[aria-label="Send"]')
      return ta?.value === expected && btn && !btn.disabled
    },
    { timeout: 8000 },
    text
  )
  await page.click(SEND_BTN)
  await waitForText(page, text)
  await page
    .waitForFunction(() => document.querySelector('textarea[placeholder="Type a message…"]')?.value === "", {
      timeout: 20000,
    })
    .catch(() => {
      throw new Error("composer did not clear after send")
    })
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const consoleErrors = []
  const track = (page) =>
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
    })

  const stamp = Date.now().toString(36)
  const officeMarker = `E2E office ping ${stamp}`
  const driverMarker = `E2E driver reply ${stamp}`

  console.log("1. Dispatcher opens Messages and the direct thread with Harpreet")
  const office = await browser.newPage()
  await office.setViewport({ width: 1440, height: 900 })
  track(office)
  await login(office, "dispatch@demo.thind")
  await office.goto(`${BASE}/hub/messages`, { waitUntil: "networkidle2" })
  await waitForText(office, "Every driver conversation in one place")
  const list = await office.evaluate(() => document.body.innerText)
  check(list.includes("Harpreet Singh"), "thread list shows the seeded Harpreet threads")
  check(list.includes("lumper receipt"), "seeded load-thread preview is the last message body")
  await shot(office, "01-office-thread-list")

  // React-controlled select: go through the native value setter so React's
  // value tracker sees the change event as a real user edit.
  await office.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Pick a driver to message"]')
    const opt = [...sel.options].find((o) => o.textContent.includes("Harpreet"))
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set
    setter.call(sel, opt?.value ?? "")
    sel.dispatchEvent(new Event("change", { bubbles: true }))
  })
  await office.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.trim().toLowerCase() === "open")
      return btn && !btn.disabled
    },
    { timeout: 10000 }
  )
  await office.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.trim().toLowerCase() === "open")
    btn?.click()
  })
  // router.push is a soft navigation — poll the URL instead of waitForNavigation.
  await office.waitForFunction(() => /\/hub\/messages\/[\w-]+$/.test(location.pathname), { timeout: 20000 })
  await office.waitForSelector('textarea[placeholder="Type a message…"]', { timeout: 20000 })
  const threadUrl = office.url()
  const threadId = threadUrl.split("/").pop()
  check(/\/hub\/messages\/[\w-]+$/.test(threadUrl), `Open lands on the thread (${threadUrl})`)

  console.log("2. Template chip fills the composer; dispatcher sends a marker")
  const chipFilled = await office.evaluate(() => {
    const chip = [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "ETA check")
    if (!chip) return null
    chip.click()
    return true
  })
  check(chipFilled === true, "template chips render on the office composer")
  // setBody(t.body) is a React state update — poll instead of racing its render.
  await office
    .waitForFunction(
      () => document.querySelector('textarea[placeholder="Type a message…"]')?.value.includes("ETA"),
      { timeout: 8000 }
    )
    .catch(() => {})
  const composerValue = await office.evaluate(
    () => document.querySelector('textarea[placeholder="Type a message…"]')?.value ?? ""
  )
  check(composerValue.includes("ETA"), `ETA template fills the composer (got "${composerValue}")`)
  await sendChat(office, officeMarker)
  const officeThread = await office.evaluate(() => document.body.innerText)
  check(officeThread.includes(officeMarker), "office marker message appears in the thread")
  await shot(office, "02-office-sent")

  console.log("3. Driver PWA at 390px shows the unread badge and the message")
  const driverCtx = await browser.createBrowserContext()
  const driver = await driverCtx.newPage()
  await driver.setViewport({ width: 390, height: 844 })
  track(driver)
  await login(driver, "driver@demo.thind")
  await driver.goto(`${BASE}/hub/driver/messages`, { waitUntil: "networkidle2" })
  await waitForText(driver, "no phone numbers needed")
  await waitForText(driver, "Dispatch / office")
  const driverList = await driver.evaluate(() => document.body.innerText)
  check(driverList.includes(officeMarker), "driver list previews the office marker")
  const unreadBadge = await driver.evaluate((marker) => {
    const row = [...document.querySelectorAll("li a")].find((a) => a.innerText.includes(marker))
    return row ? /\d/.test(row.querySelector("span.rounded-full")?.textContent ?? "") : false
  }, officeMarker)
  check(unreadBadge, "driver list shows an unread badge on the direct thread")
  await shot(driver, "03-driver-list-unread")

  await driver.evaluate((marker) => {
    const row = [...document.querySelectorAll("li a")].find((a) => a.innerText.includes(marker))
    row?.click()
  }, officeMarker)
  await driver.waitForFunction(() => /\/hub\/driver\/messages\/[\w-]+$/.test(location.pathname), { timeout: 20000 })
  await waitForText(driver, officeMarker)
  const driverThread = await driver.evaluate(() => document.body.innerText)
  // Sender names render CSS-uppercased on bubbles — compare case-insensitively.
  check(driverThread.toLowerCase().includes("maya dhillon"), "office sender name shows on the driver bubble")

  console.log("4. Driver replies from the phone composer")
  await sendChat(driver, driverMarker)
  check(
    (await driver.evaluate(() => document.body.innerText)).includes(driverMarker),
    "driver reply appears in the thread"
  )
  await shot(driver, "04-driver-replied")

  console.log("5. Office sees the reply unread, then the bubble and the read receipt")
  await office.goto(`${BASE}/hub/messages`, { waitUntil: "networkidle2" })
  await waitForText(office, "Every driver conversation in one place")
  const officeList2 = await office.evaluate(() => document.body.innerText)
  check(officeList2.includes(driverMarker), "office list previews the driver reply")
  const officeUnread = await office.evaluate((marker) => {
    const row = [...document.querySelectorAll("a[href^='/hub/messages/']")].find((a) =>
      a.innerText.includes(marker)
    )
    return row ? /\d/.test(row.querySelector("span.rounded-full")?.textContent ?? "") : false
  }, driverMarker)
  check(officeUnread, "office list shows an unread badge for the reply")
  await shot(office, "05-office-list-unread")

  await office.goto(`${BASE}/hub/messages/${threadId}`, { waitUntil: "networkidle2" })
  await waitForText(office, "Photos and read receipts stay with this thread.")
  await waitForText(office, driverMarker)
  const officeThread2 = await office.evaluate(() => document.body.innerText)
  check(officeThread2.includes(driverMarker), "driver reply bubble renders in the office thread")
  check(officeThread2.includes("Seen by Harpreet Singh"), "read receipt shows Seen by Harpreet Singh")
  await shot(office, "06-office-reply-seen")

  console.log("6. Driver login is refused the office messages routes")
  // proxy.ts's middleware redirect() runs server-side before any HTML ships,
  // and Puppeteer's goto() follows redirects transparently — driver.url() is
  // already final once goto() resolves, no settle time needed.
  await driver.goto(`${BASE}/hub/messages`, { waitUntil: "networkidle2" })
  check(!driver.url().includes("/hub/messages"), `driver redirected off the office list (at ${driver.url()})`)
  await driver.goto(`${BASE}/hub/messages/${threadId}`, { waitUntil: "networkidle2" })
  // Driver tokens bounce off the office thread — they never see the subtitle,
  // so wait on leaving /hub/messages/<id> rather than the destination copy.
  await driver.waitForFunction(() => !location.pathname.startsWith("/hub/messages/"), {
    timeout: 20000,
  })
  check(
    !driver.url().includes(`/hub/messages/${threadId}`),
    `driver redirected off the office thread deep link (at ${driver.url()})`
  )
  await shot(driver, "07-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nMessages smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nMessages smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
