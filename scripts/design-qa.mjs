/**
 * design-qa.mjs — automated visual-quality auditor.
 *
 * The failure mode this exists to catch: an agent editing markup cannot SEE the
 * rendered pixels, so contrast bugs (dark text on a dark card), horizontal
 * overflow, and sub-44px tap targets ship unnoticed. Those are all machine-
 * checkable from the live DOM + computed styles — this walks every route at
 * phone / tablet / desktop widths and reports what a human would flag.
 *
 * WHAT IT CHECKS (per route × viewport)
 *   - Contrast: every visible text run's effective color vs its effective
 *     (alpha-composited) background, scored against WCAG 2.1 AA. Normal text
 *     needs 4.5:1; large text (>=24px, or >=18.66px bold) needs 3:1. Runs over
 *     a gradient/image background are reported as WARN (approximate), never a
 *     hard FAIL, to avoid false alarms on hero photos.
 *   - Overflow: elements whose right edge crosses the viewport (the cause of
 *     the horizontal-scroll jitter on phones).
 *   - Tap targets (mobile widths only): links/buttons/inputs under 44×44 CSS px.
 *   - Images missing a non-empty alt attribute.
 *
 * USAGE
 *   Server must be running (npm run build && npm run start, or npm run dev).
 *     node scripts/design-qa.mjs                 # default marketing routes
 *     node scripts/design-qa.mjs /loadoff /apply # specific routes
 *     DESIGN_QA_HUB=1 node scripts/design-qa.mjs  # also audit hub routes (needs demo login)
 *     E2E_BASE_URL=http://localhost:3000 node scripts/design-qa.mjs
 *   Exit code is non-zero when any hard FAIL is found — wire it into a routine.
 *
 * Reuses scripts/e2e-lib.mjs for browser launch (Chromium resolution, sandbox
 * flags) and the demo login, so it runs on the same rigs as the e2e smokes.
 */
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { BASE, launchBrowser, login, waitForStableText, sleep } from "./e2e-lib.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, "..", ".design-qa")

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 768, height: 1024, isMobile: false },
  { name: "desktop", width: 1440, height: 900, isMobile: false },
]

// Public marketing routes — what the fellowship reviewers and drivers see.
// (Every entry is a real page under src/app; verify with `ls src/app`.)
const PUBLIC_ROUTES = [
  "/",
  "/loadoff",
  "/schedule-meeting",
  "/apply",
  "/drivers",
  "/brokers",
  "/app",
  "/pre-qualify",
  "/pay-rates",
  "/pay-breakdown",
  "/benefits",
  "/shippers",
  "/owner-operators",
  "/trust",
  "/tools/freight-class-calculator",
  "/about",
  "/routes",
  "/veterans",
  "/fuel-program",
  "/resources",
  "/load-board",
  "/privacy",
  "/cdl-jobs",
  "/cdl-jobs/washington",
]

// Hub (software) routes — audited only with DESIGN_QA_HUB=1 (they need a login).
// "A page not in this list is a page not being checked" — design-qa-routines.md
// Routine B. This covered 10 of ~25 office routes and none of the driver PWA,
// which is how the eight text-fg-on-bg-accent contrast failures survived: most
// of the components carrying them render on routes that were never audited.
const HUB_ROUTES = [
  "/hub",
  "/hub/loads",
  "/hub/dispatch",
  "/hub/invoices",
  "/hub/settlements",
  "/hub/fleet",
  "/hub/compliance",
  "/hub/leads",
  "/hub/outreach",
  "/hub/settings/integrations",
  // Added: the rest of the office surface.
  "/hub/loadboard",
  "/hub/money",
  "/hub/fuel",
  "/hub/drivers",
  "/hub/customers",
  "/hub/reports",
  "/hub/import",
  "/hub/messages",
  "/hub/tasks",
  "/hub/planner",
  "/hub/capacity",
  "/hub/recruiting",
  "/hub/safety",
]

