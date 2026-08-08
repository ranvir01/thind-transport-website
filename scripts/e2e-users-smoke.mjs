/**
 * User-management smoke — /hub/settings/users was the last owner-only screen
 * without a dedicated drive, and it guards the front door: who can sign in at
 * all. Owner opens the roster and sees the seeded staff, creates a dispatcher
 * account, is told a duplicate email already has an account, the new hire
 * signs in with the temp password and lands on the office side, the owner
 * deactivates them (badge flips, their login is refused — findHubUserByEmail
 * filters active = TRUE), reactivates them (login works again), and a
 * dispatcher is bounced off the page entirely (requireOwner redirects to
 * /hub).
 *
 * Reseeds demo data first — each run inserts the SMK account, and the seed's
 * hub.users TRUNCATE is what keeps the create step from tripping its own
 * duplicate-email guard run over run.
 *
 * Usage: node scripts/e2e-users-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import { BASE, failures, check, waitForText, waitForPath, login, makeShot, reseed, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-users"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const NEW_NAME = "SMK Night Dispatcher"
// Deliberately NOT @demo.thind: the HUB_DEMO_LOGIN=false go-live gate refuses
// demo-suffixed emails at authorize(), which would fail step 4 on a gated rig.
const NEW_EMAIL = "smk.night.dispatch@example.com"
const NEW_PASSWORD = "SmkTemp1234!"

/** Row div for the user whose email is shown — the roster renders email as a p. */
async function userRow(page, email) {
  return page.evaluate((em) => {
    const row = [...document.querySelectorAll("p")]
      .find((p) => (p.textContent ?? "").trim() === em)
      ?.closest("div.flex")
    if (!row) return null
    const text = row.innerText
    return {
      text,
      inactive: /INACTIVE/.test(text),
      isSelf: text.includes("(you)"),
      toggleLabel:
        row.querySelector("button[aria-label]")?.getAttribute("aria-label") ?? null,
    }
  }, email)
}

/** Attempt a login that is EXPECTED to fail: stays on /hub/login with the toast. */
async function loginRefused(page, email, password) {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
  await page.type("#email", email)
  await page.type("#password", password)
  await page.click('button[type="submit"]')
  // The hub login's refusal copy became "Invalid email, password — or a
  // missing 2FA code" when 2FA landed; pin the stable prefix, not the tail.
  await waitForText(page, "Invalid email, password")
  return page.evaluate(() => location.pathname)
}

