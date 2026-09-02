/**
 * Pickup verification smoke (#14) at 390×844: the driver arrives at a pickup,
 * snaps the truck with the device at the dock, and the office and the broker
 * both see it. Then the same driver re-verifies from twenty miles away and
 * the office is paged while the driver is never blocked.
 *
 *   1. driver@demo.thind on THD-1003 (dispatched, Kent pickup) taps "I'm here"
 *   2. the Verify panel appears; the photo goes in with geolocation AT the dock
 *      → toast "Pickup verified", a hub.pickup_verifications row result=verified,
 *      a load_events check_call, and the panel gives way to "Pickup verified"
 *   3. owner load detail shows the verified pill; /track shows "Pickup verified"
 *   4. reload with geolocation 20 mi off, verify again → result=mismatch, a
 *      pickup_mismatch notification for the dispatcher, the office pill flips
 *      to mismatch, and the public page shows NO tag (positive only)
 *
 * Reseeds first. Usage: node scripts/e2e-pickup-verify-smoke.mjs [outputDir]
 */
import pg from "pg"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { randomBytes } from "node:crypto"
import {
  BASE, failures, check, waitForText, login, makeShot, reseed, clickByText, realConsoleErrors, launchBrowser,
  waitForLoadDetail, textAppears,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-pickup-verify"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

async function main() {
  reseed()
  const db = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL ?? "") ? undefined : { rejectUnauthorized: false },
  })
  await db.connect()

  const { rows: [target] } = await db.query(
    `SELECT l.id AS load_id, l.reference, s.id AS stop_id, s.lat, s.lng
       FROM hub.loads l JOIN hub.stops s ON s.load_id = l.id AND s.carrier_id = l.carrier_id
      WHERE l.reference = 'THD-1003' AND s.type = 'pickup'`
  )
  check(!!target && target.lat != null, `seed has THD-1003 with a geocoded pickup (${target?.lat}, ${target?.lng})`)
  const dock = { latitude: Number(target.lat), longitude: Number(target.lng) }
  const photoPath = path.join(OUT, "dock.png")
  writeFileSync(photoPath, PNG)

  const browser = await launchBrowser()
  const consoleErrors = []
  const ctx = await browser.createBrowserContext()
  await ctx.overridePermissions(BASE, ["geolocation"])
  const page = await ctx.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
  await page.setGeolocation(dock)
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`) })

  console.log("1. Driver arrives at the Kent pickup")
  await login(page, "driver@demo.thind")
  await page.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2" })
  await waitForText(page, "Last pay") // driver home's own copy — the render gate
  await waitForText(page, target.reference)
  const panelBefore = await page.$('[data-testid="verify-pickup"]')
  check(!panelBefore, "no verify panel before arrival")
  await clickByText(page, "I'm here")
  await textAppears(page, "Arrival recorded")
  await page.waitForSelector('[data-testid="verify-pickup"]', { timeout: 15000 })
  check(true, "verify panel appears after I'm here on a pickup")
  await shot(page, "01-verify-panel")

  console.log("2. Snap the truck with the phone at the dock")
  await page.click('[data-testid="verify-pickup-button"]')
  const input = await page.$('[data-testid="verify-pickup-file"]')
  await input.uploadFile(photoPath)
  await textAppears(page, "Pickup verified")
  await page.waitForSelector('[data-testid="pickup-verified-driver"]', { timeout: 15000 })
  check(true, "driver sees Pickup verified and the panel is gone")
  const { rows: v1 } = await db.query(
    `SELECT result, distance_miles, photo_document_id FROM hub.pickup_verifications WHERE load_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [target.load_id]
  )
  check(v1[0]?.result === "verified", `row recorded as verified (${v1[0]?.result}, ${v1[0]?.distance_miles} mi)`)
  check(!!v1[0]?.photo_document_id, "photo saved as a document on the load")
  const { rows: docs } = await db.query(`SELECT kind FROM hub.documents WHERE id = $1`, [v1[0]?.photo_document_id])
  check(docs[0]?.kind === "pickup_photo", `document kind is pickup_photo (${docs[0]?.kind})`)
  const { rows: ev } = await db.query(
    `SELECT payload FROM hub.load_events WHERE load_id = $1 AND kind = 'check_call' AND payload->>'type' = 'pickup_verification'`,
    [target.load_id]
  )
  check(ev.length === 1 && ev[0].payload.result === "verified", "one check_call event on the timeline")
  await shot(page, "02-driver-verified")

  console.log("3. The office and the broker see it")
  const office = await (await browser.createBrowserContext()).newPage()
  await office.setViewport({ width: 1440, height: 900 })
  office.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`) })
  await login(office, "owner@demo.thind")
  await office.goto(`${BASE}/hub/loads/${target.load_id}`, { waitUntil: "networkidle2" })
  await waitForText(office, "Linehaul") // load detail's own copy — the render gate
  await waitForLoadDetail(office)
  const pill1 = await office.$eval('[data-testid="pickup-pill"]', (el) => el.textContent.trim()).catch(() => null)
  check(!!pill1 && /^Pickup verified/.test(pill1), `load detail pill (${pill1})`)
  await shot(office, "03-office-verified")

  // A public link for the broker (the seed does not mint one for THD-1003).
  const token = randomBytes(16).toString("hex")
  await db.query(
    `INSERT INTO hub.share_links (carrier_id, load_id, token, expires_at)
     SELECT carrier_id, id, $2, NOW() + INTERVAL '1 day' FROM hub.loads WHERE id = $1`,
    [target.load_id, token]
  )
  const pub = await (await browser.createBrowserContext()).newPage()
  await pub.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await pub.goto(`${BASE}/track/${token}`, { waitUntil: "networkidle2" })
  await waitForText(pub, target.reference)
  const tag1 = await pub.$('[data-testid="pickup-verified"]')
  check(!!tag1, "public tracking page shows Pickup verified on the pickup stop")
  await shot(pub, "04-public-verified")

  console.log("4. Re-verify from 20 miles away — office paged, driver never blocked")
  await page.setGeolocation({ latitude: dock.latitude + 0.29, longitude: dock.longitude })
  // The card hides the panel once a load is verified. Clear the row so it
  // comes back — the state a driver is in when the office rejects the first
  // photo — and verify again from the wrong place.
  await db.query(`DELETE FROM hub.pickup_verifications WHERE load_id = $1`, [target.load_id])
  await page.reload({ waitUntil: "networkidle2" })
  await page.waitForSelector('[data-testid="verify-pickup"]', { timeout: 15000 })
  await page.click('[data-testid="verify-pickup-button"]')
  const input2 = await page.$('[data-testid="verify-pickup-file"]')
  await input2.uploadFile(photoPath)
  await textAppears(page, "did not match")
  const { rows: v2 } = await db.query(
    `SELECT result, distance_miles FROM hub.pickup_verifications WHERE load_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [target.load_id]
  )
  check(v2[0]?.result === "mismatch" && Number(v2[0]?.distance_miles) > 15, `mismatch recorded (${v2[0]?.result}, ${v2[0]?.distance_miles} mi)`)
  const { rows: notes } = await db.query(
    `SELECT n.title FROM hub.notifications n JOIN hub.users u ON u.id = n.user_id
      WHERE n.kind = 'pickup_mismatch' AND u.email = 'dispatch@demo.thind'`
  )
  check(notes.length >= 1 && /THD-1003/.test(notes[0].title), `dispatcher was paged (${notes[0]?.title})`)
  const { rows: stillArrived } = await db.query(`SELECT arrived_at FROM hub.stops WHERE id = $1`, [target.stop_id])
  check(!!stillArrived[0]?.arrived_at, "the arrival itself was never undone")
  await shot(page, "05-driver-mismatch")

  await office.reload({ waitUntil: "networkidle2" })
  await waitForLoadDetail(office)
  const pill2 = await office.$eval('[data-testid="pickup-pill"]', (el) => el.textContent.trim()).catch(() => null)
  check(!!pill2 && /^Pickup mismatch/.test(pill2), `office pill flips to mismatch (${pill2})`)
  await pub.reload({ waitUntil: "networkidle2" })
  await waitForText(pub, target.reference)
  const tag2 = await pub.$('[data-testid="pickup-verified"]')
  check(!tag2, "public page shows no tag on a mismatch — positive only")
  await shot(office, "06-office-mismatch")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/401|403/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  await db.end()
  if (failures.length > 0) {
    console.error(`\nPickup-verify smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nPickup-verify smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
