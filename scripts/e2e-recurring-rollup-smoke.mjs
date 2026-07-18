/**
 * Recurring-lanes roll-up + stopped-lane alert smoke: every "rebook weekly"
 * rule is visible in one place on the loads page, and a rule the cron
 * auto-disables is loud — warn row at the top of the roll-up plus a
 * notification to the dispatch desk — instead of silently never booking again.
 *
 *   schedule — owner puts two lanes on today's (carrier-local) weekday
 *   roll-up  — /hub/loads shows a "Recurring lanes" panel: ref, lane,
 *              "Every <day>", "Books next <day>" before the first run
 *   break    — one source load is soft-deleted in SQL (the "source can no
 *              longer rebook" failure the cron guards against)
 *   cron     — GET /api/hub/cron/recurring-rebook books the healthy rule,
 *              disables the broken one (due 2, booked 1, disabled 1)
 *   surface  — roll-up lists the Stopped rule first with the reason; the
 *              healthy rule shows "Last booked THD-xxxx"; the notification
 *              bell has "Weekly rebook stopped: THD-xxxx"
 *   mobile   — loads page at 390px: panel wraps, no horizontal body scroll
 *
 * Reseeds demo data first. Server must be running with CRON_SECRET set;
 * POSTGRES_URL (from .env.local on a local rig) is used for the soft-delete.
 * Usage: node scripts/e2e-recurring-rollup-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import pg from "pg"
import { mkdirSync } from "node:fs"
import { BASE, failures, check, waitForText, login, makeShot, reseed, clickByText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-recurring-rollup"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Same clock the cron runner uses: the carrier-local (America/Los_Angeles) weekday.
const localWeekdayName = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", weekday: "long",
}).format(new Date())
const weekday = WEEKDAYS.indexOf(localWeekdayName)

async function runCron() {
  const res = await fetch(`${BASE}/api/hub/cron/recurring-rebook`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

async function softDeleteLoad(loadId) {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL required (loaded from .env.local on a local rig)")
  const client = new pg.Client({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    const res = await client.query(`UPDATE hub.loads SET deleted_at = NOW() WHERE id = $1`, [loadId])
    return res.rowCount === 1
  } finally {
    await client.end()
  }
}

const loadIdFromHref = (href) => href?.match(/\/hub\/loads\/([0-9a-f-]{36})/)?.[1] ?? null

/** On the current loads-list page, collect {href, ref} for every THD row link. */
async function listLoadLinks(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .filter((a) => /\/hub\/loads\/[0-9a-f-]{36}/.test(a.getAttribute("href") ?? ""))
      .map((a) => ({ href: a.getAttribute("href"), ref: a.textContent.match(/THD-\d+/)?.[0] ?? null }))
      .filter((l) => l.ref)
  )
}

async function scheduleWeekly(page, href) {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  await clickByText(page, "Repeat weekly")
  await waitForText(page, "Rebook this lane every")
  await clickByText(page, localWeekdayName)
  await waitForText(page, `Weekly · ${WEEKDAYS_SHORT[weekday]}`)
}

async function main() {
  reseed()
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

  console.log("1. Owner schedules two weekly lanes for today (carrier-local)")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/loads?status=all&q=Pipe`, { waitUntil: "networkidle2" })
  await waitForText(page, "Sacramento")
  const pipe = (await listLoadLinks(page))[0]
  check(!!pipe, `healthy lane found (${pipe?.ref})`)

  await page.goto(`${BASE}/hub/loads?status=all`, { waitUntil: "networkidle2" })
  await waitForText(page, "THD-")
  const doomed = (await listLoadLinks(page)).find((l) => l.href !== pipe.href)
  check(!!doomed, `second lane found (${doomed?.ref})`)

  await scheduleWeekly(page, pipe.href)
  await scheduleWeekly(page, doomed.href)

  console.log("2. The loads page rolls both rules up before the first run")
  await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(page, "Recurring lanes")
  const before = await page.evaluate((day) => {
    const body = document.body.innerText
    return {
      everyDay: (body.match(new RegExp(`Every ${day}`, "g")) ?? []).length,
      booksNext: body.includes(`Books next ${day}`),
      stopped: body.includes("Stopped"),
    }
  }, localWeekdayName)
  check(before.everyDay === 2, `both rules listed with their day (${before.everyDay} × "Every ${localWeekdayName}")`)
  check(before.booksNext, "unrun rule shows when it books next")
  check(!before.stopped, "nothing marked Stopped yet")
  await shot(page, "01-rollup-two-active")

  console.log(`3. Break one lane (soft-delete ${doomed.ref}) and run the cron`)
  check(await softDeleteLoad(loadIdFromHref(doomed.href)), `source load ${doomed.ref} soft-deleted in SQL`)
  const cron = await runCron()
  check(cron.status === 200, `cron responded 200 (${cron.status})`)
  const run = Object.values(cron.body.results ?? {}).find((r) => (r?.rules ?? 0) > 0)
  check(!!run && run.due === 2 && run.booked === 1 && run.disabled === 1,
    `cron booked the healthy rule and disabled the broken one (${JSON.stringify(run)})`)

  console.log("4. The stopped lane is loud: roll-up row + reason, listed first")
  await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(page, "Recurring lanes")
  const after = await page.evaluate((refs) => {
    const items = [...document.querySelectorAll("section li")].map((li) => li.innerText.replace(/\n/g, " "))
    const rows = items.filter((t) => /Every /.test(t))
    return {
      rows,
      stoppedFirst: /Stopped/.test(rows[0] ?? "") && rows[0].includes(refs.doomed),
      stoppedReason: rows.some((t) => t.includes("Load not found")),
      goneLane: rows.some((t) => t.includes("Source load no longer available")),
      lastBooked: rows.find((t) => t.includes(refs.pipe))?.match(/Last booked (THD-\d+)/)?.[1] ?? null,
    }
  }, { pipe: pipe.ref, doomed: doomed.ref })
  check(after.rows.length === 2, `both rules still listed (${after.rows.length})`)
  check(after.stoppedFirst, `stopped rule sorts first (${after.rows[0]})`)
  check(after.stoppedReason, "stopped row names the reason (Load not found)")
  check(after.goneLane, "stopped row says the source load is gone")
  check(!!after.lastBooked && after.lastBooked !== pipe.ref,
    `healthy rule shows what it booked (${after.lastBooked})`)
  await shot(page, "02-rollup-stopped-first")

  console.log("5. The dispatch desk is notified")
  await page.click('button[aria-label^="Notifications"]')
  await waitForText(page, "Weekly rebook stopped")
  const notif = await page.evaluate((ref) => {
    const body = document.body.innerText
    return {
      title: body.includes(`Weekly rebook stopped: ${ref}`),
      reason: body.includes("Load not found"),
    }
  }, doomed.ref)
  check(notif.title, `bell shows "Weekly rebook stopped: ${doomed.ref}"`)
  check(notif.reason, "notification body carries the reason")
  await shot(page, "03-bell-stopped-lane")

  console.log("6. 390px: roll-up wraps, no horizontal body scroll")
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(page, "Recurring lanes")
  const mobile = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  check(mobile.scrollWidth <= mobile.innerWidth,
    `no horizontal body scroll at 390px (scrollWidth ${mobile.scrollWidth} ≤ ${mobile.innerWidth})`)
  await shot(page, "04-mobile-390")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest|401/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nRecurring roll-up smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nRecurring roll-up smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
