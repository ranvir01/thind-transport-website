/**
 * Lighthouse lab audit over the public entry screens (mobile emulation).
 *
 * Usage: node scripts/lighthouse-audit.mjs           (PROD server on :3000 —
 *        run `npm run build && npm run start` first; dev-mode scores lie)
 *
 * Gates per route: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95.
 * Lighthouse dropped its PWA category in v12, so installability is asserted
 * directly: the app manifest must resolve and register a service worker.
 */
import puppeteer from "puppeteer"
import lighthouse from "lighthouse"

const BASE = process.env.BASE_URL || "http://localhost:3000"
const EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium"
const THRESHOLDS = { performance: 90, accessibility: 95, "best-practices": 95 }
const ROUTES = ["/", "/hub/login", "/hub/demo", "/loadoff"]

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9333"],
})

// Median of 3 runs per route: single Lighthouse runs on shared hardware
// swing ±15 perf points from CPU noise alone (observed 82↔100 on the same
// build). Category scores are judged on the median; a11y/bp are stable.
const RUNS = Number(process.env.LH_RUNS || 3)
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

let failed = false
for (const route of ROUTES) {
  const runs = []
  let lastLhr = null
  for (let i = 0; i < RUNS; i++) {
    const { lhr } = await lighthouse(`${BASE}${route}`, {
      port: 9333,
      output: "json",
      logLevel: "error",
      onlyCategories: Object.keys(THRESHOLDS),
      formFactor: "mobile",
      screenEmulation: { mobile: true, width: 393, height: 852, deviceScaleFactor: 2, disabled: false },
    })
    lastLhr = lhr
    runs.push(Object.fromEntries(
      Object.keys(THRESHOLDS).map((cat) => [cat, Math.round((lhr.categories[cat]?.score ?? 0) * 100)])
    ))
  }
  const scores = Object.fromEntries(
    Object.keys(THRESHOLDS).map((cat) => [cat, median(runs.map((r) => r[cat]))])
  )
  const misses = Object.entries(THRESHOLDS).filter(([cat, min]) => scores[cat] < min)
  if (misses.length > 0) failed = true
  console.log(
    `${misses.length === 0 ? "✓" : "✗"} ${route.padEnd(12)} perf ${scores.performance} · a11y ${scores.accessibility} · bp ${scores["best-practices"]}` +
    ` (perf runs: ${runs.map((r) => r.performance).join("/")})`
  )
  if (misses.length > 0 && lastLhr) {
    // Surface the biggest levers so a red run is actionable, not just red.
    const audits = Object.values(lastLhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.details?.overallSavingsMs)
      .sort((a, b) => (b.details.overallSavingsMs ?? 0) - (a.details.overallSavingsMs ?? 0))
      .slice(0, 3)
    for (const a of audits) console.log(`    → ${a.title} (~${Math.round(a.details.overallSavingsMs)}ms)`)
  }
}

// PWA installability (post-LH12): manifest resolves + service worker registers.
const page = await browser.newPage()
await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
const manifestHref = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.href ?? null)
let manifestOk = false
if (manifestHref) {
  const res = await page.goto(manifestHref, { timeout: 30000 })
  const body = await res.text()
  try {
    const manifest = JSON.parse(body)
    manifestOk = Boolean(manifest.name && manifest.start_url && (manifest.icons ?? []).length > 0)
  } catch { manifestOk = false }
}
await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
const swOk = await page
  .evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length > 0))
  .catch(() => false)
await new Promise((r) => setTimeout(r, 2500))
const swOkLate = swOk || (await page
  .evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length > 0))
  .catch(() => false))
console.log(`${manifestOk ? "✓" : "✗"} web app manifest (name, start_url, icons)`)
console.log(`${swOkLate ? "✓" : "✗"} service worker registered on /hub`)
if (!manifestOk || !swOkLate) failed = true

await browser.close()
if (failed) {
  console.error("❌ Lighthouse gate failed.")
  process.exit(1)
}
console.log("✅ Lighthouse gate passed (perf ≥ 90, a11y ≥ 95, bp ≥ 95, installable PWA).")
