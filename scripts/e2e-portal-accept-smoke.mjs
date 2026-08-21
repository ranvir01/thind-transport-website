/**
 * Portal invitation acceptance smoke (`/hub/portal/accept/[token]`): the one
 * portal flow with no demo login, so — like `/track/[token]` before it — it
 * never got an automated visual check. This is the exact page that shipped
 * with invisible text (light-mode fieldCls/labelCls on the forced-dark portal
 * background) until 830e7f8 fixed it; this script is the regression guard the
 * fix's Backlog: asked for.
 *
 * Seeds a `hub.portal_invitations` row directly via DB insert (mirrors how
 * e2e-track-smoke.mjs seeds `hub.share_links` for the other no-login page),
 * then drives: a valid invitation (fill + submit -> signed in on /hub/portal),
 * an already-used invitation, an expired invitation, and an unknown token —
 * asserting light-on-dark contrast on every card state.
 *
 * Usage: node scripts/e2e-portal-accept-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000, POSTGRES_URL (reads .env.local).
 */
import pg from "pg"
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, reseed, makeShot, check, failures, realConsoleErrors } from "./e2e-lib.mjs"
import { loadEnvLocal } from "./env-local.mjs"

const OUT = process.argv[2] ?? "e2e-shots-portal-accept"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

/** Parses "rgb(r, g, b)" / "rgba(r, g, b, a)" into a 0-255 brightness estimate. */
function brightness(rgbString) {
  const m = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  const [, r, g, b] = m.map(Number)
  return (r * 299 + g * 587 + b * 114) / 1000
}

