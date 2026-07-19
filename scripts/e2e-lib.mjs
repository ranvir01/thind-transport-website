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
