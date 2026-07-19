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
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-mailbox-oauth"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Fail fast on a rig missing CREDENTIALS_KEY: without it saveCredential()
// throws server-side and the smoke dies as an opaque 15s timeout waiting for
// the connected state. e2e-lib loads .env.local for a localhost BASE, so the
// same file that booted the server answers here; a remote BASE's server env
// is unknowable, so only the local rig gets the guard (mirrors the >=16-char
// minimum in src/lib/hub/credentials.ts).
if (/localhost|127\.0\.0\.1/.test(BASE) && (process.env.CREDENTIALS_KEY ?? "").length < 16) {
  console.error(
    "MAILBOX OAUTH SMOKE ABORTED: CREDENTIALS_KEY is missing or shorter than 16 chars in .env.local/env.\n" +
      "Credential saves are refused without it. Add one (e.g. `echo \"CREDENTIALS_KEY=$(openssl rand -hex 24)\" >> .env.local`),\n" +
      "restart the Next.js server so it picks the key up, then re-run."
  )
  process.exit(1)
}

/** Text of the Docs mailbox card (the ancestor that includes the fallback line). */
async function cardText(page) {
  return page.evaluate(() => {
    const heading = [...document.querySelectorAll("h3")].find((h) => h.textContent.includes("Docs mailbox"))
    let node = heading
    while (node && !node.textContent.includes("Always works without it")) node = node.parentElement
    return node?.textContent ?? ""
  })
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

async function main() {
  // e2e-lib already merged .env.local into process.env for localhost drives,
  // so this mirrors the server's env. Without a usable CREDENTIALS_KEY the
  // connect save fails server-side and the smoke dies as a baffling 15s
  // timeout at "card flips to connected" — fail fast with the fix instead.
  // (credentials.ts requires 16+ chars; .env.example documents 32+.)
  if (/localhost|127\.0\.0\.1/.test(BASE) && (process.env.CREDENTIALS_KEY ?? "").length < 16) {
    console.error(
      "CREDENTIALS_KEY is missing or shorter than 16 chars in the server env (.env.local).\n" +
        "Encrypted credential storage needs it — add a 32+ char CREDENTIALS_KEY, restart the server, rerun."
    )
    process.exit(1)
  }
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
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
    await sleep(300)
    await clickInCard(page, "Disconnect it")
    await waitForText(page, "the CSV import path keeps working")
    await sleep(1200)
    await page.reload({ waitUntil: "networkidle2" })
    await waitForText(page, "Docs mailbox")
  }
  const before = await cardText(page)
  check(/not connected/i.test(before), "card starts not connected")
  check(/OAuth2 for Microsoft 365/.test(before), "blurb names the OAuth2 paths")
  await shot(page, "01-card-disconnected")

  console.log("2. Connect form renders every OAuth2 field from the registry")
  await clickInCard(page, "Connect")
  await sleep(300)
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
  await sleep(1200)
  const after = await cardText(page)
  check(/connected/i.test(after) && !/not connected/i.test(after), "card flips to connected")
  check(/Sync now/.test(after), "connected card offers Sync now (manual mailbox sync is wired)")
  await shot(page, "03-connected")

  console.log("4. Edit promises field-level merge (rotate one field, keep the rest)")
  await clickInCard(page, "Edit")
  await sleep(300)
  const editText = await cardText(page)
  check(/Leave a field blank to keep its saved value/.test(editText), "edit form shows the merge hint")
  await shot(page, "04-edit-merge-hint")
  await clickInCard(page, "Cancel")

  console.log("5. Disconnect the OAuth set (saved fields merge, and OAuth outranks a password)")
  // Disconnect is a two-step confirm since 1daecb5: first click arms it,
  // then the destructive "Disconnect it" / "Keep" pair replaces the button.
  await clickInCard(page, "Disconnect")
  // Destructive actions confirm first (IntegrationsPanel confirm step).
  await sleep(300)
  const confirmText = await cardText(page)
  check(/Disconnect it/.test(confirmText) && /Keep/.test(confirmText), "disconnect asks for confirmation first")
  await clickInCard(page, "Disconnect it")
  await waitForText(page, "the CSV import path keeps working")
  await sleep(1200)
  check(/not connected/i.test(await cardText(page)), "card back to not connected after disconnect")
  await shot(page, "05-disconnected")

  console.log("6. Sync now against a dead local endpoint fails honestly, on the spot")
  // A fresh password set pointed at a closed localhost port: the click must
  // come back with an error toast and a failed ledger row — never a silent
  // nothing — and without any network egress from the sandbox.
  await clickInCard(page, "Connect")
  await sleep(300)
  await page.type('input[aria-label="Mailbox address"]', "docs@demo-carrier.example")
  await page.type('input[aria-label="App password (Gmail only — M365/Workspace use OAuth2 below)"]', "wrong-app-password")
  await page.type('input[aria-label="IMAP host (blank = auto per auth method)"]', "127.0.0.1")
  await page.type('input[aria-label="Port (993)"]', "2526")
  await clickInCard(page, "Connect")
  await waitForText(page, "credentials encrypted at rest")
  await sleep(1200)
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
  await sleep(300)
  await clickInCard(page, "Disconnect it")
  await waitForText(page, "the CSV import path keeps working")
  await sleep(1200)
  const finalText = await cardText(page)
  check(/not connected/i.test(finalText), "card back to not connected after disconnect")
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