async function main() {
  reseed()
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Owner opens the user roster")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/settings/users`, { waitUntil: "networkidle2" })
  // Page subtitle since the "Company & users" rename — unique to this screen,
  // unlike the title, which the settings index card also renders.
  await waitForText(page, "alert emails, and who can sign in")
  const roster = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      owner: text.includes("owner@demo.thind"),
      dispatch: text.includes("dispatch@demo.thind"),
      accounting: text.includes("accounting@demo.thind"),
      otherTenant: text.includes("cascademo.example"),
    }
  })
  check(roster.owner && roster.dispatch && roster.accounting, "seeded staff roster renders")
  check(!roster.otherTenant, "other tenant's users never appear (carrier_id scoping)")
  const self = await userRow(page, "owner@demo.thind")
  check(Boolean(self?.isSelf), "owner's own row is marked (you)")
  check(self?.toggleLabel === null, "no deactivate button on your own row")
  const dispatchRow = await userRow(page, "dispatch@demo.thind")
  check(
    dispatchRow?.toggleLabel?.startsWith("Deactivate"),
    `other rows get a deactivate toggle (${dispatchRow?.toggleLabel})`
  )
  await shot(page, "01-roster")

  console.log("2. Create a dispatcher account")
  await page.click("button ::-p-text(New account)")
  await page.waitForSelector("#u_name")
  await page.type("#u_name", NEW_NAME)
  await page.type("#u_email", NEW_EMAIL)
  await page.select("#u_role", "dispatcher")
  await page.type("#u_password", NEW_PASSWORD)
  await shot(page, "02-new-account-form")
  // Scoped: the page also renders the company-profile and notifications
  // forms, so a bare "form button[type=submit]" hits the wrong Save.
  await page.click("form:has(#u_name) button[type=submit]")
  await waitForText(page, `Account created for ${NEW_NAME}`)
  await waitForText(page, NEW_EMAIL)
  const created = await userRow(page, NEW_EMAIL)
  check(Boolean(created), "new account appears on the roster")
  check(/DISPATCHER/.test(created?.text ?? ""), "role badge says dispatcher")
  check(!created?.inactive, "new account starts active")
  await shot(page, "03-account-created")

  console.log("3. Duplicate email is refused")
  await page.click("button ::-p-text(New account)")
  await page.waitForSelector("#u_name")
  await page.type("#u_name", "SMK Duplicate")
  await page.type("#u_email", "dispatch@demo.thind")
  await page.type("#u_password", NEW_PASSWORD)
  await page.click("form:has(#u_name) button[type=submit]")
  await waitForText(page, "Email already has an account")
  check(true, "duplicate email surfaces 'Email already has an account'")
  await shot(page, "04-duplicate-refused")

  console.log("4. New hire signs in with the temp password")
  const hireCtx = await browser.createBrowserContext()
  const hirePage = await hireCtx.newPage()
  await hirePage.setViewport({ width: 1440, height: 900 })
  await login(hirePage, NEW_EMAIL, NEW_PASSWORD)
  await hirePage.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  const hire = await hirePage.evaluate(() => ({
    path: location.pathname,
    office: document.body.innerText.includes("in one calm place"),
  }))
  check(hire.path === "/hub" && hire.office, `new dispatcher lands on the office Today page (${hire.path})`)
  await shot(hirePage, "05-new-hire-signed-in")
  await hireCtx.close()

  console.log("5. Deactivate the new hire")
  await page.click(`button[aria-label="Deactivate ${NEW_NAME}"]`)
  await waitForText(page, `${NEW_NAME} deactivated`)
  await page.waitForFunction(
    (em) => {
      const row = [...document.querySelectorAll("p")]
        .find((p) => (p.textContent ?? "").trim() === em)
        ?.closest("div.flex")
      return /INACTIVE/.test(row?.innerText ?? "")
    },
    { timeout: 15000 },
    NEW_EMAIL
  )
  check(true, "INACTIVE badge shows after deactivation")
  await shot(page, "06-deactivated")

  console.log("6. Deactivated account cannot sign in")
  const lockedCtx = await browser.createBrowserContext()
  const lockedPage = await lockedCtx.newPage()
  await lockedPage.setViewport({ width: 1440, height: 900 })
  const lockedPath = await loginRefused(lockedPage, NEW_EMAIL, NEW_PASSWORD)
  check(lockedPath === "/hub/login", `deactivated login refused, stays on ${lockedPath}`)
  await shot(lockedPage, "07-deactivated-login-refused")
  await lockedCtx.close()

  console.log("7. Reactivate — the account works again")
  await page.click(`button[aria-label="Reactivate ${NEW_NAME}"]`)
  await waitForText(page, `${NEW_NAME} reactivated`)
  const backCtx = await browser.createBrowserContext()
  const backPage = await backCtx.newPage()
  await backPage.setViewport({ width: 1440, height: 900 })
  await login(backPage, NEW_EMAIL, NEW_PASSWORD)
  const backPath = await backPage.evaluate(() => location.pathname)
  check(backPath.startsWith("/hub"), `reactivated login works (landed on ${backPath})`)
  await backCtx.close()
  await shot(page, "08-reactivated")

  console.log("8. Dispatcher is bounced off the page (owner only)")
  const dispCtx = await browser.createBrowserContext()
  const dispPage = await dispCtx.newPage()
  await dispPage.setViewport({ width: 1440, height: 900 })
  await login(dispPage, "dispatch@demo.thind")
  await dispPage.goto(`${BASE}/hub/settings/users`, { waitUntil: "networkidle2" })
  // requireOwner's redirect is server-side and already resolved by the time
  // goto() settles, but poll for the landing path instead of a fixed sleep
  // in case a slow rig leaves the redirect still in flight under contention.
  await waitForPath(dispPage, "/hub")
  const disp = await dispPage.evaluate(() => ({
    path: location.pathname,
    seesRoster: document.body.innerText.includes("alert emails, and who can sign in"),
  }))
  check(disp.path !== "/hub/settings/users", `dispatcher redirected away (landed on ${disp.path})`)
  check(!disp.seesRoster, "dispatcher never sees the roster")
  await shot(dispPage, "09-dispatcher-bounced")
  await dispCtx.close()

  const realErrors = realConsoleErrors(consoleErrors)
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nUsers smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nUsers smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
