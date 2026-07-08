/**
 * Dispatch → driver notification smoke: a booked load advances to Dispatched on
 * the office board and the assigned driver's in-app feed gets a load_dispatched
 * row (regression for changeLoadStatus → notifyDriver).
 *
 * The seeded Sacramento booked load ships on driver index 1 (no login). This
 * smoke reassigns it to driver@demo.thind before dispatch so the notify spine
 * has a user to target — same board geography as e2e-dispatch-smoke.mjs.
 *
 * Usage: node scripts/e2e-dispatch-driver-notify-smoke.mjs [outputDir]
 * Requires: npm run dev (or start) on localhost:3000, POSTGRES_URL (reads .env.local).
 */
import puppeteer from "puppeteer"
import pg from "pg"
import { readFileSync, mkdirSync, existsSync } from "node:fs"
import { BASE, sleep, failures, check, waitForText, login, makeShot, reseed } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-dispatch-notify"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

if (!process.env.POSTGRES_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const LEGAL = "Sacramento"

const boardCard = (marker) => {
  const cards = [...document.querySelectorAll("section.rounded-card")]
    .filter((c) => c.querySelector("a[href^='/hub/loads/']"))
  for (const card of cards) {
    if (card.innerText.toLowerCase().includes(marker.toLowerCase())) {
      const column =
        card.parentElement.closest("section")?.querySelector("h2")?.textContent?.trim() ?? null
      return { column, card }
    }
  }
  return null
}

const findColumn = (page, marker) =>
  page.evaluate((m, fn) => {
    const found = new Function(`return (${fn})`)()(m)
    return found ? found.column : null
  }, marker, boardCard.toString())

const clickAdvance = (page, marker) =>
  page.evaluate((m, fn) => {
    const found = new Function(`return (${fn})`)()(m)
    if (!found) return false
    const btn = found.card.querySelector("button")
    if (!btn) return false
    btn.click()
    return true
  }, marker, boardCard.toString())

async function prepSacramentoForDemoDriver(db) {
  const { rows: users } = await db.query(
    `SELECT id AS user_id, driver_id FROM hub.users WHERE email = 'driver@demo.thind'`
  )
  const driverUserId = users[0]?.user_id
  const driverId = users[0]?.driver_id
  check(!!driverUserId && !!driverId, "demo driver user is linked to a driver record")

  const { rows: loads } = await db.query(
    `SELECT l.id, l.reference
       FROM hub.loads l
       JOIN hub.stops s ON s.load_id = l.id AND s.type = 'delivery' AND s.city = 'Sacramento'
      WHERE l.status = 'booked' AND l.deleted_at IS NULL
      LIMIT 1`
  )
  check(loads.length === 1, `found one booked Sacramento load (${loads[0]?.reference ?? "none"})`)

  await db.query(`UPDATE hub.loads SET driver_id = $1 WHERE id = $2`, [driverId, loads[0].id])
  return { driverUserId, reference: loads[0].reference }
}

async function main() {
  reseed()

  const db = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL ?? "") ? undefined : { rejectUnauthorized: false },
  })
  await db.connect()

  const { driverUserId, reference } = await prepSacramentoForDemoDriver(db)
  const before = Number(
    (
      await db.query(
        `SELECT COUNT(*) AS count FROM hub.notifications WHERE user_id = $1 AND kind = 'load_dispatched'`,
        [driverUserId]
      )
    ).rows[0].count
  )

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

  console.log("1. Dispatcher advances the Sacramento booked load")
  await login(page, "dispatch@demo.thind")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  await waitForText(page, "Dispatch Board")
  check((await findColumn(page, LEGAL)) === "Booked", `${LEGAL} load starts in Booked`)
  await shot(page, "01-board-before")
  check(await clickAdvance(page, LEGAL), `clicked Advance on the ${LEGAL} card`)
  await waitForText(page, "Moved to Dispatched")
  await page.goto(`${BASE}/hub/dispatch`, { waitUntil: "networkidle2" })
  check((await findColumn(page, LEGAL)) === "Dispatched", `${LEGAL} load is now in Dispatched`)
  await shot(page, "02-board-dispatched")

  console.log("2. hub.notifications row landed for the demo driver")
  const after = Number(
    (
      await db.query(
        `SELECT COUNT(*) AS count FROM hub.notifications WHERE user_id = $1 AND kind = 'load_dispatched'`,
        [driverUserId]
      )
    ).rows[0].count
  )
  check(after === before + 1, `load_dispatched count ${before} -> ${after}`)
  const newest = (
    await db.query(
      `SELECT title, body, link FROM hub.notifications
        WHERE user_id = $1 AND kind = 'load_dispatched'
        ORDER BY created_at DESC LIMIT 1`,
      [driverUserId]
    )
  ).rows[0]
  check(
    newest?.title?.includes(reference) && newest?.title?.toLowerCase().includes("dispatched"),
    `notification title references the load (${newest?.title})`
  )
  check(newest?.link === "/hub/driver", `notification deep-links to driver app (${newest?.link})`)

  console.log("3. Driver sees the alert in the notification bell")
  const driverContext = await browser.createBrowserContext()
  const driverPage = await driverContext.newPage()
  await driverPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  driverPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  await login(driverPage, "driver@demo.thind")
  check(driverPage.url().includes("/hub/driver"), `driver landed on PWA (${driverPage.url()})`)
  await waitForText(driverPage, "Hey,")
  const badge = await driverPage.$('button[aria-label^="Notifications ("]')
  check(!!badge, "notification bell shows an unread badge")
  await driverPage.click('button[aria-label^="Notifications"]')
  await waitForText(driverPage, "dispatched to you")
  check(
    (await driverPage.evaluate(() => document.body.innerText)).includes(reference),
    `bell feed shows ${reference}`
  )
  await shot(driverPage, "03-driver-bell")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  await db.end()

  if (failures.length > 0) {
    console.error(`\nDispatch driver-notify smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDispatch driver-notify smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
