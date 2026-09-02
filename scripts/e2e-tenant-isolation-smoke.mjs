/**
 * Two-tenant isolation smoke — proves zero data bleed between the seeded
 * carriers (Thind Transport and Cascade Demo Lines, scripts/seed-demo.mjs
 * Phase 7). Four angles:
 *
 *   1. List screens: each owner sees only their tenant's references
 *      (THD- vs CAS-) on dispatch, loads, fleet, and money.
 *   2. Direct-URL probes: a Cascade owner requesting a Thind load, invoice,
 *      and truck detail by id must get the not-found page, never the record
 *      (carrier-scoped queries → notFound(), e.g. getLoad in
 *      src/lib/hub/loads.ts).
 *   3. Driver PWA: the Cascade driver's phone view never references a
 *      Thind load or invoice.
 *   4. Suspend/reactivate: platform admin flips Cascade's carrier status;
 *      the already-signed-in owner and driver sessions (valid JWTs, no
 *      re-login) must be cut off on their very next request and restored on
 *      reactivation — the per-request isActiveCarrier re-check in
 *      src/lib/hub/session.ts, not just a login-time check.
 *
 * Token discipline: Thind seeds a customer literally named "Cascade Produce
 * Co.", so asserting on the bare word "Cascade" would false-positive —
 * assertions use exact refs (CAS-5001, "Cascade Demo Lines", THD-) only.
 *
 * Usage: node scripts/e2e-tenant-isolation-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { ANCHORS, BASE, failures, check, waitForText, textAppears, waitForPath, login, makeShot, reseed, realConsoleErrors, launchBrowser } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-tenant-isolation"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

async function bodyText(page) {
  return page.evaluate(() => document.body?.innerText ?? "")
}

/**
 * First anchor href of the form `${prefix}<uuid>` — the UUID requirement
 * skips static siblings like /hub/loads/paste and /hub/fleet/trucks/new.
 */
async function firstHref(page, prefix) {
  return page.evaluate((p) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return (
      [...document.querySelectorAll("a")]
        .map((a) => a.getAttribute("href"))
        .find((h) => h?.startsWith(p) && uuid.test(h.slice(p.length))) ?? null
    )
  }, prefix)
}

/**
 * Click the Suspend/Reactivate button inside a /hub/admin tenant row (each
 * row is a `.flex-wrap` div containing a `<p>` with the tenant name and the
 * TenantActions button) — dispatched as a real DOM click so React's
 * delegated onClick handler fires the same as a user click would.
 */
async function clickTenantAction(page, tenantName) {
  return page.evaluate((name) => {
    const p = [...document.querySelectorAll("p")].find((el) => el.textContent?.includes(name))
    const row = p?.closest(".flex-wrap")
    const btn = row?.querySelector("button")
    if (!btn) return false
    btn.click()
    return true
  }, tenantName)
}

/** Wait until a tenant row's status badge/button reflects the given status ("active"/"suspended"). */
async function waitForTenantStatus(page, tenantName, status, timeout = 10000) {
  return page
    .waitForFunction(
      (name, s) => {
        const p = [...document.querySelectorAll("p")].find((el) => el.textContent?.includes(name))
        const row = p?.closest(".flex-wrap")
        return row?.textContent?.toLowerCase().includes(s) ?? false
      },
      { timeout },
      tenantName,
      status
    )
    .then(() => true)
    .catch(() => false)
}

