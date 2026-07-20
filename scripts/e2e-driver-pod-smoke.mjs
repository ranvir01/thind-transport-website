/**
 * Driver paperwork smoke: on a 390×844 viewport, confirm the dispatch, send a
 * POD through the load card's SEND PAPERWORK input and verify the
 * hub.documents row lands, then satisfy the office's pinned document request
 * (which the seed deliberately addresses to a driver who does NOT own the
 * load — regression for the request-authorizes-upload path in
 * driverUploadDocument) and verify the request flips to satisfied.
 *
 * Usage: node scripts/e2e-driver-pod-smoke.mjs [outputDir]
 * Requires: npm run start on localhost:3000, POSTGRES_URL (reads .env.local).
 */
import pg from "pg"
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { launchBrowser, BASE, clickByText, waitForText, textGone, makeShot, reseed, check, failures } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

// tiny valid 1×1 PNG, stands in for the camera photo
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

/** The paperwork inputs are hidden `<input type=file>`s — pick by container text. */
async function fileInputIn(page, containerSelector, containerText) {
  const handle = await page.evaluateHandle(
    (sel, text) => {
      const matches = [...document.querySelectorAll(sel)].filter(
        (el) => el.querySelector('input[type="file"]') && el.textContent.toLowerCase().includes(text.toLowerCase())
      )
      // innermost match — outer page wrappers contain every input on the screen
      const box = matches.find((m) => !matches.some((o) => o !== m && m.contains(o)))
      return box?.querySelector('input[type="file"]') ?? null
    },
    containerSelector, containerText
  )
  return handle.asElement()
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
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()) })

  try {
    console.log("1. Login as demo driver at 390px")
    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    await page.type("#email", "driver@demo.thind")
    await page.type("#password", "ThindDemo1!")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      page.click('button[type="submit"]'),
    ])
    check(page.url().includes("/hub/driver"), `landed on driver app (${page.url()})`)
    await waitForText(page, "THD-")
    await shot(page, "01-driver-home")

    console.log("2. Confirm dispatch")
    await clickByText(page, "confirm this dispatch")
    await waitForText(page, "Dispatch confirmed")
    check(true, "dispatch confirmed toast shown")
    // The toast fires before router.refresh() re-renders the card without the
    // (now acknowledged_at-gated) confirm button — wait for that button to
    // actually leave the page instead of a fixed sleep, so the screenshot and
    // the rest of the flow don't race a stale "unconfirmed" card.
    check(await textGone(page, "confirm this dispatch"), "confirm-dispatch button cleared after refresh")
    await shot(page, "02-confirmed")

    console.log("3. Send a POD through SEND PAPERWORK")
    const podPath = path.join(OUT, "pod-photo.png")
    writeFileSync(podPath, PNG)
    const podBefore = Number((await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count)
    const podInput = await fileInputIn(page, "div", "send paperwork")
    check(!!podInput, "SEND PAPERWORK file input present")
    await podInput.uploadFile(podPath)
    await waitForText(page, "POD sent to the office", 20000)
    check(true, "POD sent toast shown")
    // This load stays "dispatched" through the smoke, so nothing in
    // DriverLoadCard's markup flips on hasPod (that only gates copy on
    // delivered loads) — there's no DOM condition to key a wait on. Wait for
    // the in-flight router.refresh() fetch to actually settle instead of
    // guessing a fixed delay, so the screenshot isn't caught mid-refresh.
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {})
    await shot(page, "03-pod-sent")

    const podRows = await db.query(
      `SELECT d.file_name, l.reference
         FROM hub.documents d
         JOIN hub.loads l ON d.entity_type = 'load' AND l.id = d.entity_id
        WHERE d.kind = 'pod' ORDER BY d.created_at DESC LIMIT 1`
    )
    const podAfter = Number((await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count)
    check(podAfter === podBefore + 1, `hub.documents pod count ${podBefore} -> ${podAfter}`)
    check(podRows.rows[0]?.file_name?.includes("pod-photo"),
      `newest pod row is this upload (${podRows.rows[0]?.file_name} on ${podRows.rows[0]?.reference})`)

    console.log("4. Satisfy the office's pinned document request")
    // seed pins a receipt request for a load assigned to ANOTHER driver — the
    // open request itself must authorize this upload (regression: it used to
    // dead-end on "That load isn't yours" with no way to clear the card)
    const receiptPath = path.join(OUT, "lumper-receipt.png")
    writeFileSync(receiptPath, PNG)
    await waitForText(page, "The office needs something")
    const reqInput = await fileInputIn(page, "section", "office needs something")
    check(!!reqInput, "document-request file input present")
    await reqInput.uploadFile(receiptPath)
    await waitForText(page, "Sent — request cleared", 20000)
    check(true, "request-cleared toast shown")
    // The satisfied request drops out of the driver home's pending-requests
    // query, so DocRequestCard unmounts once router.refresh() lands — wait
    // for its "office needs something" header to leave the page instead of a
    // fixed sleep.
    check(await textGone(page, "The office needs something"), "document-request card cleared after refresh")
    await shot(page, "04-request-cleared")

    const req = await db.query(
      `SELECT r.status, d.file_name FROM hub.document_requests r
         LEFT JOIN hub.documents d ON d.id = r.satisfied_document_id
        ORDER BY r.created_at DESC LIMIT 1`
    )
    check(req.rows[0]?.status === "satisfied" && req.rows[0]?.file_name?.includes("lumper-receipt"),
      `request satisfied by the upload (${req.rows[0]?.status}, ${req.rows[0]?.file_name})`)

    check(consoleErrors.length === 0, `no console errors (${consoleErrors.length}: ${consoleErrors.slice(0, 2).join(" | ")})`)
  } catch (err) {
    await shot(page, "ZZ-failure")
    failures.push(`crash: ${err.message}`)
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\nDriver paperwork smoke FAILED (${failures.length}):\n - ${failures.join("\n - ")}`)
    process.exit(1)
  }
  console.log("\nDriver paperwork smoke passed.")
}

main()
