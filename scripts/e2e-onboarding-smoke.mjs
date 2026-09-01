/**
 * Phase 7 smoke: self-serve workspace signup → getting-started checklist;
 * second tenant sees ONLY its own data; platform admin sees tenant ops only.
 *
 * Usage: node scripts/e2e-onboarding-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, waitForText, login, makeShot, clickSelector, skipFirstRunTour } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-onboarding"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

/**
 * Advance the signup wizard one step. The forward button is type=button and
 * reads "Continue" (or "Skip for now" on the branding step with no accent
 * picked), so a plain submit-click can't drive it.
 */
async function nextStep(page) {
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")]
      .find((b) => /Continue|Skip for now/.test(b.textContent ?? ""))
    if (btn) btn.click()
    return Boolean(btn)
  })
  if (!clicked) throw new Error("Wizard forward button not found")
}

async function main() {
  const browser = await launchBrowser()
  const stamp = Date.now().toString().slice(-6)

  console.log("1. Self-serve signup walks the 4-step wizard to a new workspace")
  const signupCtx = await browser.createBrowserContext()
  const fresh = await signupCtx.newPage()
  await fresh.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await fresh.goto(`${BASE}/hub/signup`, { waitUntil: "networkidle2" })
  // Wordmark/tagline also live on /hub/login, so wait for the unique body
  // copy before typing into #su-company against the streamed body.
  // src/app/hub/signup has no loading.tsx of its own.
  await waitForText(fresh, "Create your company's workspace — dispatch, money, compliance, and a driver app, live in an afternoon. No sales call.")
  // Same origin as Today: mark the autostart tour seen BEFORE the wizard
  // submits, the way login() does. Otherwise HubTourHost opens a 7-step
  // modal over the checklist ~700ms after /hub mounts and waitForText
  // ("Finish setup") times out against the scrim.
  await skipFirstRunTour(fresh)
  await shot(fresh, "01-signup")
  // Step 1/4 — company facts (FMCSA verify is optional; skip the network call)
  await fresh.type("#su-company", `Bluebird Freight ${stamp}`)
  await fresh.type("#su-dot", "4112233")
  await nextStep(fresh)
  // Step 2/4 — branding: keep the standard look ("Skip for now")
  await waitForText(fresh, "Pick an accent color")
  await nextStep(fresh)
  // Step 3/4 — driver pay: platform defaults are prefilled and valid
  await fresh.waitForSelector("#su-permile", { timeout: 10000 })
  await nextStep(fresh)
  // Step 4/4 — owner account
  await fresh.waitForSelector("#su-owner", { timeout: 10000 })
  await fresh.type("#su-owner", "Rosa Bluebird")
  await fresh.type("#su-email", `rosa+${stamp}@bluebird.example`)
  await fresh.type("#su-pass", "BluebirdPass1!")
  await shot(fresh, "01b-account-step")
  await Promise.all([
    fresh.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }),
    clickSelector(fresh, 'button[type="submit"]'),
  ])
  // A brand-new workspace has setup STARTED (the wizard supplied company +
  // pay) but core not done, so Today renders SetupProgressCard. SetupGuide —
  // which owns "Set up your workspace" — only appears once trucks, drivers,
  // customers and loads all exist, i.e. never on the first screen a new
  // owner sees.
  await waitForText(fresh, "Finish setup")
  // The card ships collapsed — open it before asserting on the steps.
  await fresh.evaluate(() => {
    // The card's own disclosure, not the first aria-expanded on the page —
    // the shell has its own collapsible bits.
    const toggle = [...document.querySelectorAll("button[aria-expanded]")].find((b) =>
      b.textContent?.includes("Finish setup")
    )
    toggle?.click()
  })
  await waitForText(fresh, "Add your trucks")
  await shot(fresh, "04-getting-started")
  const checklist = await fresh.evaluate(() => document.body.innerText)
  if (!checklist.includes("Add your drivers")) throw new Error("Getting-started checklist missing")
  if (checklist.includes("THD-")) throw new Error("NEW TENANT SEES THIND DATA — isolation broken!")
  console.log("   new workspace is empty + checklist shows ✓")

  console.log("2. Second tenant sees only Cascade data")
  const cascadeCtx = await browser.createBrowserContext()
  const cascade = await cascadeCtx.newPage()
  await cascade.setViewport({ width: 1440, height: 900 })
  await login(cascade, "owner@cascademo.example")
  await waitForText(cascade, "Cascade Demo Lines".toUpperCase())
  await cascade.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(cascade, "Search, filter, and manage every load.")
  const loadsText = await cascade.evaluate(() => document.body.innerText)
  if (!loadsText.includes("CAS-5001")) throw new Error("Cascade load missing")
  if (loadsText.includes("THD-")) throw new Error("CASCADE SEES THIND LOADS — isolation broken!")
  await shot(cascade, "05-cascade-loads")
  console.log("   zero bleed between tenants ✓")

  console.log("3. Platform admin sees tenant ops only")
  const adminCtx = await browser.createBrowserContext()
  const admin = await adminCtx.newPage()
  await admin.setViewport({ width: 1440, height: 900 })
  await login(admin, "admin@hauldesk.app")
  if (!admin.url().includes("/hub/admin")) throw new Error(`Admin landed on ${admin.url()}`)
  await waitForText(admin, "Platform admin")
  // Subtitle is the destination-copy mapping (same gate as the
  // tenant-isolation hard goto). Title wait above is unique too, but the
  // mapping uses this copy so both smokes share one render anchor.
  await waitForText(admin, "Tenants and operational counts only")
  await waitForText(admin, "Cascade Demo Lines")
  await shot(admin, "06-platform-admin")
  // Bouncing into a tenant surface must redirect back.
  await admin.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  // Platform admin never sees the office subtitle — bounce on leaving
  // /hub/loads, then confirm they landed back on /hub/admin.
  await admin.waitForFunction(() => !location.pathname.startsWith("/hub/loads"), {
    timeout: 20000,
  })
  if (!admin.url().includes("/hub/admin")) throw new Error("Platform admin reached tenant data!")
  console.log("   platform admin contained ✓")

  console.log("\nOnboarding + tenancy smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nONBOARDING SMOKE FAILED:", err.message)
  process.exit(1)
})
