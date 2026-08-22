/**
 * Shared helpers for the scripts/e2e-*.mjs Puppeteer smokes. Every smoke
 * script had its own copy of these; behavior differences that matter are
 * per-call (timeouts, fullPage) — pass them at the call site.
 *
 * Prerequisites (the Next.js server must already be running — `npm run dev`
 * or `npm run start` after `npm run build`):
 *
 *   POSTGRES_URL=<url> npm run db:migrate && npm run seed:demo
 *   NEXTAUTH_SECRET=<secret>   # or AUTH_SECRET — hub login 401s with MissingSecret if blank
 *   CREDENTIALS_KEY=<32+ chars> # server-side; without it the integrations screen shows a
 *                               # "Set CREDENTIALS_KEY first" card and the mailbox-oauth /
 *                               # DAT smokes stall waiting for the connect form
 *
 * Fresh rig (cloud agent, new container): run `npm run setup:canvas-deps`
 * BEFORE `npm install` — the `canvas` devDependency's node-gyp build needs
 * system pangocairo headers, and without them the whole install aborts,
 * which surfaces later as "Cannot find package 'pg'" from every script.
 *
 * State-consuming smokes (dispatch, invoices, settlements, advances,
 * compliance, messages, expenses, fuel, customers, loads, fleet, tasks,
 * safety, reports) call
 * reseed() themselves, so no manual seed:demo between runs on a local rig.
 *
 * Copy `.env.example` → `.env.local` for local runs. Against a localhost BASE,
 * this module loads `.env.local` itself (fallback only — shell exports win), so
 * the same file that configures the server configures the smokes; no separate
 * in-shell exports needed. Remote drives keep explicit-export discipline
 * (`.env.local` holds the LOCAL server's secret, which cannot sign cookies the
 * remote server accepts — silently using it would turn a clear "secret required"
 * error into baffling 401s): E2E_BASE_URL=https://… POSTGRES_URL=… NEXTAUTH_SECRET=…
 *
 * BEFORE repairing a stale smoke: run `npm run agent:branches` and scan the
 * `files:` lists for the script you're about to touch — while the integrator
 * automation is stalled, earlier QA sessions' repairs sit unmerged on session
 * branches and successive runs keep re-making them (four branches once carried
 * the identical onboarding-wizard fix). If a pending branch already has the
 * repair, reference it in your Backlog: trailer instead of committing a
 * duplicate; only re-fix when yours is materially better.
 */
import path from "node:path"
import os from "node:os"
import { existsSync, readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"
import puppeteer from "puppeteer"
import { isBenignResourceUrl } from "./e2e-console-filter.mjs"
import { loadEnvLocal } from "./env-local.mjs"

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

// Cloud QA rigs install with PUPPETEER_SKIP_DOWNLOAD=1 (the sandbox egress
// proxy rejects puppeteer's postinstall Chrome download), so puppeteer has no
// browser of its own and every smoke dies at launch with "Could not find
// Chrome". Those rigs ship a Playwright-managed chromium instead; point
// puppeteer at it — only when nothing is configured and puppeteer's own cache
// is empty, so a developer's real Chrome install always wins. Setting the env
// var alone cannot fix THIS process — puppeteer snapshots its configuration
// when its module initializes, before this body runs — so also mutate the
// shared instance's configuration, which resolveExecutablePath reads at
// launch(). The env var still matters for child processes (e2e-run-all spawns
// each smoke, and they inherit it before their puppeteer initializes).
if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
  const puppeteerCache =
    process.env.PUPPETEER_CACHE_DIR ?? path.join(os.homedir(), ".cache", "puppeteer")
  const fallback = [
    process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium"),
    "/opt/pw-browsers/chromium",
  ].find((p) => p && existsSync(p))
  if (fallback && !existsSync(path.join(puppeteerCache, "chrome"))) {
    process.env.PUPPETEER_EXECUTABLE_PATH = fallback
    puppeteer.configuration.executablePath = fallback
  }
}

if (/localhost|127\.0\.0\.1/.test(BASE)) {
  // No skipWhenSet guard here on purpose: the smokes need every key in the
  // file (seed credentials, CRON_SECRET), not just the database URL.
  loadEnvLocal()
}

/**
 * Re-run `scripts/seed-demo.mjs` so state-consuming smokes (dispatch advances
 * loads, invoices consumes the pod_received steel-beams load, settlements
 * applies advances, advances decides requests, compliance resolves the seeded
 * consortium item, messages buries the seeded thread preview, expenses piles
 * up duplicate rows, fuel drains the unassigned inbox and flips road badges
 * to reefer, customers accumulates contacts and CRM notes, loads books a new
 * load and advances the THD- reference counter) start from the
 * exposure totals and load lifecycle the seed
 * pins. Runs only against a localhost BASE — a
 * remote E2E_BASE_URL means the local POSTGRES_URL is not that server's
 * database, so reseeding would either miss or hit the wrong one; set
 * E2E_RESEED=1 to force it when the local DB really does back the remote URL.
 * Throws when the seed fails: a stale seed makes every cent-exact check lie.
 */
