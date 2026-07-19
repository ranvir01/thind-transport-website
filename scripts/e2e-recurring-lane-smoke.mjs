/**
 * Recurring-lane end-to-end smoke: a dispatcher schedules "rebook every
 * <weekday>" on a dedicated lane once, and the daily recurring-rebook cron
 * books the copy each matching morning — no re-keying, no re-clicking.
 *
 * Drives the seeded "Pipe" flatbed load (settled lane with a Detention
 * accessorial and full assignment) through the full loop:
 *
 *   schedule — Repeat weekly → pick today's (carrier-local) weekday; the
 *              button flips to "Weekly · <day>" and the timeline records it
 *   cron     — GET /api/hub/cron/recurring-rebook (Bearer CRON_SECRET) books
 *              exactly one copy; a second call the same day books nothing
 *   copy     — fresh Booked DIRECT load, detention stripped ($2,800 total),
 *              timeline says "Rebooked weekly from THD-xxxx"
 *   rule     — dropdown shows "Last booked: THD-yyyy"
 *   off      — Turn off weekly rebook reverts the button
 *   gate     — an accountant (no loads:write) is never offered the control
 *
 * Reseeds demo data first. Server must be running with CRON_SECRET set.
 * Usage: node scripts/e2e-recurring-lane-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, failures, check, waitForText, login, makeShot, reseed, clickByText } from "./e2e-lib.mjs"

// Fail fast on a fresh rig: the cron step authenticates with Bearer CRON_SECRET.
// Against a localhost BASE, e2e-lib has already loaded .env.local into this
// process — the same file the server reads — so an empty value here means every
// cron call 401s and the smoke burns ~25s before dying on a wait timeout.
// Remote BASEs skip the check (the remote server's env is not visible here).
if (/localhost|127\.0\.0\.1/.test(BASE) && !process.env.CRON_SECRET) {
  console.error(
    "e2e-recurring-lane-smoke: CRON_SECRET missing in .env.local — the cron " +
      "endpoint will 401 and the rebook can never run. Set CRON_SECRET in " +
      ".env.local, restart the server, rerun."
  )
  process.exit(1)
}

const OUT = process.argv[2] ?? "e2e-shots-recurring-lane"
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
  const secret = process.env.CRON_SECRET
  const res = await fetch(`${BASE}/api/hub/cron/recurring-rebook`, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
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

  console.log("1. Owner opens the settled Pipe load")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/loads?status=all&q=Pipe`, { waitUntil: "networkidle2" })
  await waitForText(page, "Sacramento")
  const loadHref = await page.evaluate(() => {
    const row = [...document.querySelectorAll("a")].find(
      (a) => /\/hub\/loads\/[0-9a-f-]{36}/.test(a.getAttribute("href") ?? "") && a.textContent.includes("THD-")
    )
    return row?.getAttribute("href") ?? null
  })
  check(!!loadHref, `Pipe load found in the loads list (${loadHref})`)
  await page.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  const sourceRef = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? "")
  check(/^THD-\d+$/.test(sourceRef), `source load open (${sourceRef})`)
  const hasRepeat = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Repeat weekly")
  )
  check(hasRepeat, "owner is offered the Repeat weekly button")
  await shot(page, "01-source-load")

  console.log(`2. Schedule the weekly rebook for ${localWeekdayName} (today, carrier-local)`)
  await clickByText(page, "Repeat weekly")
  await waitForText(page, "Rebook this lane every")
  await clickByText(page, localWeekdayName)
  await waitForText(page, `Weekly · ${WEEKDAYS_SHORT[weekday]}`)
  await page.reload({ waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  const scheduled = await page.evaluate((short) => ({
    weeklyButton: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === `Weekly · ${short}`),
    timelineNote: document.body.innerText.includes("Weekly rebook scheduled: every"),
  }), WEEKDAYS_SHORT[weekday])
  check(scheduled.weeklyButton, `button shows the schedule (Weekly · ${WEEKDAYS_SHORT[weekday]})`)
  check(scheduled.timelineNote, "timeline records the schedule change")
  await shot(page, "02-scheduled")

  console.log("3. Cron books the copy — and only once per day")
  const first = await runCron()
  check(first.status === 200, `cron responded 200 (${first.status})`)
  const carrierResults = Object.values(first.body.results ?? {})
  const run = carrierResults.find((r) => (r?.rules ?? 0) > 0)
  check(!!run && run.due === 1 && run.booked === 1 && run.disabled === 0,
    `cron booked the due rule (${JSON.stringify(run)})`)
  const second = await runCron()
  const rerun = Object.values(second.body.results ?? {}).find((r) => (r?.rules ?? 0) > 0)
  check(!!rerun && rerun.due === 0 && rerun.booked === 0,
    `second run the same day books nothing (${JSON.stringify(rerun)})`)

  console.log("4. The rule shows what it booked; the copy is a clean rebook")
  await page.reload({ waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  await clickByText(page, `Weekly · ${WEEKDAYS_SHORT[weekday]}`)
  await waitForText(page, "Last booked:")
  const bookedRef = await page.evaluate(() =>
    document.body.innerText.match(/Last booked: (THD-\d+)/)?.[1] ?? null
  )
  check(!!bookedRef && bookedRef !== sourceRef, `rule shows the booked copy (${bookedRef})`)
  await shot(page, "03-rule-last-booked")

  await page.goto(`${BASE}/hub/loads?status=all&q=${bookedRef}`, { waitUntil: "networkidle2" })
  const copyHref = await page.evaluate((ref) => {
    const row = [...document.querySelectorAll("a")].find(
      (a) => /\/hub\/loads\/[0-9a-f-]{36}/.test(a.getAttribute("href") ?? "") && a.textContent.includes(ref)
    )
    return row?.getAttribute("href") ?? null
  }, bookedRef)
  check(!!copyHref, `booked copy found in the loads list (${copyHref})`)
  await page.goto(`${BASE}${copyHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  const copy = await page.evaluate(() => {
    const body = document.body.innerText
    const sourceDd = [...document.querySelectorAll("dt")]
      .find((dt) => dt.textContent?.trim() === "Source")
      ?.nextElementSibling?.textContent?.trim() ?? null
    return {
      reference: document.querySelector("h1")?.textContent?.trim() ?? "",
      booked: body.includes("Booked"),
      sourceField: sourceDd,
      total: body.match(/Total\s*\$([\d,]+)/)?.[1] ?? null,
      hasDetentionLine: [...document.querySelectorAll("dt")].some((dt) => /detention/i.test(dt.textContent ?? "")),
      apptChips: /Appt /.test(body),
      provenance: body.match(/Rebooked weekly from (THD-\d+)/)?.[1] ?? null,
    }
  })
  check(copy.reference === bookedRef, `copy open (${copy.reference})`)
  check(copy.booked, "copy starts at Booked")
  check(copy.sourceField?.toLowerCase() === "direct", `copy is a DIRECT booking (${copy.sourceField})`)
  check(copy.total === "2,800", `total excludes the old trip's detention ($${copy.total})`)
  check(!copy.hasDetentionLine, "no Detention accessorial on the copy")
  check(!copy.apptChips, "appointment windows cleared — new trip books its own")
  check(copy.provenance === sourceRef, `timeline names the source (Rebooked weekly from ${copy.provenance})`)
  await shot(page, "04-rebooked-copy")

  console.log("5. Turn the rule off")
  await page.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Rate")
  await clickByText(page, `Weekly · ${WEEKDAYS_SHORT[weekday]}`)
  await waitForText(page, "Turn off weekly rebook")
  await clickByText(page, "Turn off weekly rebook")
  await waitForText(page, "Repeat weekly")
  const off = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Repeat weekly")
  )
  check(off, "button reverts to Repeat weekly after turn-off")
  await shot(page, "05-turned-off")

  console.log("6. Accountant (no loads:write) is not offered the control")
  const context2 = await browser.createBrowserContext()
  const page2 = await context2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(page2, "accounting@demo.thind")
  await page2.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Rate")
  const accountant = await page2.evaluate(() => ({
    hasRepeat: [...document.querySelectorAll("button")].some((b) => /Repeat weekly|Weekly ·/.test(b.textContent.trim())),
  }))
  check(!accountant.hasRepeat, "accountant sees no Repeat weekly button")
  await shot(page2, "06-accountant-no-repeat")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest|401/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nRecurring-lane smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nRecurring-lane smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
