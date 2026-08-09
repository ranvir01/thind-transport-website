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
if (overflows.length > 0) {
  for (const o of overflows) {
    console.error(
      o.error
        ? `✗ ${o.route} @${o.vp} [${o.mode}] — ${o.error}`
        : `✗ ${o.route} @${o.vp} [${o.mode}] — page scrolls horizontally by ${o.overflow}px`
    )
  }
  console.error("❌ viewport matrix failed.")
  process.exit(1)
}
console.log("✅ viewport matrix passed — no horizontal page scroll at any width, either mode.")
