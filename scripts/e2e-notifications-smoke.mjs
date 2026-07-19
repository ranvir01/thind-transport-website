/**
 * Notifications bell smoke test: the seeded dispatcher has unread
 * notifications, so the bell badge shows a count; opening the feed clears the
 * badge and marks everything read server-side. The mark-as-read POST is
 * artificially delayed via request interception to reproduce the race where
 * the follow-up feed refresh used to land before the POST committed and
 * resurrect the badge with the stale unread count.
 *
 * Reseeds demo data first — the run consumes the dispatcher's unread rows.
 *
 * Usage: node scripts/e2e-notifications-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { sleep, failures, check, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-notifications"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

const BELL = 'button[aria-label^="Notifications"]'
const bellLabel = (page) =>
  page.$eval(BELL, (el) => el.getAttribute("aria-label"))

reseed()

// Root containers (cloud agent rigs) need --no-sandbox to launch Chromium.
const browser = await puppeteer.launch({
  args: process.getuid?.() === 0 ? ["--no-sandbox"] : [],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log("— dispatcher: bell badge shows seeded unread count")
  await login(page, "dispatch@demo.thind")
  await page.waitForSelector(BELL, { visible: true, timeout: 15000 })
  // The badge appears once the deferred first feed fetch resolves.
  await page.waitForFunction(
    (sel) => /\(\d+ unread\)/.test(document.querySelector(sel)?.getAttribute("aria-label") ?? ""),
    { timeout: 15000 },
    BELL
  )
  check(/\(\d+ unread\)/.test(await bellLabel(page)), `badge shows unread count (${await bellLabel(page)})`)
  await shot(page, "01-badge-unread")

  // Delay the mark-as-read POST so a refresh racing ahead of it would still
  // see the rows as unread — the exact ordering that used to resurrect the badge.
  await page.setRequestInterception(true)
  page.on("request", async (req) => {
    if (req.url().includes("/api/hub/notifications") && req.method() === "POST") {
      await sleep(1500)
    }
    req.continue().catch(() => {})
  })

  console.log("— opening the feed clears the badge")
  await page.click(BELL)
  await sleep(400)
  // The header renders uppercase via CSS, so match case-insensitively.
  check(
    await page.evaluate(() => document.body.innerText.toLowerCase().includes("notifications")),
    "feed panel opens"
  )
  check((await bellLabel(page)) === "Notifications", "badge clears on open")
  await shot(page, "02-feed-open")

  console.log("— badge must not resurrect once the delayed POST + refresh settle")
  await sleep(3500)
  const settled = await bellLabel(page)
  check(settled === "Notifications", `badge stays cleared after refresh settles (${settled})`)
  await shot(page, "03-settled")

  console.log("— server committed the mark-as-read (fresh page load, no badge)")
  await page.setRequestInterception(false)
  await page.reload({ waitUntil: "networkidle2" })
  await sleep(1500)
  const afterReload = await bellLabel(page)
  check(afterReload === "Notifications", `no unread badge after reload (${afterReload})`)
  await shot(page, "04-after-reload")
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n  - ${failures.join("\n  - ")}`)
  process.exit(1)
}
console.log("\nAll notifications-bell checks passed.")
