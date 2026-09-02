/**
 * 7-viewport × light/dark × indigo/teal/ink screenshot matrix + gates.
 *
 * Usage: node scripts/viewport-matrix.mjs            (server on :3000)
 *        OUT_DIR=shots node scripts/viewport-matrix.mjs
 *
 * Screenshots land in OUT_DIR (default qa-matrix/, gitignored) for the
 * view-and-critique pass; the hard gates are: no screen may scroll the page
 * horizontally at any viewport, any mode, any theme — and nothing may be
 * stranded under the mobile tab bar at the true bottom of any page.
 *
 * Theme is a real axis here, not a footnote. The dark-mode border leak (near-
 * white hairlines and white-on-white hover rows in teal/ink dark) shipped
 * because every QA script seeded `hauldesk-mode` and never `hauldesk-theme`,
 * so every dark screenshot anyone ever looked at was indigo. Indigo still runs
 * every route; teal and ink re-shoot THEMED_ROUTES.
 */
import { mkdirSync } from "node:fs"
import path from "node:path"
import puppeteer from "puppeteer"

const BASE = process.env.BASE_URL || "http://localhost:3000"

/** Every spotlight tour id (src/lib/hub/help.ts) — seeded as "already seen". */
const ALL_TOUR_IDS = [
  "today-desk", "daily-rhythm", "paste-rate-con", "dispatch", "invoice",
  "settlements", "setup", "command-palette", "driver-app",
]
const OUT = process.env.OUT_DIR || "qa-matrix"
const EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium"
mkdirSync(OUT, { recursive: true })

const MODES = ["light", "dark"]
/** The three accents (src/lib/hub/appearance.ts). Indigo is what a fresh
 *  profile gets; teal and ink are where a mode bug hides. */
const THEMES = ["indigo", "teal", "ink"]
/** Office routes re-shot under teal and ink. Capped on purpose: the full
 *  route list × 7 viewports × 2 modes is the indigo pass; these four carry
 *  the densest card / border / hover surface, which is where a neutral
 *  leaking across the theme axis shows first. */
const THEMED_ROUTES = ["/hub", "/hub/loads", "/hub/money", "/hub/dispatch"]

const VIEWPORTS = [
  { name: "iphone", width: 393, height: 852, mobile: true },
  // The geometry the bottom-clearance fix actually targets. Both the tab bar
  // and the content padding are written in env(safe-area-inset-bottom), and
  // Chromium reports a zero inset unless told otherwise — so without this
  // pass the one case that can strand content (an installed iPhone PWA with
  // a home indicator) is the one case never tested. CDP emulates it for
  // real; no CSS shim, so what's measured is the app's own rules.
  { name: "iphone-safe", width: 393, height: 852, mobile: true, safeAreaBottom: 34 },
  // The notch / Dynamic Island. The demo and driver shells pad by
  // env(safe-area-inset-top) and sticky headers sit under it; same CDP
  // override as above, top edge (Emulation.setSafeAreaInsetsOverride takes
  // all four insets).
  { name: "iphone-top", width: 393, height: 852, mobile: true, safeAreaTop: 59 },
  { name: "pixel", width: 412, height: 915, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: true },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "wide", width: 1920, height: 1080, mobile: false },
]
/** The driver pass is phone-only: its own bottom bar, its own header. */
const DRIVER_VIEWPORTS = VIEWPORTS.filter((v) => ["iphone", "iphone-safe", "iphone-top"].includes(v.name))

const ROUTES = [
  ["/hub/login", false],
  ["/hub/sandbox", false],
  ["/hub", true],
  ["/hub/loads", true],
  ["/hub/money", true],
  ["/hub/safety", true],
  ["/hub/drivers", true],
  // Import carries the tallest stacked content in the app; toolbox is about
  // to grow preview cards. Both are where a bottom-clearance regression
  // would show up first.
  ["/hub/import", true],
  ["/hub/toolbox", true],
]
// TODO(portal): /hub/portal (broker@demo.thind / ThindDemo1!) is not covered.
// This script logs in by typing into the form with two hard-coded personas
// (owner below, driver in its own pass); there is no persona mechanism to add
// a third to. When the login is factored out (scripts/e2e-lib.mjs
// `login(page, email)` is the one to reuse), add a broker context and shoot
// /hub/portal at the phone viewports — it is a forced-dark surface like the
// driver app, so one mode, indigo only.

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

const overflows = []
/** Every mobile tab-bar probe and what it managed to check — a gate that
 *  silently skipped every page is not a passing gate. */
