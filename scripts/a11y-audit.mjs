/**
 * axe-core accessibility audit over the app's key screens, light AND dark.
 *
 * Usage: node scripts/a11y-audit.mjs        (server on :3000, demo seed loaded)
 *        BASE_URL=... node scripts/a11y-audit.mjs
 *
 * Gate: zero serious/critical WCAG 2.2 AA violations. Moderate/minor are
 * reported but do not fail the run (tracked, not ignored).
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import puppeteer from "puppeteer"

const require = createRequire(import.meta.url)
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8")
const BASE = process.env.BASE_URL || "http://localhost:3000"
const EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium"

// [route, persona] — persona picks the login; null = public.
const ROUTES = [
  ["/hub/login", null],
  ["/hub/demo", null],
  ["/hub/sandbox", null],
  ["/hub", "office"],
  ["/hub/loads", "office"],
  ["/hub/dispatch", "office"],
  ["/hub/money", "office"],
  ["/hub/drivers", "office"],
  ["/hub/fleet", "office"],
  ["/hub/safety", "office"],
  ["/hub/compliance", "office"],
  ["/hub/settings", "office"],
  ["/hub/driver", "driver"],
  ["/hub/portal", "broker"],
]
const LOGINS = {
  office: ["owner@demo.thind", "ThindDemo1!"],
  driver: ["driver@demo.thind", "ThindDemo1!"],
  broker: ["broker@demo.thind", "ThindDemo1!"],
}
// Forced-dark surfaces ignore the mode toggle — auditing them twice is noise.
const MODE_AGNOSTIC = new Set(["/hub/driver", "/hub/portal", "/hub/demo"])

async function login(page, persona) {
  const [email, password] = LOGINS[persona]
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
  await page.type('input[type="email"], input[name="email"]', email)
  await page.type('input[type="password"], input[name="password"]', password)
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
  ])
  await new Promise((r) => setTimeout(r, 1200))
}

async function audit(page, route, mode) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 })
  await new Promise((r) => setTimeout(r, 1000))
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const result = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
      resultTypes: ["violations"],
    })
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      count: v.nodes.length,
    }))
  }).then((violations) => ({ route, mode, violations }))
}

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

const results = []
for (const persona of [null, "office", "driver", "broker"]) {
  const routes = ROUTES.filter(([, p]) => p === persona)
  if (routes.length === 0) continue
  for (const mode of ["light", "dark"]) {
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.evaluateOnNewDocument((m) => {
      try { localStorage.setItem("hauldesk-mode", m) } catch {}
    }, mode)
    if (persona) await login(page, persona)
    for (const [route] of routes) {
      if (mode === "dark" && MODE_AGNOSTIC.has(route)) continue
      try {
        results.push(await audit(page, route, mode))
      } catch (error) {
        results.push({ route, mode, error: error.message, violations: [] })
      }
    }
    await context.close()
  }
}
await browser.close()

let serious = 0
let moderate = 0
for (const r of results) {
  if (r.error) {
    console.log(`\n⚠ ${r.route} [${r.mode}] — audit error: ${r.error}`)
    serious++
    continue
  }
  if (r.violations.length === 0) continue
  console.log(`\n${r.route} [${r.mode}]`)
  for (const v of r.violations) {
    const hard = v.impact === "serious" || v.impact === "critical"
    if (hard) serious += 1
    else moderate += 1
    console.log(`  ${hard ? "✗" : "·"} [${v.impact}] ${v.id}: ${v.help} (${v.count} node${v.count === 1 ? "" : "s"})`)
    for (const n of v.nodes) console.log(`      ${n}`)
  }
}
const audited = results.filter((r) => !r.error).length
console.log(`\n${audited} screen-modes audited · ${serious} serious/critical · ${moderate} moderate/minor`)
if (serious > 0) {
  console.error("❌ a11y gate failed — fix serious/critical violations.")
  process.exit(1)
}
console.log("✅ a11y gate passed (zero serious/critical WCAG 2.2 AA violations).")