export function reseed() {
  if (!/localhost|127\.0\.0\.1/.test(BASE) && process.env.E2E_RESEED !== "1") {
    console.log("⏭  reseed skipped: E2E_BASE_URL is remote (set E2E_RESEED=1 to force)")
    return false
  }
  console.log("🌱 reseeding demo data (scripts/seed-demo.mjs)")
  const result = spawnSync(process.execPath, ["scripts/seed-demo.mjs"], { stdio: "inherit" })
  if (result.status !== 0) {
    throw new Error("seed-demo.mjs failed — fix the seed before trusting any smoke result")
  }
  // hub.carrier_settings is not in the seed's TRUNCATE list, so recurringLanes
  // rules written by an earlier drive survive the reseed pointing at load ids
  // that no longer exist; the loads-page rollup then renders dead
  // /hub/loads/<uuid> anchors that poison any smoke matching load links
  // generically (the recurring smokes 404 on them). Reset the key with the seed.
  //
  // hub.carriers is likewise absent from the TRUNCATE list (ON CONFLICT DO
  // NOTHING in seed-demo.mjs) — a suspend-flow smoke that dies mid-run (or a
  // manual admin-suspend drive) leaves status = 'suspended' on Thind or
  // Cascade Demo Lines, and every later local run then bounces every login
  // to /hub/suspended before it even reaches the screen under test. Force
  // both demo tenants back to 'active' on every reseed.
  const cleanup = spawnSync(process.execPath, ["-e", `
    const { Client } = require("pg");
    const c = new Client({ connectionString: process.env.POSTGRES_URL });
    c.connect()
      .then(() => c.query("UPDATE hub.carrier_settings SET settings = settings - 'recurringLanes' WHERE settings ? 'recurringLanes'"))
      .then(() => c.query("UPDATE hub.carriers SET status = 'active' WHERE status <> 'active'"))
      .then(() => c.end())
      .catch((err) => { console.error("reseed cleanup: " + err.message); process.exit(1); });
  `], { stdio: "inherit" })
  if (cleanup.status !== 0) {
    throw new Error("reseed cleanup failed — stale recurringLanes rules or a suspended tenant would poison the next smoke")
  }
  return true
}

/**
 * Puppeteer resolves PUPPETEER_EXECUTABLE_PATH when its module is imported —
 * smokes import puppeteer before this lib, so setting the env var here would
 * be silently ignored. Resolve the browser binary ourselves instead and pass
 * it as an explicit launch option: env var first, then Puppeteer's own cache,
 * then the Playwright-provisioned Chromium that agent sandboxes (Claude Code
 * web/cloud, Cursor) preinstall under /opt/pw-browsers. Keeps every smoke
 * runnable with zero per-shell exports on those rigs.
 */
function resolveChromium() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv
    throw new Error(`PUPPETEER_EXECUTABLE_PATH points at a missing file: ${fromEnv}`)
  }
  try {
    const bundled = puppeteer.executablePath()
    if (bundled && existsSync(bundled)) return undefined // Puppeteer's own cache works; don't override
  } catch {
    // no bundled browser (postinstall download skipped/failed) — fall through
  }
  const root = "/opt/pw-browsers"
  const candidates = [path.join(root, "chromium")] // stable symlink to the current binary
  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      if (/^chromium-\d+$/.test(entry)) candidates.push(path.join(root, entry, "chrome-linux", "chrome"))
    }
  }
  return candidates.find((p) => existsSync(p)) // undefined → let puppeteer.launch raise its usual error
}

/** Launch Chromium with the standard smoke flags; options merge over the defaults. */
export async function launchBrowser(options = {}) {
  const executablePath = resolveChromium()
  return puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
    ...options,
  })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * URL-aware browser-error tracker. Push genuine defects into `errors`:
 *   • console `error` lines that are NOT the URL-less "Failed to load resource"
 *     message — real JS exceptions, failed assertions, etc. (The resource line
 *     carries no URL, so it is captured with its URL by the response handler
 *     below instead, where benign-vs-real is actually decidable.)
 *   • 404 responses whose URL is not benign local-rig / browser noise
 *     (isBenignResourceUrl) — recorded WITH the URL so a real break is
 *     debuggable, not a bare count.
 *   • request failures other than net::ERR_ABORTED (aborted RSC prefetches are
 *     normal when a navigation interrupts sidebar link prefetching).
 *
 * Replaces the per-smoke `consoleErrors.filter(/favicon|manifest|404/)` gates,
 * which either false-failed on Vercel's off-platform analytics scripts
 * (/_vercel/insights, /_vercel/speed-insights 404 under `next start`) or blanket-
 * dropped every "Failed to load resource" line and lost real signal. Pass the
 * same `errors` array for a second page (dispatcher/second-context flows) to
 * accumulate both pages' defects in one place.
 */
