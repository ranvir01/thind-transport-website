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
import { mkdirSync } from "node:fs"
import { sleep, failures, check, login, makeShot, reseed, launchBrowser } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-notifications"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

const BELL = 'button[aria-label^="Notifications"]'
const bellLabel = (page) =>
  page.$eval(BELL, (el) => el.getAttribute("aria-label"))

reseed()

// Use the shared launcher, never a bare puppeteer.launch(). This smoke once
// gated --no-sandbox behind a root check and omitted --disable-dev-shm-usage,
// so it passed on root agent rigs and died at launch on GitHub runners (which
// run as non-root) with a bare register dump — green locally, red in CI, for
// weeks. launchBrowser() carries the flags and the executable-path resolution
// for every rig in one place.
const browser = await launchBrowser()
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
  // toggle() sets open + clears unread synchronously, before it ever awaits
  // the (deliberately delayed) mark-as-read POST — poll the aria-label
  // instead of guessing how long that render takes to commit.
  await page
    .waitForFunction((sel) => document.querySelector(sel)?.getAttribute("aria-label") === "Notifications", { timeout: 5000 }, BELL)
    .catch(() => {})
  // The header renders uppercase via CSS, so match case-insensitively.
  check(
    await page.evaluate(() => document.body.innerText.toLowerCase().includes("notifications")),
    "feed panel opens"
  )
  check((await bellLabel(page)) === "Notifications", "badge clears on open")
  await shot(page, "02-feed-open")

  // This 3500ms is not a sleep-then-assert guess: it's the regression window
  // itself. The point of the test is that the badge stays cleared for the
  // whole span covering the artificially delayed POST (line above, 1500ms)
  // plus its follow-up refresh() — there's no earlier "done" signal to poll
  // for, since resurrecting the badge partway through is exactly the bug
  // this smoke exists to catch.
  console.log("— badge must not resurrect once the delayed POST + refresh settle")
  await sleep(3500)
  const settled = await bellLabel(page)
  check(settled === "Notifications", `badge stays cleared after refresh settles (${settled})`)
  await shot(page, "03-settled")

  console.log("— server committed the mark-as-read (fresh page load, no badge)")
  await page.setRequestInterception(false)
  const [reloadResponse] = await Promise.all([
    page
      .waitForResponse((res) => res.url().includes("/api/hub/notifications") && res.request().method() === "GET", {
        timeout: 15000,
      })
      .catch(() => null),
    page.reload({ waitUntil: "networkidle2" }),
  ])
  if (!reloadResponse) {
    // NotificationsBell's first fetch is deferred off the mount effect
    // (setTimeout(refresh, 0)) — fall back to polling the aria-label if the
    // response listener started after the request already fired.
    await page
      .waitForFunction((sel) => document.querySelector(sel)?.getAttribute("aria-label") === "Notifications", { timeout: 5000 }, BELL)
      .catch(() => {})
  }
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
