/**
 * E2E smoke: the public recruiting/marketing site — the surface that converts
 * CDL drivers into applications. The hub smokes and e2e-sweep.mjs only cover
 * /hub/*; until this script, nothing drove the public pages at all, so a
 * broken homepage or apply flow would ship silently.
 *
 * Checks every public route at 1440px and 390px for HTTP status, error
 * markers (error boundary / 404 / near-blank body), horizontal overflow at
 * 390px (mobile-first non-negotiable), and page JS errors. Read-only: never
 * submits a form (local rigs have no SMTP), but asserts the pre-qualify page
 * renders interactive form elements.
 *
 * Prereqs: server running (see e2e-lib.mjs header). No DB state consumed —
 * no reseed needed.
 *
 * Run: node scripts/e2e-public-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, check, failures, makeShot, waitForStableText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-public"
mkdirSync(OUT, { recursive: true })

// [name, url] — every linked public route in src/app (marketing + info).
const PAGES = [
  ["home", "/"],
  ["apply", "/apply"],
  ["pre-qualify", "/pre-qualify"],
  ["pay-rates", "/pay-rates"],
  ["pay-breakdown", "/pay-breakdown"],
  ["benefits", "/benefits"],
  ["routes", "/routes"],
  ["testimonials", "/testimonials"],
  ["about", "/about"],
  ["fleet", "/fleet"],
  ["fuel-program", "/fuel-program"],
  ["load-board", "/load-board"],
  ["loadoff", "/loadoff"],
  ["veterans", "/veterans"],
  ["resources", "/resources"],
  ["schedule-meeting", "/schedule-meeting"],
  ["privacy", "/privacy"],
]

const ERROR_MARKERS = [
  "application error",
  "unhandled runtime error",
  "internal server error",
  "this page could not be found",
  "road not found", // custom 404 in src/app/not-found.tsx
  "something went wrong",
]

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  const page = await browser.newPage()
  const shot = makeShot(OUT)
  const pageErrors = []
  page.on("pageerror", (e) => pageErrors.push(e.message.split("\n")[0]))

  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: width === 390 ? 844 : 950, deviceScaleFactor: width === 390 ? 2 : 1 })
    console.log(`Public site @ ${width}px`)
    for (const [name, url] of PAGES) {
      pageErrors.length = 0
      const res = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 30000 })
      await waitForStableText(page)
      const status = res?.status() ?? 0
      const text = await page.evaluate(() => (document.body?.innerText ?? "").trim())
      const lower = text.toLowerCase()
      const marker = ERROR_MARKERS.find((m) => lower.includes(m))
      check(status < 400, `${name}: HTTP ${status} at ${width}px`)
      check(!marker, `${name}: no error marker at ${width}px${marker ? ` (saw "${marker}")` : ""}`)
      check(text.length >= 100, `${name}: real content at ${width}px (${text.length} chars)`)
      check(pageErrors.length === 0, `${name}: no page JS errors at ${width}px${pageErrors[0] ? ` (${pageErrors[0]})` : ""}`)
      if (width === 390) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
        check(overflow <= 2, `${name}: no horizontal overflow at 390px (${overflow}px)`)
        await shot(page, `${name}-390`)
      }
    }
  }

  // The conversion entry point must render an actual form, not just copy.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/pre-qualify`, { waitUntil: "networkidle2" })
  const hasForm = await page.evaluate(
    () => !!document.querySelector("form input, form select, form button[type=submit], input, select")
  )
  check(hasForm, "pre-qualify: interactive form elements present")

  await browser.close()

  if (failures.length > 0) {
    console.error(`\n${failures.length} public-site check(s) failed`)
    process.exit(1)
  }
  console.log("\nPublic site smoke clean ✔")
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err.message)
  process.exit(1)
})