async function makeInvitation(db, { customerId, carrierId }, { expiresInMs, accepted = false }) {
  const token = `e2e-accept-smoke-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
  const email = `${token}@demo.thind`
  let acceptedUserId = null
  if (accepted) {
    const user = await db.query(
      `INSERT INTO hub.users (carrier_id, email, password_hash, name, role, customer_id)
       VALUES ($1,$2,'x','E2E Already Used','broker',$3) RETURNING id`,
      [carrierId, `used-${token}@demo.thind`, customerId]
    )
    acceptedUserId = user.rows[0].id
  }
  await db.query(
    `INSERT INTO hub.portal_invitations
       (carrier_id, customer_id, email, role, token, invited_by_name, accepted_user_id, expires_at)
     VALUES ($1,$2,$3,'broker',$4,'E2E Smoke',$5, NOW() + $6 * INTERVAL '1 millisecond')`,
    [carrierId, customerId, email, token, acceptedUserId, expiresInMs]
  )
  return { token, email }
}

async function main() {
  reseed()

  const db = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL ?? "") ? undefined : { rejectUnauthorized: false },
  })
  await db.connect()

  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  const consoleErrors = []
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`) })

  try {
    const customer = await db.query(`SELECT id, carrier_id, name FROM hub.customers LIMIT 1`)
    check(!!customer.rows[0], "seed produced a customer to invite")
    const { id: customerId, carrier_id: carrierId, name: customerName } = customer.rows[0]

    console.log("1. Valid invitation at 390px")
    const valid = await makeInvitation(db, { customerId, carrierId }, { expiresInMs: 24 * 60 * 60 * 1000 })
    const resp1 = await page.goto(`${BASE}/hub/portal/accept/${valid.token}`, { waitUntil: "networkidle2" })
    check(resp1.status() === 200, `GET /hub/portal/accept/[token] -> ${resp1.status()}`)
    const text1 = await page.evaluate(() => document.body.innerText)
    check(text1.includes(customerName), `page shows the inviting carrier's customer (${customerName})`)
    check(text1.includes(valid.email), "page shows the invited account email")

    const introColor = await page.evaluate(() => {
      const p = document.querySelector("p")
      return p ? getComputedStyle(p).color : null
    })
    const introBright = brightness(introColor ?? "")
    check(introBright !== null && introBright > 120, `intro copy renders light-on-dark (color=${introColor}, brightness=${introBright?.toFixed(0)})`)

    await page.type("#acc-name", "E2E Test Broker")
    await page.type("#acc-pass", "smoke-test-pass")
    const nameColor = await page.evaluate(() => getComputedStyle(document.querySelector("#acc-name")).color)
    const nameBright = brightness(nameColor ?? "")
    check(nameBright !== null && nameBright > 150, `name input renders light-on-dark (color=${nameColor}, brightness=${nameBright?.toFixed(0)})`)
    await shot(page, "01-valid-invitation")

    // Accepting sets window.location.href — a full navigation. Wait for it to
    // finish loading before touching the page again: screenshotting mid-swap
    // dies with "Cannot take screenshot with 0 width".
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      page.click('button[type="submit"]'),
    ])
    check(page.url().includes("/hub/portal"), `accepting the invitation signs in and lands on /hub/portal (url=${page.url()})`)
    // The pathname flips before the new document paints (readyState is still
    // "loading" with an empty body) — wait for real content so the shot shows
    // the portal, not a blank frame that makeShot's retry would accept.
    await page.waitForFunction(
      () => document.readyState === "complete" && (document.body?.innerText.length ?? 0) > 0,
      { timeout: 15000 }
    )
    await shot(page, "02-signed-in")

    console.log("2. Already-used invitation at 390px")
    const used = await makeInvitation(db, { customerId, carrierId }, { expiresInMs: 24 * 60 * 60 * 1000, accepted: true })
    const resp2 = await page.goto(`${BASE}/hub/portal/accept/${used.token}`, { waitUntil: "networkidle2" })
    check(resp2.status() === 200, `GET /hub/portal/accept/[token] (used) -> ${resp2.status()}`)
    const text2 = await page.evaluate(() => document.body.innerText)
    check(/already used/i.test(text2), "used invitation shows the already-used message")
    const usedColor = await page.evaluate(() => {
      const p = document.querySelector("p")
      return p ? getComputedStyle(p).color : null
    })
    const usedBright = brightness(usedColor ?? "")
    check(usedBright !== null && usedBright > 120, `already-used copy renders light-on-dark (color=${usedColor}, brightness=${usedBright?.toFixed(0)})`)
    await shot(page, "03-already-used")

    console.log("3. Expired invitation at 390px")
    const expired = await makeInvitation(db, { customerId, carrierId }, { expiresInMs: -60 * 1000 })
    const resp3 = await page.goto(`${BASE}/hub/portal/accept/${expired.token}`, { waitUntil: "networkidle2" })
    check(resp3.status() === 200, `GET /hub/portal/accept/[token] (expired) -> ${resp3.status()}`)
    const text3 = await page.evaluate(() => document.body.innerText)
    check(/expired/i.test(text3), "expired invitation shows the expired message")
    const expiredColor = await page.evaluate(() => {
      const p = document.querySelector("p")
      return p ? getComputedStyle(p).color : null
    })
    const expiredBright = brightness(expiredColor ?? "")
    check(expiredBright !== null && expiredBright > 120, `expired copy renders light-on-dark (color=${expiredColor}, brightness=${expiredBright?.toFixed(0)})`)
    await shot(page, "04-expired")

    console.log("4. Unknown token at 390px")
    const resp4 = await page.goto(`${BASE}/hub/portal/accept/not-a-real-token-${Date.now()}`, { waitUntil: "networkidle2" })
    check(resp4.status() === 200, `GET /hub/portal/accept/[bad-token] -> ${resp4.status()}`)
    const text4 = await page.evaluate(() => document.body.innerText)
    check(/isn.t valid/i.test(text4), "unknown token shows the invalid-link message")
    const badColor = await page.evaluate(() => {
      const p = document.querySelector("p")
      return p ? getComputedStyle(p).color : null
    })
    const badBright = brightness(badColor ?? "")
    check(badBright !== null && badBright > 120, `invalid-link copy renders light-on-dark (color=${badColor}, brightness=${badBright?.toFixed(0)})`)
    await shot(page, "05-unknown-token")

    check(realConsoleErrors(consoleErrors).length === 0, `no console errors (${realConsoleErrors(consoleErrors).length}: ${realConsoleErrors(consoleErrors).slice(0, 2).join(" | ")})`)
  } catch (err) {
    failures.push(`crash: ${err.message}`)
    // Best-effort: a page mid-navigation (or crashed) has a 0-width frame and
    // the screenshot itself throws — record the real error first so the shot
    // failing can never mask it (it hid the actual crash before this guard).
    try {
      await shot(page, "ZZ-failure")
    } catch (shotErr) {
      console.error(`  (failure screenshot unavailable: ${shotErr.message})`)
    }
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\nPortal accept smoke FAILED (${failures.length}):\n - ${failures.join("\n - ")}`)
    process.exit(1)
  }
  console.log("\nPortal accept smoke passed.")
}

main().catch((err) => {
  console.error("\nPortal accept smoke CRASHED:", err.message)
  process.exit(1)
})
