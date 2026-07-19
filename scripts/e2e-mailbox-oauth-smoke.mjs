/**
 * Docs-mailbox OAuth2 connect smoke: the integrations settings card renders
 * the Microsoft 365 / Google Workspace OAuth2 credential fields (registry-
 * driven — this guards the registry entry end to end), an owner can connect
 * with an M365 OAuth set and no password, the card flips to "connected",
 * the edit form promises field-level merge, and disconnect restores the
 * fallback state so the demo database stays clean for the next smoke.
 *
 * Token minting itself is unit-tested with signature verification in
 * src/lib/hub/__tests__/mailbox-oauth.test.ts — this smoke never leaves the
 * machine (the one "Sync now" click points IMAP at a closed localhost port),
 * so it runs green in sandboxes too. That click drives the manual-sync slice:
 * a bad credential set fails instantly with an honest toast and a failed
 * `mailbox` row in Sync history, instead of silently waiting for the cron.
 *
 * Requires CREDENTIALS_KEY in the server env (encrypted credential storage).
 *
 * Usage: node scripts/e2e-mailbox-oauth-smoke.mjs [outputDir]
 */
import pg from "pg"
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

// Fail fast on a fresh rig: the connect step needs CREDENTIALS_KEY in the
// SERVER env (encrypt-at-rest for hub.api_credentials). Against a localhost
// BASE, e2e-lib has already loaded .env.local into this process — the same
// file the server reads — so an empty value here means the save action will
// throw server-side and the smoke would die as an opaque 15s toast timeout.
// Remote BASEs skip the check (the remote server's env is not visible here).
if (
  /localhost|127\.0\.0\.1/.test(BASE) &&
  !((process.env.CREDENTIALS_KEY ?? "").length >= 16)
) {
  console.error(
    "e2e-mailbox-oauth-smoke: CREDENTIALS_KEY missing/short in .env.local — " +
      "the server cannot encrypt credentials, so the connect step can only time out. " +
      "Set CREDENTIALS_KEY (32+ random chars) in .env.local, restart the server, rerun."
  )
  process.exit(1)
}

const OUT = process.argv[2] ?? "e2e-shots-mailbox-oauth"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

/** Text of the Docs mailbox card (the ancestor that includes the fallback line). */
async function cardText(page) {
  return page.evaluate(() => {
    const heading = [...document.querySelectorAll("h3")].find((h) => h.textContent.includes("Docs mailbox"))
    let node = heading
    while (node && !node.textContent.includes("Always works without it")) node = node.parentElement
    return node?.textContent ?? ""
  })
}

/**
 * Condition-wait scoped to the Docs mailbox card: resolves true once the
 * card's text matches `pattern` (case-insensitive), false on timeout. The
 * body-wide textAppears helper would false-positive here — "connected",
 * "Disconnect it", etc. appear on the other provider cards too.
 */
async function cardShows(page, pattern, timeout = 20000) {
  return page
    .waitForFunction(
      (src) => {
        const heading = [...document.querySelectorAll("h3")].find((h) => h.textContent.includes("Docs mailbox"))
        let node = heading
        while (node && !node.textContent.includes("Always works without it")) node = node.parentElement
        return new RegExp(src, "i").test(node?.textContent ?? "")
      },
      { timeout },
      pattern
    )
    .then(() => true)
    .catch(() => false)
}

async function clickInCard(page, label) {
  const clicked = await page.evaluate((wanted) => {
    const heading = [...document.querySelectorAll("h3")].find((h) => h.textContent.includes("Docs mailbox"))
    let node = heading
    while (node && !node.textContent.includes("Always works without it")) node = node.parentElement
    const btn = [...(node?.querySelectorAll("button") ?? [])].find((b) => b.textContent.trim() === wanted)
    if (btn) btn.click()
    return Boolean(btn)
  }, label)
  check(clicked, `clicked "${label}" on the Docs mailbox card`)
}

/**
 * A crashed earlier run leaves its saved mailbox credential behind —
 * `seed:demo` does not wipe `hub.api_credentials` — and step 1 then fails
 * forever on "card starts not connected". Clean up our own leftovers first.
 */
async function removeLeftoverCredential() {
  if (!process.env.POSTGRES_URL || !/localhost|127\.0\.0\.1/.test(BASE)) return
  const db = new pg.Client({ connectionString: process.env.POSTGRES_URL })
  await db.connect()
  try {
    await db.query(`DELETE FROM hub.api_credentials WHERE provider = 'mailbox'`)
  } finally {
    await db.end()
  }
}

