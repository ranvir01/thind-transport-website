/**
 * Phase 7 smoke: self-serve workspace signup → getting-started checklist;
 * second tenant sees ONLY its own data; platform admin sees tenant ops only.
 *
 * Usage: node scripts/e2e-onboarding-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, waitForText, login, makeShot, clickByText } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-onboarding"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  const stamp = Date.now().toString().slice(-6)

  console.log("1. Self-serve signup creates a new workspace")
  const signupCtx = await browser.createBrowserContext()
  const fresh = await signupCtx.newPage()
  await fresh.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await fresh.goto(`${BASE}/hub/signup`, { waitUntil: "networkidle2" })
  await shot(fresh, "01-signup")
  // Signup is a 4-step wizard (SignupForm.tsx): only the current step's inputs
  // are mounted, so walk it step by step instead of typing everything at once.
  await fresh.waitForSelector("#su-company") // step 1 — company facts
  await fresh.type("#su-company", `Bluebird Freight ${stamp}`)
  await fresh.type("#su-dot", "4112233")
  await clickByText(fresh, "Continue")
  await fresh.waitForSelector('[role="radiogroup"]') // step 2 — branding (skippable)
  await clickByText(fresh, "Skip for now")
  await fresh.waitForSelector("#su-permile") // step 3 — driver pay (prefilled defaults)
  await clickByText(fresh, "Continue")
  await fresh.waitForSelector("#su-owner") // step 4 — owner account
  await fresh.type("#su-owner", "Rosa Bluebird")
  await fresh.type("#su-email", `rosa+${stamp}@bluebird.example`)
  await fresh.type("#su-pass", "BluebirdPass1!")
  await shot(fresh, "01b-account-step")
  await Promise.all([
    fresh.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }),
    fresh.click('button[type="submit"]'),
  ])
  await waitForText(fresh, "Set up your workspace")
  await shot(fresh, "02-getting-started")
  const checklist = await fresh.evaluate(() => document.body.innerText)
  if (!checklist.includes("Smart Setup")) throw new Error("Getting-started checklist missing")
  if (checklist.includes("THD-")) throw new Error("NEW TENANT SEES THIND DATA — isolation broken!")
  console.log("   new workspace is empty + checklist shows ✓")

  console.log("2. Second tenant sees only Cascade data")
  const cascadeCtx = await browser.createBrowserContext()
  const cascade = await cascadeCtx.newPage()
  await cascade.setViewport({ width: 1440, height: 900 })
  await login(cascade, "owner@cascademo.example")
  await waitForText(cascade, "Cascade Demo Lines".toUpperCase())
  await cascade.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  const loadsText = await cascade.evaluate(() => document.body.innerText)
  if (!loadsText.includes("CAS-5001")) throw new Error("Cascade load missing")
  if (loadsText.includes("THD-")) throw new Error("CASCADE SEES THIND LOADS — isolation broken!")
  await shot(cascade, "03-cascade-loads")
  console.log("   zero bleed between tenants ✓")

  console.log("3. Platform admin sees tenant ops only")
  const adminCtx = await browser.createBrowserContext()
  const admin = await adminCtx.newPage()
  await admin.setViewport({ width: 1440, height: 900 })
  await login(admin, "admin@hauldesk.app")
  if (!admin.url().includes("/hub/admin")) throw new Error(`Admin landed on ${admin.url()}`)
  await waitForText(admin, "Platform admin")
  await waitForText(admin, "Cascade Demo Lines")
  await shot(admin, "04-platform-admin")
  // Bouncing into a tenant surface must redirect back.
  await admin.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  if (!admin.url().includes("/hub/admin")) throw new Error("Platform admin reached tenant data!")
  console.log("   platform admin contained ✓")

  console.log("\nOnboarding + tenancy smoke passed ✔")
  await browser.close()
}

main().catch((err) => {
  console.error("\nONBOARDING SMOKE FAILED:", err.message)
  process.exit(1)
})