const barProbes = []
let shots = 0
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
    // `data-bottom-bar` tags both fixed bottom bars — the office tab bar and
    // the driver app's. The driver app is the surface where a clearance
    // regression actually bit (96px of padding under a 64px bar that grows
    // by the home indicator), so it must be probed by the same instrument.
    const bar = document.querySelector("[data-bottom-bar]")
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
        // An intentional modal covering the screen is not stranded content —
        // it is on top of EVERYTHING by design, the bar included. Without this
        // the probe reports a dialog's backdrop rectangles as buried content.
        const inModal = el.closest?.('[role="dialog"][aria-modal="true"]') != null
        const structural =
          bar.contains(el) || inModal || ["MAIN", "BODY", "HTML"].includes(el.tagName)
        if (!structural) found.push({ dy, txt: `${el.tagName}: ${(el.textContent || "").trim().slice(0, 50)}` })
      }
      bar.style.pointerEvents = prevPe
      de.style.scrollBehavior = prev
      // Geometry, so a passing run shows its working: the shell's clearance
      // and the bar's height should move together as the inset changes.
      const shell = [...document.querySelectorAll("main")].find(
        (m) => parseFloat(getComputedStyle(m).paddingBottom) > 0
      )
      resolve({
        status: "probed",
        found,
        barH: Math.round(r.height),
        clearance: shell ? Math.round(parseFloat(getComputedStyle(shell).paddingBottom)) : null,
      })
    }, 350)
  })
}

/**
 * Seed what the boot script in app/hub/layout.tsx reads on first paint.
 *
 * BOTH appearance keys, always. `hauldesk-theme` left unseeded means indigo,
 * and a matrix that only ever varies `hauldesk-mode` is not a matrix — it is
 * the indigo column relabelled. That is how the teal/ink dark border leak got
 * past 130 screenshots per run.
 *
 * Also mark every spotlight tour already seen. The Today tour AUTOSTARTS on a
 * first visit (HubTour.tsx AUTOSTART_TOUR_ID, 700ms after load), and this rig
 * runs a fresh browser profile every time — so without this the tour's
 * `fixed inset-0 z-[100]` overlay lands on top of every screenshot AND on top
 * of the tab bar the under-bar probe hit-tests, which is exactly the false
 * positive that had this gate crying wolf on /hub. Seeding the app's own
 * completed-tours key is how a returning user suppresses it, so the rig now
 * looks like somebody who has been here before.
 */
async function seedProfile(page, mode, theme) {
  await page.evaluateOnNewDocument((m, t, tourIds) => {
    try { localStorage.setItem("hauldesk-mode", m) } catch {}
    try { localStorage.setItem("hauldesk-theme", t) } catch {}
    try { localStorage.setItem("hauldesk-tours-completed", JSON.stringify(tourIds)) } catch {}
  }, mode, theme, ALL_TOUR_IDS)
}

/** `dark/teal` for office passes, plain `dark` for the theme-agnostic driver pass. */
const tag = (mode, theme) => (theme ? `${mode}/${theme}` : mode)

