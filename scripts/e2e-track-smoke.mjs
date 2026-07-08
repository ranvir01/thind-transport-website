/**
 * Public tracking page smoke (`/track/[token]`): the one hub surface with no
 * demo login, so it never got an automated visual check (see the invisible-
 * text bug fixed on the portal home/quote-form siblings — this page uses the
 * same forced-dark tokens and could regress the same way unnoticed).
 *
 * Drives the page directly at 390px for a live in-transit load (status
 * banner + stop timeline + last-seen position), a delivered/money-status
 * load (status caps at "Delivered"), and an unknown token (expired-link
 * card) — and asserts the heading/status text renders light-on-dark instead
 * of the near-black default that `text-fg*` resolves to outside forced-dark
 * surfaces.
 *
 * Usage: node scripts/e2e-track-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000, POSTGRES_URL (reads .env.local).
 */
import puppeteer from "puppeteer"
import pg from "pg"
import { readFileSync, existsSync, mkdirSync } from "node:fs"
import { BASE, makeShot, reseed, check, failures } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-track"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

if (!process.env.POSTGRES_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

/** Parses "rgb(r, g, b)" / "rgba(r, g, b, a)" into a 0-255 brightness estimate. */
function brightness(rgbString) {
  const m = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  const [, r, g, b] = m.map(Number)
  return (r * 299 + g * 587 + b * 114) / 1000
}

async function main() {
  reseed()

  const db = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL ?? "") ? undefined : { rejectUnauthorized: false },
  })
  await db.connect()

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  const consoleErrors = []
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()) })

  try {
    console.log("1. In-transit load at 390px")
    const inTransit = await db.query(
      `SELECT sl.token, l.reference FROM hub.share_links sl
         JOIN hub.loads l ON l.id = sl.load_id
        WHERE l.status = 'in_transit' AND sl.revoked_at IS NULL
        ORDER BY sl.created_at DESC LIMIT 1`
    )
    check(!!inTransit.rows[0], "seed produced an in-transit share link")
    const liveToken = inTransit.rows[0].token
    const liveRef = inTransit.rows[0].reference

    const resp1 = await page.goto(`${BASE}/track/${liveToken}`, { waitUntil: "networkidle2" })
    check(resp1.status() === 200, `GET /track/[token] -> ${resp1.status()}`)
    const text1 = await page.evaluate(() => document.body.innerText)
    check(text1.includes(liveRef), `page shows load reference (${liveRef})`)
    check(/In Transit|last seen near/i.test(text1), "status shows In Transit + last-seen position")

    const headingColor1 = await page.evaluate(() => {
      const h1 = document.querySelector("h1")
      return h1 ? getComputedStyle(h1).color : null
    })
    const bright1 = brightness(headingColor1 ?? "")
    check(bright1 !== null && bright1 > 150, `heading renders light-on-dark (color=${headingColor1}, brightness=${bright1?.toFixed(0)})`)
    await shot(page, "01-in-transit")

    console.log("2. Delivered / money-status load at 390px")
    let delivered = await db.query(
      `SELECT sl.token, l.reference FROM hub.share_links sl
         JOIN hub.loads l ON l.id = sl.load_id
        WHERE l.status IN ('pod_received','invoiced','paid','settled') AND sl.revoked_at IS NULL
        ORDER BY sl.created_at DESC LIMIT 1`
    )
    let deliveredToken, deliveredRef
    if (delivered.rows[0]) {
      deliveredToken = delivered.rows[0].token
      deliveredRef = delivered.rows[0].reference
    } else {
      const load = await db.query(
        `SELECT id, carrier_id, reference FROM hub.loads
          WHERE status IN ('pod_received','invoiced','paid','settled') LIMIT 1`
      )
      check(!!load.rows[0], "a delivered/money-status demo load exists")
      const token = `e2e-track-smoke-${Date.now().toString(36)}`
      await db.query(
        `INSERT INTO hub.share_links (carrier_id, load_id, token) VALUES ($1,$2,$3)`,
        [load.rows[0].carrier_id, load.rows[0].id, token]
      )
      deliveredToken = token
      deliveredRef = load.rows[0].reference
    }

    const resp2 = await page.goto(`${BASE}/track/${deliveredToken}`, { waitUntil: "networkidle2" })
    check(resp2.status() === 200, `GET /track/[token] (delivered) -> ${resp2.status()}`)
    const text2 = await page.evaluate(() => document.body.innerText)
    check(text2.includes(deliveredRef), `page shows load reference (${deliveredRef})`)
    check(text2.includes("Delivered"), "money-status load caps at public label \"Delivered\"")
    check(!/pod_received|invoiced|paid|settled/i.test(text2), "internal money status never leaks to the public page")
    await shot(page, "02-delivered")

    console.log("3. Cancelled load at 390px")
    let cancelled = await db.query(
      `SELECT sl.token, l.reference FROM hub.share_links sl
         JOIN hub.loads l ON l.id = sl.load_id
        WHERE l.status = 'cancelled' AND sl.revoked_at IS NULL
        ORDER BY sl.created_at DESC LIMIT 1`
    )
    let cancelledToken, cancelledRef
    if (cancelled.rows[0]) {
      cancelledToken = cancelled.rows[0].token
      cancelledRef = cancelled.rows[0].reference
    } else {
      const load = await db.query(`SELECT id, carrier_id, reference FROM hub.loads WHERE status = 'cancelled' LIMIT 1`)
      check(!!load.rows[0], "a cancelled demo load exists")
      const token = `e2e-track-cancelled-${Date.now().toString(36)}`
      await db.query(
        `INSERT INTO hub.share_links (carrier_id, load_id, token) VALUES ($1,$2,$3)`,
        [load.rows[0].carrier_id, load.rows[0].id, token]
      )
      cancelledToken = token
      cancelledRef = load.rows[0].reference
    }

    const respC = await page.goto(`${BASE}/track/${cancelledToken}`, { waitUntil: "networkidle2" })
    check(respC.status() === 200, `GET /track/[token] (cancelled) -> ${respC.status()}`)
    const textC = await page.evaluate(() => document.body.innerText)
    check(textC.includes(cancelledRef), `page shows load reference (${cancelledRef})`)
    check(/cancelled/i.test(textC), "cancelled load shows the cancelled banner")
    const bannerColor = await page.evaluate(() => {
      const el = [...document.querySelectorAll("p")].find((p) => /cancelled/i.test(p.textContent ?? ""))
      return el ? getComputedStyle(el).color : null
    })
    const brightC = brightness(bannerColor ?? "")
    check(brightC !== null && brightC > 120, `cancelled banner renders light-on-dark (color=${bannerColor}, brightness=${brightC?.toFixed(0)})`)
    await shot(page, "03-cancelled")

    console.log("4. Unknown token at 390px")
    const resp3 = await page.goto(`${BASE}/track/not-a-real-token-${Date.now()}`, { waitUntil: "networkidle2" })
    check(resp3.status() === 200, `GET /track/[bad-token] -> ${resp3.status()}`)
    const text3 = await page.evaluate(() => document.body.innerText)
    check(/expired or revoked/i.test(text3), "unknown token shows the expired-link card")
    await shot(page, "04-unknown-token")

    check(consoleErrors.length === 0, `no console errors (${consoleErrors.length}: ${consoleErrors.slice(0, 2).join(" | ")})`)
  } catch (err) {
    await shot(page, "ZZ-failure")
    failures.push(`crash: ${err.message}`)
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\nTrack smoke FAILED (${failures.length}):\n - ${failures.join("\n - ")}`)
    process.exit(1)
  }
  console.log("\nTrack smoke passed.")
}

main()
