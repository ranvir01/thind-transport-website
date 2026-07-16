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
 */
import path from "node:path"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"
import puppeteer from "puppeteer"

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

if (/localhost|127\.0\.0\.1/.test(BASE)) {
  const envPath = path.join(process.cwd(), ".env.local")
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
    }
  }
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

/** Failed check labels; scripts report these and exit non-zero at the end. */
export const failures = []

export const check = (ok, label) => {
  console.log(`  ${ok ? "✅" : "❌"} ${label}`)
  if (!ok) failures.push(label)
}

export async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text
  )
}

export async function login(page, email, password = "ThindDemo1!") {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
  await page.type("#email", email)
  await page.type("#password", password)
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
    page.click('button[type="submit"]'),
  ])
}

/** Screenshot helper bound to the script's output dir. */
export function makeShot(outDir, { fullPage = false } = {}) {
  return async (page, name) => {
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage })
    console.log(`  📸 ${name}`)
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
