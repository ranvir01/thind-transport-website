/**
 * Docs-mailbox OAuth2 connect smoke: the integrations settings card renders
 * the Microsoft 365 / Google Workspace OAuth2 credential fields (registry-
 * driven — this guards the registry entry end to end), an owner can connect
 * with an M365 OAuth set and no password, the card flips to "connected",
 * the edit form promises field-level merge, and disconnect restores the
 * fallback state so the demo database stays clean for the next smoke.
 *
 * Token minting itself is unit-tested with signature verification in
 * src/lib/hub/__tests__/mailbox-oauth.test.ts — this smoke stays off the
 * network (never clicks a sync), so it runs green in sandboxes too.
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

// Fail fast on the documented prerequisite: without CREDENTIALS_KEY the save
// action refuses to store credentials, and the smoke otherwise dies as an
// opaque 15s waitForText timeout on the success toast.
if (/localhost|127\.0\.0\.1/.test(BASE) && !process.env.CREDENTIALS_KEY) {
  console.error(
    "CREDENTIALS_KEY is not set (checked shell env + .env.local) — the connect step " +
      "cannot succeed. Set it (32+ random chars) in .env.local and restart the server."
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
  // Self-heal: a crashed earlier run strands its saved credential (seed-demo
  // does not truncate hub.integration_credentials), which fails step 1 on
  // every rerun. Disconnect through the UI before asserting the clean state.
  if (!/not connected/i.test(await cardText(page))) {
    console.log("   (pre-clean: card left connected by a previous run — disconnecting)")
    await clickInCard(page, "Disconnect")
    await sleep(300)
    await clickInCard(page, "Disconnect it")
    await waitForText(page, "the CSV import path keeps working")
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
  await shot(page, "03-connected")

  console.log("4. Edit promises field-level merge (rotate one field, keep the rest)")
  await clickInCard(page, "Edit")
  await sleep(300)
  const editText = await cardText(page)
  check(/Leave a field blank to keep its saved value/.test(editText), "edit form shows the merge hint")
  await shot(page, "04-edit-merge-hint")
  await clickInCard(page, "Cancel")

  console.log("5. Disconnect leaves the demo carrier clean")
  await clickInCard(page, "Disconnect") // arms the inline confirm (destructive-action doctrine)
  await sleep(300)
  await clickInCard(page, "Disconnect it")
  await waitForText(page, "the CSV import path keeps working")
  await sleep(1200)
  const finalText = await cardText(page)
  check(/not connected/i.test(finalText), "card back to not connected after disconnect")
  await shot(page, "05-disconnected")

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
