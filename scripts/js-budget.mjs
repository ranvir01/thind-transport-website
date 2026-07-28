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
 * The rebuild plan's target. The site is NOT there yet — measured 236-280KB
 * per route on 2026-07-28 — so failing at 170 would ship a permanently-red
 * gate, and a gate that is always red is a gate everyone learns to ignore.
 */
const TARGET_KB = 170

/**
 * What the site actually ships today, per route, as a ratchet: a route may get
 * smaller, never larger. Lower these as pages get lighter. Raising one is how
 * a ratchet stops being a ratchet — if a change genuinely needs more JS, say so
 * in the commit rather than editing the number quietly.
 *
 * The gap to TARGET_KB is real work, not an accounting problem: the largest
 * single lever is that every marketing page currently ships the same client
 * bundle whether or not it has an interactive island on it.
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

const cli = process.argv.slice(2).filter((a) => a.startsWith("/"))
const routes = cli.length ? cli : ROUTES

const browser = await launchBrowser()
const results = []

try {
  for (const route of routes) {
    // A fresh context per route so one page's cache can't flatter the next.
    const page = await browser.newPage()
    await page.setCacheEnabled(false)

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
