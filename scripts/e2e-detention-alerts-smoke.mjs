/**
 * Detention end-to-end smoke test: a truck sitting past free time is
 * surfaced before anyone knows the final total (dispatch-board badge + cron
 * alert), and the moment it departs, detention bills itself onto the load —
 * no one has to notice and click a button. This exercises the fix end to
 * end: the dispatch board badges a currently-dwelling stop with an accurate
 * hours-over/estimate, the badge links through to "Mark departed" (no
 * detention button yet — the clock is still running so the exact amount
 * isn't known), marking departed clears the badge, auto-applies the
 * Detention accessorial, and confirms the amount in the toast — no manual
 * "Add detention" click required — and the detention-alerts cron job
 * notifies once per dwell episode and stays quiet on a repeat run
 * (idempotent against hub.load_events).
 *
 * Reseeds demo data first — THD-1004 (the seeded "at_pickup" load) is
 * reopened with an unclosed pickup stop 5h in the past (see seed-demo.mjs).
 *
 * Requires CRON_SECRET in the environment (same value the server was
 * started with) to exercise the cron endpoint.
 *
 * Usage: node scripts/e2e-detention-alerts-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { ANCHORS, launchBrowser, BASE, failures, check, waitForText, textGone, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-detention-alerts"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })
const CRON_SECRET = process.env.CRON_SECRET

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Login as owner, dispatch board badges the dwelling load")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page, ANCHORS.dispatch)
  await waitForText(page, "Dispatch Board")
  const badge = await page.evaluate(() => {
    const el = [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Dwelling"))
    return el ? { text: el.textContent.trim(), href: el.getAttribute("href") } : null
  })
  check(!!badge, `dwelling badge found (${badge?.text})`)
  check(/^Dwelling \d+\.\d+h over free time \(~\$[\d,]+\) — mark departed to bill it$/.test(badge?.text ?? ""),
    `badge copy matches the not-yet-departed reality (${badge?.text})`)
  await shot(page, "01-dispatch-dwelling-badge")

  console.log("2. Badge links to the load — Mark departed shown, no detention button yet")
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.evaluate((href) => { location.href = href }, badge.href),
  ])
  await waitForText(page, "Mark departed")
  const before = await page.evaluate(() => ({
    hasMarkDeparted: [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Mark departed")),
    hasDetentionButton: [...document.querySelectorAll("button")].some((b) => /detention/i.test(b.textContent)),
  }))
  check(before.hasMarkDeparted, "load page offers Mark departed for the open stop")
  check(!before.hasDetentionButton, "no detention button offered while the stop is still open")
  await shot(page, "02-load-before-departure")

  console.log("3. Cron alerts once, then stays quiet on a repeat run (idempotent)")
  if (CRON_SECRET) {
    const first = await page.evaluate(async (secret) => {
      const res = await fetch("/api/hub/cron/detention-alerts", { headers: { Authorization: `Bearer ${secret}` } })
      return res.json()
    }, CRON_SECRET)
    const carrierId = "11111111-1111-1111-1111-111111111111"
    check(first.results?.[carrierId]?.alerted >= 1, `first cron run alerts (${JSON.stringify(first.results?.[carrierId])})`)
    const second = await page.evaluate(async (secret) => {
      const res = await fetch("/api/hub/cron/detention-alerts", { headers: { Authorization: `Bearer ${secret}` } })
      return res.json()
    }, CRON_SECRET)
    check(second.results?.[carrierId]?.alerted === 0, `repeat cron run is silent (${JSON.stringify(second.results?.[carrierId])})`)
  } else {
    console.log("  ⏭  CRON_SECRET not set — skipping cron endpoint checks")
  }

  console.log("4. Mark departed — badge clears, detention auto-bills itself (no click needed)")
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Mark departed"))
    btn.click()
  })
  await waitForText(page, ANCHORS.toastDepartureRecorded)
  const toastText = await page.evaluate(() => {
    const text = document.body.innerText
    const start = text.indexOf(ANCHORS.toastDepartureRecorded)
    return start >= 0 ? text.slice(start, start + 80).split("\n")[0] : null
  })
  check(/detention billed: \$[\d.]+/.test(toastText ?? ""), `toast confirms auto-applied detention (${toastText})`)
  // The toast text itself contains "detention", so textAppears("Detention")
  // would resolve before the refresh — poll for the button that actually
  // disappears once the server action's revalidation lands instead.
  await textGone(page, "Mark departed")
  const after = await page.evaluate(() => ({
    hasMarkDeparted: [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Mark departed")),
    hasDetentionButton: [...document.querySelectorAll("button")].some((b) => /detention/i.test(b.textContent)),
    hasDetentionLine: [...document.querySelectorAll("dt")].some((dt) => dt.textContent?.trim() === "Detention"),
  }))
  check(!after.hasMarkDeparted, "Mark departed is gone once the stop is closed")
  check(after.hasDetentionLine, "Detention line auto-appears on the Rate panel — no button click needed")
  check(!after.hasDetentionButton, "no manual detention button remains once auto-applied")
  await shot(page, "03-load-after-departure")

  console.log("5. Dispatch board no longer badges the now-closed stop")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page, ANCHORS.dispatch)
  const stillDwelling = await page.evaluate(() =>
    [...document.querySelectorAll("a")].some((a) => a.textContent.includes("Dwelling"))
  )
  check(!stillDwelling, "dwelling badge cleared after Mark departed")

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nDetention-alerts smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDetention-alerts smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
