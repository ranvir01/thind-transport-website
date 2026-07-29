/**
 * Roadmap: tracking share links (/track/[token]) never expired — only manual
 * revoke. This drives the full slice end to end against the local rig:
 *
 *   1. A lapsed link (expires_at in the past) behaves exactly like a revoked
 *      one on the public /track page — "expired or revoked", not a leak.
 *   2. A link about to lapse shows "Expires in N days" with a Renew button in
 *      the office's Tracking links panel (/hub/loads/[id]).
 *   3. Clicking Renew pushes expires_at ~30 days out and the button disappears.
 *   4. A brand-new link (via "New link") shows a ~30-day expiry and no Renew
 *      button — the default TTL applies on creation, not just renewal.
 *
 * Usage: node scripts/e2e-share-link-expiry-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000, POSTGRES_URL (reads .env.local).
 */
import pg from "pg"
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, makeShot, reseed, check, login, waitForText, clickByText, failures, realConsoleErrors } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-share-link-expiry"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

async function main() {
  reseed()

  const db = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL ?? "") ? undefined : { rejectUnauthorized: false },
  })
  await db.connect()

  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`) })

  try {
    const loads = await db.query(
      `SELECT id, carrier_id, reference FROM hub.loads WHERE carrier_id = (
         SELECT id FROM hub.carriers WHERE name = 'Thind Transport'
       ) AND deleted_at IS NULL ORDER BY reference LIMIT 2`
    )
    check(loads.rows.length === 2, "two Thind Transport demo loads exist (kept separate so their panels don't collide)")
    const { id: lapsedLoadId, carrier_id: carrierId } = loads.rows[0]
    const { id: loadId, reference } = loads.rows[1]

    console.log("1. A lapsed link reads exactly like a revoked one on /track")
    const lapsedToken = `e2e-expiry-lapsed-${Date.now().toString(36)}`
    await db.query(
      `INSERT INTO hub.share_links (carrier_id, load_id, token, expires_at)
       VALUES ($1,$2,$3, NOW() - INTERVAL '1 hour')`,
      [carrierId, lapsedLoadId, lapsedToken]
    )
    const respLapsed = await page.goto(`${BASE}/track/${lapsedToken}`, { waitUntil: "networkidle2" })
    check(respLapsed.status() === 200, `GET /track/[lapsed-token] -> ${respLapsed.status()}`)
    const lapsedText = await page.evaluate(() => document.body.innerText)
    check(/expired or revoked/i.test(lapsedText), "lapsed token shows the expired-link card, not the load's status")
    await shot(page, "01-lapsed-token")

    console.log("2. Office sees the soon-to-expire link with a Renew button")
    const soonToken = `e2e-expiry-soon-${Date.now().toString(36)}`
    const soonLink = await db.query(
      `INSERT INTO hub.share_links (carrier_id, load_id, token, expires_at)
       VALUES ($1,$2,$3, NOW() + INTERVAL '3 days') RETURNING id`,
      [carrierId, loadId, soonToken]
    )
    const soonLinkId = soonLink.rows[0].id

    await login(page, "dispatch@demo.thind")
    await page.goto(`${BASE}/hub/loads/${loadId}`, { waitUntil: "networkidle2" })
    await waitForText(page, "Tracking links")
    const panelText1 = await page.evaluate(() => document.body.innerText)
    check(/Expires in [123] days?/.test(panelText1), `panel shows the soon-to-expire link's countdown (saw: ${panelText1.match(/Expires in [^\n]*/)?.[0] ?? "none"})`)
    check(panelText1.includes("Renew 30 days"), "a link inside the renew window offers a Renew action")
    await shot(page, "02-soon-to-expire")

    console.log("3. Renew pushes expiry ~30 days out")
    await clickByText(page, "Renew 30 days")
    await waitForText(page, "Link renewed for 30 more days")
    const renewed = await db.query(`SELECT expires_at FROM hub.share_links WHERE id = $1`, [soonLinkId])
    const daysOut = (new Date(renewed.rows[0].expires_at).getTime() - Date.now()) / 86_400_000
    check(daysOut > 28 && daysOut < 31, `renewed link's expires_at is ~30 days out (measured ${daysOut.toFixed(1)})`)
    await page.reload({ waitUntil: "networkidle2" })
    await waitForText(page, "Tracking links")
    const panelText2 = await page.evaluate(() => document.body.innerText)
    check(!panelText2.includes("Renew 30 days"), "the Renew button drops off once the link is no longer close to expiry")
    await shot(page, "03-after-renew")

    console.log(`4. A fresh link created for ${reference} gets the default 30-day TTL`)
    await clickByText(page, "New link")
    await waitForText(page, "Tracking link created")
    const freshCount = await db.query(
      `SELECT expires_at FROM hub.share_links WHERE carrier_id = $1 AND load_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [carrierId, loadId]
    )
    const freshDaysOut = (new Date(freshCount.rows[0].expires_at).getTime() - Date.now()) / 86_400_000
    check(freshDaysOut > 29 && freshDaysOut <= 30, `freshly-created link defaults to a 30-day expiry (measured ${freshDaysOut.toFixed(1)})`)
    await shot(page, "04-fresh-link")

    check(realConsoleErrors(consoleErrors).length === 0, `no console errors (${realConsoleErrors(consoleErrors).length}: ${realConsoleErrors(consoleErrors).slice(0, 2).join(" | ")})`)
  } catch (err) {
    await shot(page, "ZZ-failure")
    failures.push(`crash: ${err.message}`)
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\nShare-link expiry smoke FAILED (${failures.length}):\n - ${failures.join("\n - ")}`)
    process.exit(1)
  }
  console.log("\nShare-link expiry smoke passed.")
}

main()