async function main() {
  reseed()
  const browser = await launchBrowser()

  // ---- 1. Thind owner: collect real detail URLs + confirm no Cascade refs ----
  console.log("1. Thind owner — list screens show THD- only; collect probe URLs")
  const thind = await browser.newPage()
  await thind.setViewport({ width: 1440, height: 950 })
  const consoleErrors = []
  thind.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(thind, "owner@demo.thind")

  await thind.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(thind, ANCHORS.loads)
  await waitForText(thind, "THD-")
  const thindLoadsWall = await bodyText(thind)
  check(!thindLoadsWall.includes("CAS-5"), "Thind loads list has no CAS- reference")
  const loadUrl = await firstHref(thind, "/hub/loads/")
  check(Boolean(loadUrl), `got a Thind load detail URL (${loadUrl})`)

  await thind.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(thind, ANCHORS.money)
  const invoiceUrl = await firstHref(thind, "/hub/money/invoices/")
  check(Boolean(invoiceUrl), `got a Thind invoice detail URL (${invoiceUrl})`)
  check(!(await bodyText(thind)).includes("CAS-INV"), "Thind money screen has no CAS-INV reference")

  await thind.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(thind, ANCHORS.fleet)
  // Fleet is an RSC list page — wait for a real unit number to render
  // (101–107) instead of a blind sleep after networkidle2.
  await thind.waitForFunction(() => /\b10[1-7]\b/.test(document.body.innerText), { timeout: 8000 }).catch(() => {})
  const thindFleetWall = await bodyText(thind)
  check(!/\bC-0[12]\b/.test(thindFleetWall), "Thind fleet has no Cascade unit (C-01/C-02)")
  const truckUrl = await firstHref(thind, "/hub/fleet/trucks/")
  check(Boolean(truckUrl), `got a Thind truck detail URL (${truckUrl})`)

  // The Thind load reference the Cascade owner must never see, e.g. "THD-1001"
  await thind.goto(`${BASE}${loadUrl}`, { waitUntil: "networkidle2" })
  await waitForText(thind, "THD-")
  const thindLoadRef = (await bodyText(thind)).match(/THD-\d+/)?.[0]
  check(Boolean(thindLoadRef), `Thind load detail renders its reference (${thindLoadRef})`)
  await shot(thind, "01-thind-load-detail")

  // ---- 2. Cascade owner: own data present, Thind refs absent ----
  console.log("2. Cascade owner — sees CAS- data, zero THD- references")
  const cascadeCtx = await browser.createBrowserContext()
  const cascade = await cascadeCtx.newPage()
  await cascade.setViewport({ width: 1440, height: 950 })
  cascade.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(cascade, "owner@cascademo.example")

  await cascade.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(cascade, ANCHORS.dispatch)
  const cascadeDispatchWall = await bodyText(cascade)
  check(cascadeDispatchWall.includes("CAS-5001"), "Cascade dispatch shows its in-transit load CAS-5001")
  check(!cascadeDispatchWall.includes("THD-"), "Cascade dispatch has no THD- reference")
  await shot(cascade, "02-cascade-dispatch")

  await cascade.goto(`${BASE}/hub/fleet`, { waitUntil: "networkidle2" })
  await waitForText(cascade, ANCHORS.fleet)
  await cascade
    .waitForFunction(() => document.body.innerText.includes("C-01") && document.body.innerText.includes("C-02"), {
      timeout: 8000,
    })
    .catch(() => {})
  const cascadeFleetWall = await bodyText(cascade)
  check(cascadeFleetWall.includes("C-01") && cascadeFleetWall.includes("C-02"), "Cascade fleet shows C-01 and C-02")
  check(!/\b10[1-7]\b|\b20[1-3]\b/.test(cascadeFleetWall), "Cascade fleet has no Thind unit numbers (101–107/201–203)")

  await cascade.goto(`${BASE}/hub/money`, { waitUntil: "networkidle2" })
  await waitForText(cascade, ANCHORS.money)
  const cascadeMoneyWall = await bodyText(cascade)
  check(!cascadeMoneyWall.includes("THD-"), "Cascade money screen has no THD- reference")
  await shot(cascade, "03-cascade-money")

  // ---- 3. Direct-URL probes: Thind records by id must not render ----
  console.log("3. Cascade owner probes Thind detail URLs by id — must all be not-found")
  for (const [label, url, leak] of [
    ["load", loadUrl, thindLoadRef],
    ["invoice", invoiceUrl, "THD-INV"],
    ["truck", truckUrl, "Freightliner"],
  ]) {
    if (!url) continue
    await cascade.goto(`${BASE}${url}`, { waitUntil: "networkidle2" })
    // Expected outcome is the not-found boundary ("Road Not Found!"); also
    // resolve early if the leak text shows up instead, so a real leak is
    // caught fast rather than masked by a blind sleep either way.
    await cascade
      .waitForFunction(
        (t) => document.body.innerText.toLowerCase().includes("road not found") || (t && document.body.innerText.includes(t)),
        { timeout: 8000 },
        leak
      )
      .catch(() => {})
    const wall = await bodyText(cascade)
    const leaked = leak ? wall.includes(leak) : false
    const notFound = wall.toLowerCase().includes("road not found") || wall.toLowerCase().includes("could not be found")
    check(!leaked, `cross-tenant ${label} probe leaks nothing (no "${leak}")`)
    check(notFound, `cross-tenant ${label} probe lands on the not-found page`)
  }
  await shot(cascade, "04-cascade-cross-tenant-probe")

  // ---- 4. Cascade driver PWA at phone width ----
  console.log("4. Cascade driver @390px — own load only, no THD- anywhere")
  const driverCtx = await browser.createBrowserContext()
  const driver = await driverCtx.newPage()
  await driver.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  driver.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(driver, "driver@cascademo.example")
  await driver.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Last pay")
  const driverHomeWall = await bodyText(driver)
  check(driverHomeWall.length > 40, "Cascade driver home renders real content")
  check(!driverHomeWall.includes("THD-"), "Cascade driver home has no THD- reference")
  await shot(driver, "05-cascade-driver-home")

  await driver.goto(`${BASE}/hub/driver/pay`, { waitUntil: "networkidle2" })
  await waitForText(driver, "Every settlement, line by line — tap one to see what's in it.")
  check(!(await bodyText(driver)).includes("THD-"), "Cascade driver pay has no THD- reference")
  await shot(driver, "06-cascade-driver-pay")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/404/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  // ---- 5. Platform admin suspends Cascade — its whole workspace is cut off ----
  console.log("5. Platform admin suspends Cascade Demo Lines — owner session is cut off mid-JWT")
  const adminCtx = await browser.createBrowserContext()
  const admin = await adminCtx.newPage()
  await admin.setViewport({ width: 1440, height: 950 })
  await login(admin, "admin@hauldesk.app")
  await admin.goto(`${BASE}/hub/admin`, { waitUntil: "networkidle2" })
  // Title "Platform admin" is unique (this surface has no office nav), but
  // the subtitle is the destination-copy mapping — wait for it before
  // reading tenant rows off the streamed body.
  await waitForText(admin, "Tenants and operational counts only")
  await waitForText(admin, "Cascade Demo Lines")

  check(await clickTenantAction(admin, "Cascade Demo Lines"), "clicked Suspend on Cascade Demo Lines")
  check(await waitForTenantStatus(admin, "Cascade Demo Lines", "suspended"), "admin page shows Cascade as suspended")

  // The Cascade owner's session cookie is still a valid JWT — only the
  // per-request isActiveCarrier re-check (src/lib/hub/session.ts) should stop it.
  await cascade.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  // Suspended owner never sees the office subtitle — bounce on leaving
  // /hub/dispatch, then wait for the dead-end copy.
  await cascade.waitForFunction(() => !location.pathname.startsWith("/hub/dispatch"), {
    timeout: 20000,
  })
  check(await waitForPath(cascade, "/hub/suspended"), "suspended Cascade owner is redirected to /hub/suspended")
  // Pathname flips before the dead-end streams in. waitForText lowercases,
  // so the Tailwind `uppercase` h1 still matches.
  await waitForText(cascade, "Workspace suspended")
  // h1 is `uppercase` via Tailwind, and innerText reflects the rendered
  // (CSS-transformed) case, not the source string — compare lowercased.
  check(
    (await bodyText(cascade)).toLowerCase().includes("workspace suspended"),
    "/hub/suspended renders the suspended dead-end copy"
  )

  // The Cascade driver PWA session must be cut off the same way, not just the office side.
  await driver.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  // Suspended driver never sees the PWA "Last pay" card — bounce on leaving
  // /hub/driver, then wait for the dead-end copy (same pattern as the
  // roleless /hub/login bounce).
  check(await waitForPath(driver, "/hub/suspended"), "suspended Cascade driver is redirected to /hub/suspended")
  await waitForText(driver, "Workspace suspended")

  // ---- 6. Reactivate — access is restored without a fresh login ----
  console.log("6. Platform admin reactivates Cascade — owner access is restored")
  check(await clickTenantAction(admin, "Cascade Demo Lines"), "clicked Reactivate on Cascade Demo Lines")
  check(await waitForTenantStatus(admin, "Cascade Demo Lines", "active"), "admin page shows Cascade as active")

  await cascade.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  check(
    await textAppears(cascade, ANCHORS.dispatch),
    "reactivated Cascade owner reaches /hub/dispatch again"
  )

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nTenant-isolation smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nTenant-isolation smoke passed.")
}

main().catch((err) => {
  console.error("\nTENANT-ISOLATION SMOKE FAILED:", err.message)
  process.exit(1)
})
