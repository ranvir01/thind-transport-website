/**
 * js-budget.mjs — how much JavaScript does each marketing page actually make a
 * phone download?
 *
 * The rebuild plan sets a hard number: initial route JS ≤ 170KB gzipped per
 * marketing page. Nothing was measuring it. Next 16 + turbopack no longer emits
 * the per-route "First Load JS" manifest earlier versions did, so rather than
 * parse build output this measures the thing that actually matters — the bytes
 * that cross the wire on a cold load, as reported by the browser itself.
 *
 * Why the browser and not the build: a route's true cost includes the shared
 * runtime, the framework chunk, and any third-party script the page pulls in.
 * Summing chunk files on disk misses what is actually requested and
 * double-counts what is not. Chrome's own transfer sizes are the honest number,
 * and they are already gzipped the way a real visitor receives them.
 *
 * A cold load per route (fresh context, cache disabled) is deliberate: a
 * driver arriving from a Google ad has an empty cache, and that first visit is
 * the one that decides whether they wait.
 *
 * USAGE
 *   npm run build && npm run start      # must measure the production build
 *   node scripts/js-budget.mjs
 *   node scripts/js-budget.mjs /drivers /quote
 *   JS_BUDGET_KB=200 node scripts/js-budget.mjs
 *
 * Exits non-zero when any route is over budget, so it can gate a deploy.
 */
import { gzipSync } from "node:zlib"
import { launchBrowser, BASE } from "./e2e-lib.mjs"

/**
 * The rebuild plan's target. Measured at the pinned viewport on 2026-07-28:
 * 236-280KB per route, `/pay-rates` worst. Over target, so failing at 170 today
 * would ship a permanently-red gate, and a gate that is always red is a gate
 * everyone learns to ignore.
 */
const TARGET_KB = 170

/**
 * What the site actually ships today, as a ratchet: a route may get smaller,
 * never larger. Lower this as pages get lighter. Raising it is how a ratchet
 * stops being a ratchet — if a change genuinely needs more JS, say so in the
 * commit rather than editing the number quietly.
 *
 * 285 sits just above the measured worst route (/pay-rates, 280KB).
 *
 * READ THIS BEFORE TRUSTING ANY NUMBER FROM THIS SCRIPT. On 2026-07-28 it
 * produced 143-193KB per route across several consecutive runs, then 236-280KB
 * for the same routes later the same day — and 236-280 is what both the first
 * and the last measurement agree on. The low readings came from builds made
 * during a window that included at least one `next build` interrupted
 * mid-write, and they were never reproducible afterwards. So:
 *
 *   - A number from this script is only meaningful against another number from
 *     the SAME session, on a build you watched finish.
 *   - `rm -rf .next && npm run build` and confirm it exits 0 before measuring.
 *     A partial .next serves pages with chunks missing and reports a flattering
 *     total rather than an error.
 *
 * The pinned VIEWPORT below removes one source of drift but did not cause that
 * episode, and does not by itself make two runs comparable across builds.
 *
 * ONE EXPERIMENT, RECORDED AS INCONCLUSIVE: gating sonner's <Toaster> out of
 * the root layout behind usePathname() + next/dynamic, so the ~40 routes that
 * can never fire a toast stop paying for it. Measured 245-289KB against a
 * 143-193KB baseline and looked like a large regression — but that baseline is
 * exactly the suspect low reading, and 245-289 is within noise of the real
 * 236-280. It was reverted as the safe default, NOT because it was shown to be
 * harmful. Anyone retrying it should A/B against a freshly verified build; the
 * idea is still sound on paper.
 */
const CEILING_KB = Number(process.env.JS_BUDGET_KB ?? 285)

/** The pages a driver, shipper, or broker actually lands on. */
const ROUTES = [
  "/",
  "/drivers",
  "/owner-operators",
  "/shippers",
  "/brokers",
  "/apply",
  "/quote",
  "/contact",
  "/trust",
  "/pay-rates",
  "/tools/freight-class-calculator",
  "/cdl-jobs/washington",
]

