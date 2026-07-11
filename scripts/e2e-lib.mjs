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
 * Copy `.env.example` → `.env.local` for local runs (Next reads it; these scripts
 * do not load `.env.local` themselves). Shell exports still win when driving
 * against a remote base URL: E2E_BASE_URL=https://… POSTGRES_URL=… NEXTAUTH_SECRET=…
 */
import path from "node:path"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

// Fill unset vars from .env.local so smokes run out of the box on a rig that
// already boots the server from it (shell exports keep precedence — a remote
// drive exporting E2E_BASE_URL/POSTGRES_URL must not be overridden). Every
// smoke failed with "NEXTAUTH_SECRET required" on a fully configured rig
// before this, because Next reads .env.local but these scripts did not.
try {
  const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  for (const line of envLocal.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || m[1] in process.env) continue
    process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2")
  }
} catch {
  // no .env.local — fine, vars must come from the shell as before
}

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

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