// The driver PWA is a forced-dark surface with its own token rules, so it is
// audited as its own group rather than mixed in with the office routes.
const DRIVER_ROUTES = [
  "/hub/driver",
  "/hub/driver/loads",
  "/hub/driver/dvir",
]

const cliRoutes = process.argv.slice(2).filter((a) => a.startsWith("/"))

/* ---- WCAG contrast math (runs in Node for the report; mirrored in-page) ---- */
function relLuminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}
function contrastRatio(fg, bg) {
  const l1 = relLuminance(fg)
  const l2 = relLuminance(bg)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Collect audit findings from the current page. Returns plain data (colors as
 * [r,g,b], booleans) so the Node side does the WCAG scoring and formatting.
 */
async function collectFindings(page, isMobile) {
  return page.evaluate((isMobile) => {
    // Colour parsing goes through a canvas rather than a regex.
    //
    // This used to match /rgba?\(...\)/ only, which quietly broke the moment the
    // marketing palette moved to OKLCH: Chromium reports those computed values
    // as `lab(...)`, the regex returned null, and every element using the new
    // design system was SKIPPED — the contrast gate reported zero failures on
    // markup that was rendering dark-on-dark. Painting the colour and reading
    // the pixel back works for any notation the browser can render (rgb, hsl,
    // lab, oklch, color(), named), so the parser can never silently fall behind
    // the stylesheet again.
    const _cv = document.createElement("canvas")
    _cv.width = _cv.height = 1
    const _ctx = _cv.getContext("2d", { willReadFrequently: true })
    const parse = (str) => {
      if (!str) return null
      const s = String(str).trim()
      if (!s || s === "transparent" || s === "none") return null

      // Fast path: plain rgb()/rgba() needs no round-trip.
      const m = s.match(/^rgba?\(([^)]+)\)$/)
      if (m) {
        const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(parseFloat)
        const [r, g, b, a = 1] = parts
        if (a === 0) return null
        return [r, g, b, a]
      }

      // Everything else: let the engine resolve it to actual pixels. A colour
      // the engine cannot parse leaves fillStyle at the sentinel, which is how
      // we tell "unsupported" apart from "genuinely black".
      _ctx.fillStyle = "#123456"
      _ctx.fillStyle = s
      if (_ctx.fillStyle === "#123456" && !/#123456/i.test(s)) return null
      _ctx.clearRect(0, 0, 1, 1)
      _ctx.fillRect(0, 0, 1, 1)
      const d = _ctx.getImageData(0, 0, 1, 1).data
      const a = d[3] / 255
      if (a === 0) return null
      return [d[0], d[1], d[2], a]
    }
    const composite = (fg, bg) => {
      // fg over bg, both [r,g,b,a] with a in [0,1]
      const a = fg[3] + bg[3] * (1 - fg[3])
      if (a === 0) return [255, 255, 255, 0]
      const c = (i) => Math.round((fg[i] * fg[3] + bg[i] * bg[3] * (1 - fg[3])) / a)
      return [c(0), c(1), c(2), a]
    }
    // Effective background: composite ancestor backgrounds until opaque.
    // Returns { rgb:[r,g,b]|null, complex:bool }. rgb=null means "unassessable":
    // the nearest painted background is a gradient or image whose color we can't
    // read, so scoring against whatever solid sits BEHIND it (often the body's
    // dark base) would be a false reading. Callers skip null-bg runs. A solid
    // color found before any gradient/image still scores normally — that's the
    // reliable hard-fail path (dark text on a dark card, etc.).
    const effectiveBg = (el) => {
      let acc = [0, 0, 0, 0]
      let node = el
      while (node && node !== document.documentElement.parentNode) {
        const cs = getComputedStyle(node)
        const bg = parse(cs.backgroundColor)
        if (bg) {
          acc = composite(acc, bg)
          if (acc[3] >= 0.999) return { rgb: [acc[0], acc[1], acc[2]], complex: false }
        }
        // A gradient/image layer is opaque-ish but of unknown color. If nothing
        // solid has accumulated closer to the text, we cannot score it — stop.
        if (cs.backgroundImage && cs.backgroundImage !== "none") {
          return { rgb: null, complex: true }
        }
        node = node.parentElement
      }
      // Nothing opaque and no gradient/image up the chain — the page base shows.
      const base = composite(acc, [255, 255, 255, 1])
      return { rgb: [base[0], base[1], base[2]], complex: false }
    }
    const visible = (el, rect) => {
      const cs = getComputedStyle(el)
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) return false
      if (rect.width < 2 || rect.height < 2) return false
      if (rect.bottom < 0 || rect.right < 0) return false
      if (rect.top > window.innerHeight * 3) return false // far below the fold; sampled enough above
      return true
    }
    const selectorFor = (el) => {
      const id = el.id ? `#${el.id}` : ""
      const cls = (el.className && typeof el.className === "string")
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : ""
      return `${el.tagName.toLowerCase()}${id}${cls}`
    }

    const contrast = []
    const seen = new Set()
    // Text runs: elements with a direct non-whitespace text node.
    for (const el of document.querySelectorAll("body *")) {
      const hasDirectText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 1
      )
      if (!hasDirectText) continue
      const rect = el.getBoundingClientRect()
      if (!visible(el, rect)) continue
      const cs = getComputedStyle(el)
      const fg = parse(cs.color)
      if (!fg) continue
      // Start from the element itself: its own background box is painted behind
      // its text. Starting from the parent misreads a solid-colored button/badge
      // with light text as light-on-light (false positive).
      const bgInfo = effectiveBg(el)
      if (!bgInfo.rgb) continue // unassessable (text over a gradient/image)
      const fgOnBg = fg[3] < 1 ? composite(fg, [...bgInfo.rgb, 1]) : fg
      const key = selectorFor(el) + "|" + cs.color + "|" + bgInfo.rgb.join(",")
      if (seen.has(key)) continue
      seen.add(key)
      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      contrast.push({
        selector: selectorFor(el),
        text: el.textContent.trim().slice(0, 60),
        fg: [fgOnBg[0], fgOnBg[1], fgOnBg[2]],
        bg: bgInfo.rgb,
        complexBg: bgInfo.complex,
        size,
        large,
      })
    }

    // Horizontal overflow: elements crossing the right viewport edge.
    const overflow = []
    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const rect = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (cs.position === "fixed") continue
        if (rect.width < 4 || rect.height < 4) continue
        if (rect.right > window.innerWidth + 2 && rect.left >= -1 && rect.left < window.innerWidth) {
          overflow.push({ selector: selectorFor(el), right: Math.round(rect.right), text: el.textContent.trim().slice(0, 40) })
        }
      }
    }

    // Tap targets (mobile only): interactive elements under 44px.
    const tap = []
    if (isMobile) {
      for (const el of document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea')) {
        const rect = el.getBoundingClientRect()
        if (!visible(el, rect)) continue
        const cs = getComputedStyle(el)
        if (cs.position === "fixed" && rect.bottom > window.innerHeight) continue
        if ((rect.width < 44 || rect.height < 44) && el.offsetParent !== null) {
          tap.push({
            selector: selectorFor(el),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30),
          })
        }
      }
    }

    // Images missing alt.
    const imgAlt = []
    for (const img of document.querySelectorAll("img")) {
      const rect = img.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) continue
      if (!img.hasAttribute("alt") || img.getAttribute("alt").trim() === "") {
        imgAlt.push({ src: (img.getAttribute("src") || "").slice(0, 60) })
      }
    }

    return { contrast, overflow, tap, imgAlt }
  }, isMobile)
}