export function trackPageErrors(page, errors = []) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (/Failed to load resource/i.test(text)) return // captured with URL below
    errors.push(text)
  })
  page.on("response", (res) => {
    if (res.status() === 404 && !isBenignResourceUrl(res.url())) {
      errors.push(`HTTP 404 ${res.url()}`)
    }
  })
  page.on("requestfailed", (req) => {
    const errText = req.failure()?.errorText ?? "failed"
    if (errText === "net::ERR_ABORTED") return
    if (!isBenignResourceUrl(req.url())) errors.push(`REQFAIL ${req.url()} ${errText}`)
  })
  return { errors }
}

/** Failed check labels; scripts report these and exit non-zero at the end. */
export const failures = []

export const check = (ok, label) => {
  console.log(`  ${ok ? "✅" : "❌"} ${label}`)
  if (!ok) failures.push(label)
}

/**
 * Console "error" noise every smoke sees on every page load, unrelated to
 * whatever the smoke is actually testing: missing favicon, missing manifest
 * fetch, and — since 229885af added @vercel/analytics + @vercel/speed-insights
 * — their /_vercel/insights and /_vercel/speed-insights script 404s, which
 * stay 404 until Web Analytics is enabled in the Vercel dashboard
 * (docs/ops/AGENT_TASKS.md Task 6). Each script used to carry its own copy of
 * this regex; several were missing the _vercel exclusion (false-failing the
 * "no console errors" check the first time they're driven against a live
 * `next start` server post-229885af) and a few fell back to a much broader
 * `404`/`Failed to load resource` exclusion that would also swallow a
 * genuinely broken image or script. Centralized here so the fix lands once;
 * scripts needing an additional exclusion (a 401 or service-worker message
 * their own flow expects) chain `.filter()` on the result.
 */
export const BENIGN_CONSOLE_ERROR = /favicon|manifest|_vercel\/(insights|speed-insights)/i

export function realConsoleErrors(errors) {
  return errors.filter((e) => !BENIGN_CONSOLE_ERROR.test(e))
}

export async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text
  )
}

/**
 * Wait until a client-side navigation has landed on `pathname` AND the page
 * shows `text`. Retires the fixed-sleep-then-assert pattern after
 * router.push() flows (form submit → toast → nav), which loses the race
 * under full-suite CPU contention. Returns true/false instead of throwing
 * so callers can feed it straight into check().
 */
/**
 * waitForText that reports instead of throwing: resolves true once `text`
 * appears in the body, false on timeout. For sleep-then-assert sites where a
 * missing condition should be a labeled check() failure, not a crashed smoke.
 */
export async function textAppears(page, text, timeout = 20000) {
  return page
    .waitForFunction(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      { timeout },
      text
    )
    .then(() => true)
    .catch(() => false)
}

/** Boolean-returning inverse of textAppears: resolves true once `text` has left the page. */
export async function textGone(page, text, timeout = 20000) {
  return page
    .waitForFunction(
      (t) => !document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      { timeout },
      text
    )
    .then(() => true)
    .catch(() => false)
}

/**
 * Wait until document.body.innerText stops changing for `settle` ms (hydration
 * has finished mutating the DOM), or `timeout` elapses — whichever first.
 * Replaces a fixed post-navigation sleep guessed to outlast hydration: fast
 * pages return as soon as text stabilizes instead of always paying the full
 * guessed delay, and slow/CPU-contended pages get up to `timeout` instead of
 * racing a duration picked for the common case.
 */
export async function waitForStableText(page, { settle = 150, timeout = 3000 } = {}) {
  const deadline = Date.now() + timeout
  let last = null
  let stableSince = null
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body?.innerText ?? "")
    if (text === last) {
      if (stableSince === null) stableSince = Date.now()
      if (Date.now() - stableSince >= settle) return
    } else {
      last = text
      stableSince = null
    }
    await sleep(50)
  }
}

/** Boolean-returning wait for a client-side navigation to land on `pathname` (no text requirement). */
export async function waitForPath(page, pathname, timeout = 20000) {
  return page
    .waitForFunction((p) => location.pathname === p, { timeout }, pathname)
    .then(() => true)
    .catch(() => false)
}

export async function waitForPathAndText(page, pathname, text, timeout = 20000) {
  return page
    .waitForFunction(
      (p, t) => location.pathname === p && document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      { timeout },
      pathname,
      text
    )
    .then(() => true)
    .catch(() => false)
}

