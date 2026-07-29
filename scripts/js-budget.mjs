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
 * The rebuild plan's target, and the site is closer to it than the first run of
 * this script claimed. Measured at the pinned phone viewport on 2026-07-28:
 * 143-193KB per route, with 9 of 12 routes already under 170KB. Only `/`,
 * `/apply` (181KB) and `/pay-rates` (193KB) are over.
 *
 * The earlier "236-280KB" figure was this script measuring at whatever viewport
 * Puppeteer happened to default to, which let the homepage's 3MB hero video and
 * its desktop-only code into the count. See VIEWPORT below.
 */
const TARGET_KB = 170

/**
 * What the site actually ships today, as a ratchet: a route may get smaller,
 * never larger. Lower this as pages get lighter. Raising it is how a ratchet
 * stops being a ratchet — if a change genuinely needs more JS, say so in the
 * commit rather than editing the number quietly.
 *
 * 200 sits just above the measured worst route (/pay-rates, 193KB), so a
 * regression of even 8KB on the heaviest page trips it.
 *
 * ONE FAILED EXPERIMENT, RECORDED SO IT ISN'T REPEATED: the obvious idea is to
 * stop mounting sonner's <Toaster> in the root layout — most routes can never
 * fire a toast — by gating it behind usePathname() and next/dynamic. It was
 * tried on 2026-07-28 and measured with a proper A/B: it made EVERY route
 * 74-110KB *worse*, because turning the root layout's provider into a
 * router-subscribed dynamic boundary pulls far more into each page's initial
 * load than the ~12KB of sonner it saves. Reverted. If you try this, A/B it the
 * same way before believing it helped.
 */
const CEILING_KB = Number(process.env.JS_BUDGET_KB ?? 200)

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