async function main() {
  // State-consuming: connects/disconnects the docs_mailbox credential, and a
  // failed prior run leaves it connected — start from a known-clean seed.
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  console.log("1. Owner opens Settings → Integrations, Docs mailbox card is disconnected")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/settings/integrations`, { waitUntil: "networkidle2" })
  await waitForText(page, "Docs mailbox")

  // Fail fast when the server can't store credentials at all — without this,
  // the missing env var only surfaces as an opaque 15s toast timeout in step 3.
  const pageText = await page.evaluate(() => document.body.innerText)
  if (/Set CREDENTIALS_KEY/i.test(pageText)) {
    throw new Error("server is running without CREDENTIALS_KEY — set it in .env.local (32+ random chars) and restart; credential saves can't work without it")
  }

  // Self-heal: `seed:demo` does not wipe hub.api_credentials, so a run that
  // died between connect and disconnect leaves the mailbox connected for every
  // later run. Disconnect the leftover credential before asserting clean start.
  if (!/not connected/i.test(await cardText(page))) {
    console.log("   (leftover credential from an interrupted run — disconnecting first)")
    await clickInCard(page, "Disconnect")
    await cardShows(page, "Disconnect it")
    await clickInCard(page, "Disconnect it")
    await waitForText(page, "the CSV import path keeps working")
    await cardShows(page, "not connected")
    await page.reload({ waitUntil: "networkidle2" })
    await waitForText(page, "Docs mailbox")
  }
  const before = await cardText(page)
  check(/not connected/i.test(before), "card starts not connected")
  check(/OAuth2 for Microsoft 365/.test(before), "blurb names the OAuth2 paths")
  await shot(page, "01-card-disconnected")

  console.log("2. Connect form renders every OAuth2 field from the registry")
  await clickInCard(page, "Connect")
  const formOpen = await page
    .waitForSelector('input[aria-label="Mailbox address"]', { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check(formOpen, "connect form opened")
  for (const label of [
    "Mailbox address",
    "App password (Gmail only — M365/Workspace use OAuth2 below)",
    "Microsoft 365 tenant ID (OAuth2)",
    "Microsoft 365 client ID",
    "Microsoft 365 client secret",
    "Google Workspace service account key JSON",
    "IMAP host (blank = auto per auth method)",
  ]) {
    const present = await page.$(`input[aria-label="${label}"]`)
    check(Boolean(present), `field "${label}" rendered`)
  }
  const secretType = await page.$eval(
    'input[aria-label="Microsoft 365 client secret"]',
    (el) => el.type
  )
  check(secretType === "password", "client secret renders masked")
  await shot(page, "02-connect-form")

  console.log("3. Save an M365 OAuth2 credential set (no password, no host)")
  await page.type('input[aria-label="Mailbox address"]', "docs@demo-carrier.example")
  await page.type('input[aria-label="Microsoft 365 tenant ID (OAuth2)"]', "11111111-2222-3333-4444-555555555555")
  await page.type('input[aria-label="Microsoft 365 client ID"]', "e2e-client-id")
  await page.type('input[aria-label="Microsoft 365 client secret"]', "e2e-client-secret")
  // The submit button also reads "Connect" — click it inside THIS card, not
  // another provider's outer Connect button.
  await clickInCard(page, "Connect")
  await waitForText(page, "credentials encrypted at rest")
  check(await cardShows(page, "Sync now"), "connected card offers Sync now (manual mailbox sync is wired)")
  const after = await cardText(page)
  check(/connected/i.test(after) && !/not connected/i.test(after), "card flips to connected")
  await shot(page, "03-connected")

  console.log("4. Edit promises field-level merge (rotate one field, keep the rest)")
  await clickInCard(page, "Edit")
  check(await cardShows(page, "Leave a field blank to keep its saved value"), "edit form shows the merge hint")
  await shot(page, "04-edit-merge-hint")
  await clickInCard(page, "Cancel")

  console.log("5. Disconnect the OAuth set (saved fields merge, and OAuth outranks a password)")
  // Disconnect is a two-step confirm since 1daecb5: first click arms it,
  // then the destructive "Disconnect it" / "Keep" pair replaces the button.
  await clickInCard(page, "Disconnect")
  // Destructive actions confirm first (IntegrationsPanel confirm step).
  const confirmShown = await cardShows(page, "Disconnect it")
  const confirmText = await cardText(page)
  check(confirmShown && /Keep/.test(confirmText), "disconnect asks for confirmation first")
  await clickInCard(page, "Disconnect it")
  await waitForText(page, "the CSV import path keeps working")
  check(await cardShows(page, "not connected"), "card back to not connected after disconnect")
  await shot(page, "05-disconnected")

  console.log("6. Sync now against a dead local endpoint fails honestly, on the spot")
  // A fresh password set pointed at a closed localhost port: the click must
  // come back with an error toast and a failed ledger row — never a silent
  // nothing — and without any network egress from the sandbox.
  await clickInCard(page, "Connect")
  const retryFormOpen = await page
    .waitForSelector('input[aria-label="Mailbox address"]', { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check(retryFormOpen, "connect form reopened for the password set")
  await page.type('input[aria-label="Mailbox address"]', "docs@demo-carrier.example")
  await page.type('input[aria-label="App password (Gmail only — M365/Workspace use OAuth2 below)"]', "wrong-app-password")
  await page.type('input[aria-label="IMAP host (blank = auto per auth method)"]', "127.0.0.1")
  await page.type('input[aria-label="Port (993)"]', "2526")
  await clickInCard(page, "Connect")
  await waitForText(page, "credentials encrypted at rest")
  await cardShows(page, "Sync now")
  await clickInCard(page, "Sync now")
  await waitForText(page, "Sync failed", 30000)
  check(true, "bad credentials surface an immediate error toast")
  await shot(page, "06-sync-failed-toast")

  console.log("7. The failed attempt lands in Sync history as a failed mailbox row")
  await page.goto(`${BASE}/hub/settings/integrations`, { waitUntil: "networkidle2" })
  await waitForText(page, "Sync history")
  const failedRow = await page.evaluate(() => {
    const sources = [...document.querySelectorAll("span > span.font-semibold")]
    return sources.some(
      (s) => s.textContent.trim() === "mailbox" &&
        s.closest("div")?.textContent.includes("failed")
    )
  })
  check(failedRow, "Sync history shows a failed 'mailbox' run")
  await shot(page, "07-sync-history-failed-row")

  console.log("8. Disconnect leaves the demo carrier clean")
  await clickInCard(page, "Disconnect")
  await cardShows(page, "Disconnect it")
  await clickInCard(page, "Disconnect it")
  await waitForText(page, "the CSV import path keeps working")
  check(await cardShows(page, "not connected"), "card back to not connected after disconnect")
  await shot(page, "08-disconnected")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nMailbox OAuth smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nMailbox OAuth smoke passed ✅")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