for (const mode of MODES) {
  for (const theme of THEMES) {
    const routes = theme === "indigo" ? ROUTES : THEMED_ROUTES.map((r) => [r, true])
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    const cdp = await page.createCDPSession()
    /**
     * Emulate a device's safe-area insets (the iPhone home indicator and the
     * notch). Chromium reports zero unless overridden, so
     * `env(safe-area-inset-bottom)` — which both the tab bar and the content
     * clearance are written in — evaluates to 0 in every ordinary headless
     * run. Verified working on this Chromium: a
     * `calc(7rem + env(safe-area-inset-bottom))` box measured 112px → 146px
     * under a 34px bottom inset. If a future Chromium drops the command we
     * record it and the run reports fewer probed combos rather than passing a
     * geometry it never actually tested.
     */
    let safeAreaSupported = true
    const setSafeArea = async ({ top = 0, bottom = 0 }) => {
      if (!safeAreaSupported) return false
      try {
        await cdp.send("Emulation.setSafeAreaInsetsOverride", {
          insets: { top, left: 0, bottom, right: 0 },
        })
        return true
      } catch {
        safeAreaSupported = false
        return false
      }
    }
    await seedProfile(page, mode, theme)
    // One login covers the authed routes.
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
    await page.type('input[type="email"], input[name="email"]', "owner@demo.thind")
    await page.type('input[type="password"], input[name="password"]', "ThindDemo1!")
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    ])
    for (const [route] of routes) {
      for (const vp of VIEWPORTS) {
        await page.setViewport({
          width: vp.width, height: vp.height,
          deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile,
        })
        // Always set it, including back to 0 — otherwise the inset leaks into
        // every viewport that follows a safe-area one.
        const insetApplied = await setSafeArea({ top: vp.safeAreaTop ?? 0, bottom: vp.safeAreaBottom ?? 0 })
        if ((vp.safeAreaTop || vp.safeAreaBottom) && !insetApplied) {
          overflows.push({ route, vp: vp.name, mode, theme, error: "safe-area emulation unavailable in this Chromium" })
          continue
        }
        try {
          await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 })
          await new Promise((r) => setTimeout(r, 800))
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
          )
          const slug = route.replace(/^\//, "").replace(/[\/?=&]+/g, "-") || "root"
          await page.screenshot({ path: path.join(OUT, `${slug}--${vp.name}--${mode}-${theme}.png`) })
          shots++
          if (overflow > 1) overflows.push({ route, vp: vp.name, mode, theme, overflow })
          if (vp.mobile) {
            const probe = await page.evaluate(underBarProbe)
            barProbes.push({
              route, vp: vp.name, mode, theme, status: probe.status,
              barH: probe.barH, clearance: probe.clearance,
            })
            if (probe.found.length > 0) {
              overflows.push({ route, vp: vp.name, mode, theme, buried: probe.found.map((b) => b.txt).join(" | ") })
            }
          }
        } catch (error) {
          overflows.push({ route, vp: vp.name, mode, theme, overflow: -1, error: error.message })
        }
      }
    }
    await context.close()
  }

  // ---- Driver app: its own session, its own bottom bar ----
  // The office session cannot reach /hub/driver (requireDriverUser), and the
  // driver app is the surface where a bottom-clearance regression actually
  // bit — 96px of padding under a 64px bar that grows by the home indicator.
  // Worth the extra login: it is also the most-used mobile screen in the app.
  // Forced-dark and theme-agnostic, so it runs once per mode, not per theme.
  const driverCtx = await browser.createBrowserContext()
  const driverPage = await driverCtx.newPage()
  const driverCdp = await driverPage.createCDPSession()
  await seedProfile(driverPage, mode, "indigo")
  try {
    await driverPage.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await driverPage.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
    await driverPage.type('input[type="email"], input[name="email"]', "driver@demo.thind")
    await driverPage.type('input[type="password"], input[name="password"]', "ThindDemo1!")
    await Promise.all([
      driverPage.click('button[type="submit"]'),
      driverPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    ])
    for (const vp of DRIVER_VIEWPORTS) {
      await driverPage.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      })
      try {
        await driverCdp.send("Emulation.setSafeAreaInsetsOverride", {
          insets: { top: vp.safeAreaTop ?? 0, left: 0, bottom: vp.safeAreaBottom ?? 0, right: 0 },
        })
      } catch { /* older Chromium — the plain pass still runs */ }
      await driverPage.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2", timeout: 60000 })
      await new Promise((r) => setTimeout(r, 900))
      await driverPage.screenshot({ path: path.join(OUT, `hub-driver--${vp.name}--${mode}.png`) })
      shots++
      const probe = await driverPage.evaluate(underBarProbe)
      barProbes.push({
        route: "/hub/driver", vp: vp.name, mode, theme: null, status: probe.status,
        barH: probe.barH, clearance: probe.clearance,
      })
      if (probe.found.length > 0) {
        overflows.push({
          route: "/hub/driver", vp: vp.name, mode, theme: null,
          buried: probe.found.map((b) => b.txt).join(" | "),
        })
      }
    }
  } catch (error) {
    overflows.push({ route: "/hub/driver", vp: "iphone", mode, theme: null, error: error.message })
  } finally {
    await driverCtx.close()
  }
}
await browser.close()

// Count what was actually written, next to what the loops planned — a run
// that lost screenshots to errors must not be reported as a full matrix.
const planned =
  MODES.length * VIEWPORTS.length * (ROUTES.length + (THEMES.length - 1) * THEMED_ROUTES.length) +
  MODES.length * DRIVER_VIEWPORTS.length
console.log(
  `${shots} screenshots → ${OUT}/ (${planned} planned` +
    `${shots === planned ? "" : ` — ${planned - shots} missing, see the errors below`})`
)

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
// Show the geometry the safe-area passes exist to exercise, so a green run is
// evidence rather than an assertion: clearance must track the bottom inset
// (and must NOT move for the top one).
for (const name of ["iphone", "iphone-safe", "iphone-top"]) {
  const s = probed.find((p) => p.vp === name && p.clearance != null)
  if (s) console.log(`   ${name.padEnd(11)} bar ${s.barH}px · content clearance ${s.clearance}px`)
}
const plain = probed.find((p) => p.vp === "iphone" && p.clearance != null)
const safe = probed.find((p) => p.vp === "iphone-safe" && p.clearance != null)
if (plain && safe && safe.clearance <= plain.clearance) {
  console.error(
    `❌ clearance did not grow with the safe-area inset (${plain.clearance}px → ${safe.clearance}px).\n` +
      "   The bottom padding is a flat value again, so an installed PWA's home\n" +
      "   indicator eats into it. Write it as calc(… + env(safe-area-inset-bottom))."
  )
  process.exit(1)
}
if (overflows.length > 0) {
  for (const o of overflows) {
    const where = `${o.route} @${o.vp} [${tag(o.mode, o.theme)}]`
    console.error(
      o.error
        ? `✗ ${where} — ${o.error}`
        : o.buried
          ? `✗ ${where} — content stranded under the tab bar: ${o.buried}`
          : `✗ ${where} — page scrolls horizontally by ${o.overflow}px`
    )
  }
  console.error("❌ viewport matrix failed.")
  process.exit(1)
}
console.log(
  "✅ viewport matrix passed — no horizontal page scroll at any width, either mode, any theme,\n" +
    "   and nothing stranded under the mobile tab bar at the bottom of any page."
)
