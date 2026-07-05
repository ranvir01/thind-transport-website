/**
 * Shared helpers for the scripts/e2e-*.mjs Puppeteer smokes. Every smoke
 * script had its own copy of these; behavior differences that matter are
 * per-call (timeouts, fullPage) — pass them at the call site.
 */
import path from "node:path"

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

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
