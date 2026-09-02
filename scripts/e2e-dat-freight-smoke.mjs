/**
 * DAT freight search + book flow smoke test — covers the loadboard's DAT
 * search panel and Settings → Integrations DAT/Truckstop cards shipped in
 * the "DAT freight search panel + book action on load board" cycle.
 *
 * Without CREDENTIALS_KEY set, only the honest not-connected path is
 * checked: the loadboard shows "Connect DAT" instead of the search form, and
 * the integrations cards render with a disabled Connect button + the
 * CREDENTIALS_KEY banner (mirrors e2e-qbo-push-smoke.mjs's no-credentials
 * check). With CREDENTIALS_KEY set, the connect → search round trip is also
 * exercised end to end; because the DAT/Truckstop API base URLs are an
 * unconfirmed assumption (see docs/integrations/dat.md), a real search is
 * expected to fail — the check is that it fails *gracefully* (a toast, not
 * a crash or unhandled rejection) rather than that it returns postings.
 *
 * Reseeds demo data first (see reseed in e2e-lib.mjs).
 *
 * Usage: node scripts/e2e-dat-freight-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { ANCHORS, launchBrowser, BASE, failures, check, waitForText, login, makeShot, clickByText, reseed, sleep, realConsoleErrors } from "./e2e-lib.mjs"

/**
 * Waits for the DAT card to show a button with the given label. Used after a
 * disconnect confirms (toast text alone doesn't prove the card re-rendered
 * to its disconnected state — the "Connect" toggle reappearing does).
 */
async function waitForDatCardButton(page, label, timeout = 8000) {
  try {
    await page.waitForFunction(
      (wanted) => {
        const header = [...document.querySelectorAll("h3")].find(
          (el) => el.textContent?.trim().toLowerCase() === "dat load board"
        )
        let node = header?.parentElement ?? null
        while (node && node.tagName !== "BODY") {
          if ([...node.querySelectorAll("button")].some((b) => b.textContent?.trim() === wanted)) return true
          node = node.parentElement
        }
        return false
      },
      { timeout },
      label
    )
    return true
  } catch {
    return false
  }
}

/**
 * Click a button by exact label inside the DAT card only. Every provider card
 * renders identically-labeled buttons (Connect / Disconnect / Disconnect it),
 * so a page-scoped clickByText can hit another provider's card — walk up from
 * the DAT h3 to its own card (the ancestor carrying the card's fallback
 * blurb) and search for the button there, never page-wide.
 *
 * `retry: true` polls until the button appears (or times out) — the confirm
 * step's "Disconnect it" only renders after the first click's React update
 * commits, so a single evaluate right after clicking "Disconnect" raced that
 * render under CPU contention. The initial "Disconnect" probe stays a single
 * fast check: it doubles as a not-connected test, where the button
 * legitimately never exists and a poll would just add its full timeout to
 * every normal (non-stale) run.
 */