async function auditRoute(page, route, viewport) {
  // page.setViewport() implicitly reloads whatever page is CURRENTLY loaded
  // when isMobile toggles (Chromium's mobile-emulation switch requires a
  // reload to take effect) — and that implicit reload has no timeout
  // fallback like our own page.goto() below. If the previous route left an
  // in-flight request that never fires a CDP finish/fail event (observed
  // with certain image requests under headless Chromium), setViewport()
  // hangs for the full 30s navigation timeout, uncaught, and design-qa dies
  // mid-sweep. Go to about:blank first so the implicit reload has nothing
  // in-flight to hang on.
  await page.goto("about:blank")
  await page.setViewport({ width: viewport.width, height: viewport.height, isMobile: viewport.isMobile })
  const url = BASE + route
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 })
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
  }
  await waitForStableText(page, { settle: 200, timeout: 4000 })
  // Nudge lazy content / dismiss any auto-hide nav state.
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(150)
  const raw = await collectFindings(page, viewport.isMobile)

  const fails = []
  const warns = []
  for (const c of raw.contrast) {
    const ratio = contrastRatio(c.fg, c.bg)
    const required = c.large ? 3.0 : 4.5
    if (ratio < required) {
      const finding = { ...c, ratio: Math.round(ratio * 100) / 100, required }
      if (c.complexBg) warns.push({ type: "contrast", ...finding })
      else fails.push({ type: "contrast", ...finding })
    }
  }
  for (const o of raw.overflow) fails.push({ type: "overflow", ...o })
  for (const t of raw.tap) warns.push({ type: "tap-target", ...t })
  for (const a of raw.imgAlt) warns.push({ type: "img-alt", ...a })
  return { route, viewport: viewport.name, fails, warns }
}

