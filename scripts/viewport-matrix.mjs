/**
 * 6-viewport × light/dark screenshot matrix + horizontal-overflow gate.
 *
 * Usage: node scripts/viewport-matrix.mjs            (server on :3000)
 *        OUT_DIR=shots node scripts/viewport-matrix.mjs
 *
 * Screenshots land in OUT_DIR (default qa-matrix/, gitignored) for the
 * view-and-critique pass; the hard gate is: no screen may scroll the page
 * horizontally at any viewport, either mode.
 */
import { mkdirSync } from "node:fs"
import path from "node:path"
import puppeteer from "puppeteer"

const BASE = process.env.BASE_URL || "http://localhost:3000"
const OUT = process.env.OUT_DIR || "qa-matrix"
const EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium"
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: "iphone", width: 393, height: 852, mobile: true },
  { name: "pixel", width: 412, height: 915, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: true },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "wide", width: 1920, height: 1080, mobile: false },
]
const ROUTES = [
  ["/hub/login", false],
  ["/hub/sandbox", false],
  ["/hub", true],
  ["/hub/loads", true],
  ["/hub/money", true],
  ["/hub/safety", true],
  ["/hub/drivers", true],
]

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

const overflows = []
/** Every mobile tab-bar probe and what it managed to check — a gate that
 *  silently skipped every page is not a passing gate. */
const barProbes = []
/**
 * Runs in the page: is real content stranded under the fixed bottom tab bar?
 *
 * Two traps make a naive version of this check lie, and both produced a
 * false "content is buried" report before this was written down:
 *  1. There are TWO <main> elements — an outer `min-h-screen` wrapper with no
 *     padding, and the shell's, which carries the clearance. Measuring the
 *     first one reads 0px and looks broken.
 *  2. <html> carries `scroll-smooth`, so setting scrollTop ANIMATES. Hit-test
 *     immediately and you are probing a mid-scroll page, where a fixed bar
 *     covering content is simply what fixed bars do.
 * So: defeat smooth scrolling, scroll to the true bottom, confirm you got
 * there, and only then hit-test through the bar. Anything that is not the
 * bar, the shell's own padding box, or the document itself is buried.
 */
function underBarProbe() {
  return new Promise((resolve) => {
    const bar = document.querySelector("nav.hub-tabbar, .hub-tabbar")
    if (!bar) return resolve({ status: "no-bar", found: [] })
    // The bar is `md:hidden`, and a display:none element still computes
    // position:fixed while returning a zero rect — hit-testing that lands at
    // (0,0) and "finds" the header on every tablet/desktop page. Require a
    // bar that is actually laid out and on screen.
    // NB: do NOT test offsetParent here — it is null for every position:fixed
    // element by spec, which silently disabled this whole gate once already.
    // A zero-size rect is the honest signal that `md:hidden` has taken it out.
    const rect0 = bar.getBoundingClientRect()
    const cs = getComputedStyle(bar)
    const visible = rect0.width > 0 && rect0.height > 0 && cs.display !== "none" && cs.position === "fixed"
    if (!visible) return resolve({ status: "bar-hidden", found: [] })
    const de = document.documentElement
    const prev = de.style.scrollBehavior
    de.style.scrollBehavior = "auto"
    const s = document.scrollingElement
    s.scrollTop = s.scrollHeight
    setTimeout(() => {
      const scrollable = s.scrollHeight - s.clientHeight > 4
      const atBottom = Math.abs(s.scrollTop + s.clientHeight - s.scrollHeight) < 2
      if (!atBottom) {
        de.style.scrollBehavior = prev
        // Couldn't reach the bottom — report it rather than passing silently.
        return resolve({ status: "no-bottom", found: [] })
      }
      if (!scrollable) {
        de.style.scrollBehavior = prev
        return resolve({ status: "short-page", found: [] })
      }
      const r = bar.getBoundingClientRect()
      const prevPe = bar.style.pointerEvents
      bar.style.pointerEvents = "none"
      const found = []
      for (const dy of [1, 8, Math.round(r.height / 2), Math.round(r.height) - 2]) {
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + dy)
        if (!el) continue
        const structural = bar.contains(el) || ["MAIN", "BODY", "HTML"].includes(el.tagName)
        if (!structural) found.push({ dy, txt: `${el.tagName}: ${(el.textContent || "").trim().slice(0, 50)}` })
      }
      bar.style.pointerEvents = prevPe
      de.style.scrollBehavior = prev
      resolve({ status: "probed", found })
    }, 350)
  })
}

for (const mode of ["light", "dark"]) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.evaluateOnNewDocument((m) => {
    try { localStorage.setItem("hauldesk-mode", m) } catch {}
  }, mode)
  // One login covers the authed routes.
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
  await page.type('input[type="email"], input[name="email"]', "owner@demo.thind")
  await page.type('input[type="password"], input[name="password"]', "ThindDemo1!")
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
  ])
  for (const [route, needsAuth] of ROUTES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({
        width: vp.width, height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile,
      })
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 })
        await new Promise((r) => setTimeout(r, 800))
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
        const slug = route.replace(/^\//, "").replace(/[\/?=&]+/g, "-") || "root"
        await page.screenshot({ path: path.join(OUT, `${slug}--${vp.name}--${mode}.png`) })
        if (overflow > 1) overflows.push({ route, vp: vp.name, mode, overflow })
        if (vp.mobile) {
          const probe = await page.evaluate(underBarProbe)
          barProbes.push({ route, vp: vp.name, mode, status: probe.status })
          if (probe.found.length > 0) {
            overflows.push({ route, vp: vp.name, mode, buried: probe.found.map((b) => b.txt).join(" | ") })
          }
        }
      } catch (error) {
        overflows.push({ route, vp: vp.name, mode, overflow: -1, error: error.message })
      }
    }
    if (needsAuth) { /* session persists across routes in this context */ }
  }
  await context.close()
}
await browser.close()

console.log(`${ROUTES.length * VIEWPORTS.length * 2} screenshots → ${OUT}/`)

// Report what the tab-bar gate actually managed to check. Silence is not
// success: if nothing was ever probed, the gate proves nothing and says so.
const probed = barProbes.filter((p) => p.status === "probed")
const byStatus = barProbes.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {})
console.log(`tab-bar gate: ${probed.length} page/viewport combos hit-tested at the true scroll bottom`,
  `(${Object.entries(byStatus).map(([k, v]) => `${k}:${v}`).join(", ")})`)
if (probed.length === 0) {
  console.error("❌ tab-bar gate checked nothing — it cannot pass vacuously.")
  process.exit(1)
}
if (overflows.length > 0) {
  for (const o of overflows) {
    console.error(
      o.error
        ? `✗ ${o.route} @${o.vp} [${o.mode}] — ${o.error}`
        : o.buried
          ? `✗ ${o.route} @${o.vp} [${o.mode}] — content stranded under the tab bar: ${o.buried}`
          : `✗ ${o.route} @${o.vp} [${o.mode}] — page scrolls horizontally by ${o.overflow}px`
    )
  }
  console.error("❌ viewport matrix failed.")
  process.exit(1)
}
console.log(
  "✅ viewport matrix passed — no horizontal page scroll at any width, either mode,\n" +
    "   and nothing stranded under the mobile tab bar at the bottom of any page."
)