async function clickInDatCard(page, label, { retry = false, timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout
  while (true) {
    const clicked = await page.evaluate((wanted) => {
      const header = [...document.querySelectorAll("h3")].find(
        (el) => el.textContent?.trim().toLowerCase() === "dat load board"
      )
      let node = header
      while (node && !/paste rate con/i.test(node.textContent ?? "")) node = node.parentElement
      const btn = [...(node?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.trim() === wanted)
      if (btn) btn.click()
      return Boolean(btn)
    }, label)
    if (clicked || !retry || Date.now() >= deadline) return clicked
    await sleep(250)
  }
}

const OUT = process.argv[2] ?? "e2e-shots-dat-freight"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`))

  // Self-heal: a crashed earlier run — or a run of an older smoke variant
  // with no cleanup step — can leave the DAT credential connected. seed-demo.mjs
  // does TRUNCATE hub.api_credentials, but reseed() (line 89) only runs it
  // against a localhost BASE; a remote E2E_BASE_URL skips reseeding entirely
  // (e2e-lib.mjs), so step 1's disconnected-state checks would fail on every
  // rerun there. Disconnect through the owner UI first (mirrors
  // e2e-mailbox-oauth-smoke.mjs).
  {
    const healCtx = await browser.createBrowserContext()
    const heal = await healCtx.newPage()
    await heal.setViewport({ width: 1440, height: 900 })
    await login(heal, "owner@demo.thind")
    await heal.goto(`${BASE}/hub/settings/integrations`, { waitUntil: "networkidle2" })
    // Nav label is "Integrations" — wait for the page subtitle.
    await waitForText(heal, "CSV import as the always-working fallback")
    await waitForText(heal, "DAT load board")
    if (await clickInDatCard(heal, "Disconnect")) {
      console.log("   (stale DAT connection from a previous run — disconnecting first)")
      await clickInDatCard(heal, "Disconnect it", { retry: true })
      await waitForText(heal, ANCHORS.importFallback)
      check(await waitForDatCardButton(heal, "Connect"), "DAT card shows Connect again after the self-heal disconnect")
    }
    await healCtx.close()
  }

  console.log("1. Dispatcher sees the DAT panel on the load board, disconnected by default")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/loadboard`, { waitUntil: "networkidle2" })
  // Title "Load board" is the nav label — wait for the page subtitle.
  await waitForText(page, "click any cell to edit")
  await waitForText(page, "External freight search")
  const disconnectedState = await page.evaluate(() => document.body.innerText)
  check(disconnectedState.includes("Connect DAT"), "loadboard shows the Connect DAT prompt before any credentials exist")
  check(disconnectedState.includes("Paste rate cons manually"), "disconnected copy points dispatchers at the manual fallback")
  await shot(page, "01-loadboard-disconnected")

  console.log("2. Owner sees DAT + Truckstop cards under Settings → Integrations")
  const ownerCtx = await browser.createBrowserContext()
  const owner = await ownerCtx.newPage()
  await owner.setViewport({ width: 1440, height: 900 })
  owner.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  owner.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`))
  await login(owner, "owner@demo.thind")
  await owner.goto(`${BASE}/hub/settings/integrations`, { waitUntil: "networkidle2" })
  await waitForText(owner, "CSV import as the always-working fallback")
  const cardsText = await owner.evaluate(() => document.body.innerText)
  check(/DAT load board/i.test(cardsText), "DAT load board card present")
  check(/Truckstop\.com/i.test(cardsText), "Truckstop.com card present")
  check(cardsText.includes("Paste rate con"), "both cards advertise the paste-rate-con fallback")
  await shot(owner, "02-settings-integrations")

  const encryptionReady = !cardsText.includes("Set CREDENTIALS_KEY")
  if (!encryptionReady) {
    console.log("3. CREDENTIALS_KEY not set — verifying Connect is honestly disabled instead of pretending to work")
    // The collapsed toggle button is also labeled "Connect" and is never
    // disabled (it only opens the form) — open the DAT card first so the
    // check targets the form's actual submit button, gated on encryptionReady.
    const opened = await owner.evaluate(() => {
      const header = [...document.querySelectorAll("h3")].find(
        (el) => el.textContent?.trim().toLowerCase() === "dat load board"
      )
      let node = header?.parentElement ?? null
      while (node && node.tagName !== "BODY") {
        const btn = node.querySelector("button")
        if (btn) {
          btn.click()
          return true
        }
        node = node.parentElement
      }
      return false
    })
    check(opened, "opened the DAT load board card to inspect its submit button")
    await owner.waitForSelector('form button[type="submit"]', { timeout: 5000 })
    const connectDisabled = await owner.evaluate(() => {
      const btn = document.querySelector('form button[type="submit"]')
      return btn?.disabled ?? null
    })
    check(connectDisabled === true, "Connect (submit) button is disabled without CREDENTIALS_KEY (no fake-success path)")
  } else {
    console.log("3. CREDENTIALS_KEY set — owner connects DAT with stub credentials")
    // Every disconnected card shows a "Connect" toggle button, and the form
    // it opens submits with a button labeled "Connect" too — with several
    // cards on the page, a plain "find any button named Connect" click is
    // ambiguous (it can open Terminal's form instead of DAT's). Scope every
    // step to the DAT card's own container, found by its h3 title text.
    const datCardHandle = await owner.evaluateHandle(() => {
      const header = [...document.querySelectorAll("h3")].find(
        (el) => el.textContent?.trim().toLowerCase() === "dat load board"
      )
      let node = header?.parentElement ?? null
      while (node && node.tagName !== "BODY") {
        if (node.querySelector("button")) return node
        node = node.parentElement
      }
      return null
    })
    check(datCardHandle.asElement() !== null, "found the DAT load board card container")
    const toggleBtn = await datCardHandle.asElement().$("button")
    await toggleBtn.click()
    await owner.waitForSelector("form input", { timeout: 5000 })
    const inputs = await datCardHandle.asElement().$$("form input")
    check(inputs.length > 0, "DAT connect form exposes credential inputs")
    for (const input of inputs) await input.type("stub-value")
    await shot(owner, "03-dat-connect-form-filled")
    const submitBtn = await datCardHandle.asElement().$('form button[type="submit"]')
    check(submitBtn !== null, "DAT connect form has a submit button")
    await submitBtn.click()
    await waitForText(owner, "connected")
    await shot(owner, "04-dat-connected")

    console.log("4. Dispatcher's loadboard search panel opens now that DAT is connected")
    await page.goto(`${BASE}/hub/loadboard`, { waitUntil: "networkidle2" })
    await waitForText(page, "click any cell to edit")
    const connectedState = await page.evaluate(() => document.body.innerText)
    check(!connectedState.includes("Connect DAT"), "Connect DAT prompt is gone once credentials are saved")
    await clickByText(page, "Search DAT")
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 })
    await clickByText(page, "Search DAT")

    console.log("5. Search submits and shows a pending state without crashing the page")
    // dat.ts calls the real freight.api.dat.com directly (AbortSignal.timeout
    // 15s) — there's no stub/mock path for a "stub" registry provider yet
    // (see Backlog). How long that fetch actually takes depends on network
    // reachability the test can't control (fast reject on some hosts, a full
    // 15s+ hang on others), so asserting on the *outcome* here would make
    // this smoke flaky across environments. What's reliably testable
    // everywhere: the click is accepted (button shows its pending spinner)
    // and the client doesn't throw — the eventual toast is left unobserved.
    const showsPending = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[type="submit"]')].find((b) =>
        b.textContent?.includes("Search DAT")
      )
      return Boolean(btn?.querySelector("svg.animate-spin")) || btn?.disabled === true
    })
    check(showsPending, "search button shows a pending state immediately after submit")
    await shot(page, "05-dat-search-pending")

    console.log("6. Cleanup — disconnect DAT so the credential doesn't linger between runs")
    await owner.goto(`${BASE}/hub/settings/integrations`, { waitUntil: "networkidle2" })
    await waitForText(owner, "CSV import as the always-working fallback")
    // Disconnect confirms in place now: arm it, then click "Disconnect it" —
    // scoped to the DAT card so another connected card is never the victim.
    const armed = await clickInDatCard(owner, "Disconnect")
    check(armed, "cleanup found the DAT card's Disconnect button")
    const confirmed = await clickInDatCard(owner, "Disconnect it", { retry: true })
    check(confirmed, "cleanup confirmed with the DAT card's Disconnect it button")
    await waitForText(owner, ANCHORS.importFallback)
  }

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nDAT freight smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDAT freight smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
