/**
 * Tasks workflow smoke test — the office "my day" board was the most daily of
 * the remaining screens without a dedicated smoke: dispatcher opens Tasks and
 * sees the seeded morning huddle + invoice follow-up, quick-adds a bare task
 * and a full one (due date, urgent priority, checklist), ticks a checklist
 * item, completes the recurring huddle and watches it roll itself forward,
 * completes a one-off task into Recently done, deletes a task, an accountant
 * shares the same board (tasks are office-wide, not role-gated), and a driver
 * is bounced off /hub/tasks entirely.
 *
 * Reseeds demo data first — each run adds/completes/deletes tasks and rolls
 * the huddle's recurrence forward, so without a reseed the board drifts run
 * over run.
 *
 * Bucket membership of the SEEDED tasks (Overdue vs Today) depends on what
 * time of day the smoke runs, so checks pin titles and counts, never which
 * bucket a seeded task landed in. Tasks the smoke creates use controlled due
 * dates so their buckets ARE asserted.
 *
 * Usage: node scripts/e2e-tasks-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, waitForPath, login, makeShot, clickByText, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-tasks"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const BARE_TASK = "SMK: call the shop about the steer tires"
const FULL_TASK = "SMK: prep the IFTA worksheet for Q2"

/**
 * Fill a React-controlled date/datetime input natively — page.type() feeds
 * digits into locale-ordered segments and mangles ISO strings.
 */
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