/**
 * localStorage key + tour id that `HubTour.tsx` uses to remember the first-run
 * spotlight tour has been seen (STORAGE_KEY / AUTOSTART_TOUR_ID there).
 */
const TOUR_STORAGE_KEY = "hauldesk-tours-completed"
const AUTOSTART_TOUR_ID = "today-desk"

/**
 * Mark the first-run "today-desk" tour as already seen for this browser.
 *
 * Every smoke launches a fresh browser profile, so localStorage is empty and
 * `HubTourHost` auto-starts the spotlight tour ~700ms after any landing on
 * /hub. Its scrim is a real `fixed inset-0` modal backdrop: the next
 * `page.click` anywhere on the screen hits the scrim instead of the target and
 * is spent dismissing the tour. That is invisible in a screenshot taken
 * afterwards — the tour is gone by then — and it read for a long time as "the
 * notification never arrived" in e2e-safety-smoke step 6, when the row was in
 * the database the whole time and only the click had been eaten.
 *
 * Suppressing the autostart is not hiding a product defect: dismiss-on-click is
 * what the tour is meant to do, and a real operator sees it once. An explicit
 * `?tour=` still opens the tour, so a smoke that wants to drive it can.
 */
export async function skipFirstRunTour(page) {
  await page.evaluate(
    (key, id) => {
      try {
        const raw = localStorage.getItem(key)
        const list = raw ? JSON.parse(raw) : []
        if (!list.includes(id)) {
          list.push(id)
          localStorage.setItem(key, JSON.stringify(list))
        }
      } catch {
        /* storage disabled — the tour just runs, same as before */
      }
    },
    TOUR_STORAGE_KEY,
    AUTOSTART_TOUR_ID
  )
}

export async function login(page, email, password = "ThindDemo1!") {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
  await waitForText(page, "One login for dispatch, drivers, and partners.")
  // Same origin as the app, so this write is already in place before the first
  // /hub render decides whether to auto-start the tour.
  await skipFirstRunTour(page)
  await page.type("#email", email)
  await page.type("#password", password)
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
    page.click('button[type="submit"]'),
  ])
}

/**
 * Screenshot helper bound to the script's output dir. Retries through the
 * mid-navigation race: a capture that lands between documents (right after a
 * submit-click that commits a full navigation) fails with
 * "Cannot take screenshot with 0 width" or a detached-frame ProtocolError.
 * One settle-and-retry succeeds; a persistently broken page still throws.
 */
export function makeShot(outDir, { fullPage = false } = {}) {
  return async (page, name) => {
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage })
        console.log(`  📸 ${name}`)
        return
      } catch (err) {
        lastErr = err
        await sleep(500)
      }
    }
    throw lastErr
  }
}

/**
 * Wait for a CSS selector to be present and visible, then click it — retries
 * through the race where a click lands right after `page.goto`/navigation and
 * hits "Attempted to use detached Frame" because the DOM node from the old
 * render was still resolving when waitForSelector/click ran. A flat `sleep`
 * before a bare `page.click` doesn't guard against this; polling with a fresh
 * waitForSelector each attempt does.
 */
export async function clickSelector(page, selector, { timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout
  let lastErr
  while (Date.now() < deadline) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: Math.max(deadline - Date.now(), 100) })
      await page.click(selector)
      return
    } catch (err) {
      lastErr = err
      await sleep(250)
    }
  }
  throw new Error(`clickSelector: could not click "${selector}": ${lastErr?.message ?? "timed out"}`)
}

/** Click the first `tag` element whose text contains `text`, polling until timeout. */
export async function clickByText(page, text, { tag = "button", timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const clicked = await page.evaluate(
      ({ text, tag }) => {
        const el = [...document.querySelectorAll(tag)].find((n) =>
          (n.textContent ?? "").toLowerCase().includes(text.toLowerCase())
        )
        if (el) {
          el.click()
          return true
        }
        return false
      },
      { text, tag }
    )
    if (clicked) return true
    await sleep(250)
  }
  throw new Error(`Could not find ${tag} containing "${text}"`)
}

/**
 * Wait for a load-detail page to actually render.
 *
 * Do NOT use waitForText(page, "Rate") for this: the sidebar renders "Paste
 * rate con", so that resolves instantly against a still-blank document and
 * every subsequent read comes back null. It fails loudest under full-rig
 * load, where the render loses the race it wins in isolation — which is how
 * two smokes spent weeks looking like CI flakes instead of the timing bug
 * they were. Anchors on the load's own THD- heading.
 */
export async function waitForLoadDetail(page, timeout = 20000) {
  await page
    .waitForFunction(
      () => /^THD-\d+$/.test(document.querySelector("h1")?.textContent?.trim() ?? ""),
      { timeout }
    )
    .catch(() => {
      throw new Error("load-detail heading (THD-…) never rendered")
    })
}