/**
 * The measurement viewport, pinned deliberately.
 *
 * This was the bug that made the first version of this script useless: it never
 * set a viewport, so it inherited whatever Puppeteer defaulted to that run. The
 * homepage skips its 3MB hero video at phone widths, so the same commit
 * measured 143KB one run and 236KB the next depending on which side of the
 * breakpoint the default landed on. A ratchet that moves on its own is worse
 * than no ratchet — it trains everyone to re-run until it passes.
 *
 * 390x844 is the iPhone 14/15 class device and matches the 390px width AGENTS.md
 * already requires every change to be checked at. It is also the case the budget
 * is actually about: a driver on cell signal at a truck stop, not a desk.
 */
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

const cli = process.argv.slice(2).filter((a) => a.startsWith("/"))
const routes = cli.length ? cli : ROUTES

const browser = await launchBrowser()
const results = []

try {
  for (const route of routes) {
    // A fresh context per route so one page's cache can't flatter the next.
    const page = await browser.newPage()
    await page.setCacheEnabled(false)
    // Pinned before navigating: a viewport change after load would re-run
    // responsive logic and re-request assets, double-counting them.
    await page.setViewport(VIEWPORT)
    await page.setUserAgent(PHONE_UA)

    let jsBytes = 0
    let totalBytes = 0
    const pending = []
    page.on("response", (response) => {
      pending.push(
        (async () => {
          try {
            const type = response.request().resourceType()
            const body = await response.buffer().catch(() => Buffer.alloc(0))
            if (body.length === 0) return

            // Puppeteer's buffer() is the DECODED body, so measuring it
            // directly compares raw bytes against a gzipped budget and
            // overstates every route by 3-4x. Compress it ourselves to get the
            // size that actually crosses the wire — Next serves these gzipped
            // and Vercel serves them brotli'd, so this is the honest floor.
            const wire =
              type === "script" || type === "stylesheet" || type === "document"
                ? gzipSync(body).length
                : body.length // images/fonts are already compressed formats
            totalBytes += wire
            if (type === "script") jsBytes += wire
          } catch {
            /* a response that vanished mid-flight is not worth failing over */
          }
        })()
      )
    })

    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0", timeout: 45_000 })
    // Response bodies resolve asynchronously; wait for the ones still in flight
    // or the totals under-report whatever landed last.
    await Promise.all(pending)
    results.push({ route, js: jsBytes / 1024, total: totalBytes / 1024 })
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(
  `\n📦 JS budget — ceiling ${CEILING_KB}KB (ratchet), target ${TARGET_KB}KB (cold load, gzipped)\n`
)
let over = 0
let aboveTarget = 0
for (const r of results.sort((a, b) => b.js - a.js)) {
  const breach = r.js > CEILING_KB
  if (breach) over += 1
  if (r.js > TARGET_KB) aboveTarget += 1
  const mark = breach ? "❌" : r.js > TARGET_KB ? "⚠️ " : "✅"
  console.log(
    `  ${mark} ${r.route.padEnd(34)} ${r.js.toFixed(0).padStart(5)} KB JS   ` +
      `(${r.total.toFixed(0)} KB total)`
  )
}

const worst = Math.max(...results.map((r) => r.js))
if (over > 0) {
  console.log(`\n❌ ${over} route(s) above the ${CEILING_KB}KB ceiling — this is a regression.\n`)
  process.exit(1)
}
console.log(
  `\n✅ no regression (worst route ${worst.toFixed(0)}KB, ceiling ${CEILING_KB}KB).` +
    (aboveTarget > 0
      ? `\n⚠️  ${aboveTarget} route(s) still above the ${TARGET_KB}KB target — real work, tracked not hidden.\n`
      : "\n")
)