/** Click a per-task icon button (aria-label) inside the card whose title contains `title`. */
async function clickTaskButton(page, title, ariaLabel) {
  const clicked = await page.evaluate(
    ({ title, ariaLabel }) => {
      const card = [...document.querySelectorAll("p")]
        .find((p) => (p.textContent ?? "").includes(title))
        ?.closest("div.rounded-card, div.rounded-xl")
      const btn = card?.querySelector(`button[aria-label="${ariaLabel}"]`)
      if (btn) {
        btn.click()
        return true
      }
      return false
    },
    { title, ariaLabel }
  )
  if (!clicked) throw new Error(`No "${ariaLabel}" button on a task card titled "${title}"`)
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as dispatcher, open Tasks")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/tasks`, { waitUntil: "networkidle2" })
  await waitForText(page, "minus the sticky notes")
  const board = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      hasHuddle: text.includes("Morning ops huddle"),
      huddleChecklist: text.includes("Checklist 0/3"),
      hasFollowUp: text.includes("Call Pacific Crest about the overdue invoice"),
      deepLink: [...document.querySelectorAll("a")].find((a) =>
        (a.textContent ?? "").includes("Open the record")
      )?.getAttribute("href"),
      hasQuickAdd: Boolean(document.querySelector('input[aria-label="New task"]')),
    }
  })
  check(board.hasHuddle, "seeded recurring huddle renders")
  check(board.huddleChecklist, "huddle shows its 0/3 checklist counter")
  check(board.hasFollowUp, "seeded invoice follow-up renders")
  check(board.deepLink === "/hub/money", `automation deep link points at the record (${board.deepLink})`)
  check(board.hasQuickAdd, "quick-add bar renders")
  await shot(page, "01-tasks-board")

  console.log("2. Quick-add a bare task (no date)")
  await page.type('input[aria-label="New task"]', BARE_TASK)
  await page.click('form button[type="submit"]')
  await waitForText(page, "Task added")
  await waitForText(page, BARE_TASK)
  // Section headers render through Tailwind's `uppercase`, and innerText
  // reflects CSS text-transform — match them uppercased throughout.
  const bare = await page.evaluate((t) => {
    const text = document.body.innerText
    return { onBoard: text.includes(t), noDateSection: text.toUpperCase().includes("NO DATE (1)") }
  }, BARE_TASK)
  check(bare.onBoard, "bare task shows on the board")
  check(bare.noDateSection, "bare task lands in the No date bucket")
  await shot(page, "02-bare-task-added")

  console.log("3. Quick-add a full task: due in 3 days, urgent, 2-item checklist")
  const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const dueLocal = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}T09:00`
  await page.type('input[aria-label="New task"]', FULL_TASK)
  await page.click('button[aria-label="More options"]')
  await page.waitForSelector('input[aria-label="Due"]')
  await setNativeValue(page, 'input[aria-label="Due"]', dueLocal)
  await page.select('select[aria-label="Priority"]', "urgent")
  await page.type('textarea[aria-label="Checklist (one item per line)"]', "Pull the fuel export\nCross-check jurisdiction miles")
  await shot(page, "03-full-task-form")
  await page.click('form button[type="submit"]')
  await waitForText(page, "Task added")
  await waitForText(page, FULL_TASK)
  const full = await page.evaluate((t) => {
    const card = [...document.querySelectorAll("p")]
      .find((p) => (p.textContent ?? "").includes(t))
      ?.closest("div.rounded-card, div.rounded-xl")
    const cardText = card?.innerText ?? ""
    return {
      comingUp: document.body.innerText.toUpperCase().includes("COMING UP (1)"),
      urgentBadge: /URGENT/i.test(cardText),
      checklist: cardText.includes("Checklist 0/2"),
    }
  }, FULL_TASK)
  check(full.comingUp, "dated task lands in the Coming up bucket")
  check(full.urgentBadge, "urgent priority badge renders on the card")
  check(full.checklist, "checklist saved with both lines (0/2)")

  console.log("4. Tick a checklist item")
  await page.evaluate((t) => {
    const card = [...document.querySelectorAll("p")]
      .find((p) => (p.textContent ?? "").includes(t))
      ?.closest("div.rounded-card, div.rounded-xl")
    card?.querySelector('input[type="checkbox"]')?.click()
  }, FULL_TASK)
  await waitForText(page, "Checklist 1/2")
  check(true, "ticked item persists (Checklist 1/2 after refresh)")
  await shot(page, "04-checklist-ticked")

  console.log("5. Complete the recurring huddle — it rolls itself forward")
  await clickTaskButton(page, "Morning ops huddle", "Mark done")
  await waitForText(page, "next one is already on the list")
  await waitForText(page, "Recently done")
  await page.waitForFunction(
    () => document.body.innerText.split("Morning ops huddle").length - 1 >= 2,
    { timeout: 15000 }
  )
  const huddle = await page.evaluate(() => {
    const up = document.body.innerText.toUpperCase()
    const doneAt = up.indexOf("RECENTLY DONE")
    return {
      inDone: doneAt >= 0 && up.slice(doneAt).includes("MORNING OPS HUDDLE"),
      stillOpen: doneAt >= 0 && up.slice(0, doneAt).includes("MORNING OPS HUDDLE"),
      freshChecklist: doneAt >= 0 && up.slice(0, doneAt).includes("CHECKLIST 0/3"),
    }
  })
  check(huddle.inDone, "completed huddle shows under Recently done")
  check(huddle.stillOpen, "recurrence rolled a fresh huddle onto the open board")
  check(huddle.freshChecklist, "rolled-forward huddle starts with an unticked 0/3 checklist")
  await shot(page, "05-huddle-rolled-forward")

  console.log("6. Complete the one-off bare task — done for good")
  await clickTaskButton(page, BARE_TASK, "Mark done")
  await page.waitForFunction(
    (t) => {
      const up = document.body.innerText.toUpperCase()
      const doneAt = up.indexOf("RECENTLY DONE")
      return !up.includes("NO DATE (") && doneAt >= 0 && up.slice(doneAt).includes(t.toUpperCase())
    },
    { timeout: 15000 },
    BARE_TASK
  )
  check(true, "one-off task left the open buckets and shows under Recently done")

  console.log("7. Delete the urgent task")
  await clickTaskButton(page, FULL_TASK, "Delete task")
  await clickTaskButton(page, FULL_TASK, "Confirm delete task")
  await page.waitForFunction(
    (t) => !document.body.innerText.includes(t),
    { timeout: 15000 },
    FULL_TASK
  )
  check(true, "deleted task is gone from the board")
  await shot(page, "07-after-delete")

  console.log("8. Accountant shares the same office board")
  const acctCtx = await browser.createBrowserContext()
  const acctPage = await acctCtx.newPage()
  await acctPage.setViewport({ width: 1440, height: 900 })
  await login(acctPage, "accounting@demo.thind")
  await acctPage.goto(`${BASE}/hub/tasks`, { waitUntil: "networkidle2" })
  await waitForText(acctPage, "minus the sticky notes")
  const acct = await acctPage.evaluate(() => ({
    seesHuddle: document.body.innerText.includes("Morning ops huddle"),
    hasQuickAdd: Boolean(document.querySelector('input[aria-label="New task"]')),
  }))
  check(acct.seesHuddle, "accountant sees the shared board (rolled huddle included)")
  check(acct.hasQuickAdd, "accountant can add tasks too — the board is office-wide")
  await shot(acctPage, "08-accountant-board")

  console.log("9. Driver cannot reach Tasks")
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  await driverPage.setViewport({ width: 390, height: 844 })
  await login(driverPage, "driver@demo.thind")
  await driverPage.goto(`${BASE}/hub/tasks`, { waitUntil: "networkidle2" })
  await waitForPath(driverPage, "/hub/driver")
  // Pathname flips before the PWA streams in — "Last pay" is home-body copy,
  // not chrome.
  await waitForText(driverPage, "Last pay")
  const driverBlocked = await driverPage.evaluate(() => ({
    url: location.pathname,
    seesBoard: document.body.innerText.includes("minus the sticky notes"),
  }))
  check(driverBlocked.url !== "/hub/tasks", `driver redirected away (landed on ${driverBlocked.url})`)
  check(!driverBlocked.seesBoard, "driver never sees the task board")
  await shot(driverPage, "09-tasks-driver-blocked")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nTasks smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nTasks smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