async function main() {
  const routes = cliRoutes.length ? cliRoutes : PUBLIC_ROUTES
  const includeHub = process.env.DESIGN_QA_HUB === "1"
  const allRoutes =
    includeHub && !cliRoutes.length ? [...routes, ...HUB_ROUTES, ...DRIVER_ROUTES] : routes

  console.log(`\n🎨 design-qa against ${BASE}`)
  console.log(`   ${allRoutes.length} routes × ${VIEWPORTS.length} viewports\n`)

  const browser = await launchBrowser()
  const results = []
  try {
    if (includeHub) {
      const authed = await browser.newPage()
      await login(authed, "owner@demo.thind")
      await authed.close()
    }
    const page = await browser.newPage()
    for (const route of allRoutes) {
      for (const viewport of VIEWPORTS) {
        const r = await auditRoute(page, route, viewport)
        results.push(r)
        const f = r.fails.length
        const w = r.warns.length
        const mark = f > 0 ? "❌" : w > 0 ? "⚠️ " : "✅"
        console.log(`${mark} ${route}  [${r.viewport}]  ${f} fail, ${w} warn`)
        for (const fail of r.fails.slice(0, 6)) {
          if (fail.type === "contrast") {
            console.log(`     FAIL contrast ${fail.ratio}:1 (need ${fail.required}) — "${fail.text}"  fg rgb(${fail.fg}) on rgb(${fail.bg})  ${fail.selector}`)
          } else if (fail.type === "overflow") {
            console.log(`     FAIL overflow right=${fail.right}px (vw exceeded) — ${fail.selector} "${fail.text}"`)
          }
        }
      }
    }
  } finally {
    await browser.close()
  }

  const totalFails = results.reduce((n, r) => n + r.fails.length, 0)
  const totalWarns = results.reduce((n, r) => n + r.warns.length, 0)
  mkdirSync(OUT_DIR, { recursive: true })
  const reportPath = path.join(OUT_DIR, "report.json")
  writeFileSync(reportPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2))

  console.log(`\n──────── design-qa summary ────────`)
  console.log(`  ${totalFails} hard failures (contrast / overflow)`)
  console.log(`  ${totalWarns} warnings (approx-bg contrast / tap-target / alt)`)
  console.log(`  full report: ${path.relative(process.cwd(), reportPath)}`)
  if (totalFails > 0) {
    console.log(`\n❌ design-qa found ${totalFails} hard failures.`)
    process.exit(1)
  }
  console.log(`\n✅ design-qa: no hard failures.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
