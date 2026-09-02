/**
 * Real offline-mode drive of the OFFICE replay queue
 * (src/components/hub/office/offline-queue.ts + OfficeOfflineBanner.tsx):
 * logs in as the demo dispatcher, opens a load, drops the browser's network
 * via CDP, taps the advance-status button, confirms the tap queues in the
 * hauldesk-office IndexedDB instead of erroring, restores the network, and
 * confirms the banner replays it without a manual reload — then proves the
 * advance reached the server by reloading. Mirrors e2e-driver-offline-smoke,
 * which covers the driver side of the same engine.
 *
 * Usage: node scripts/e2e-office-offline-smoke.mjs [outputDir]
 * Requires: npm run dev (or start) on localhost:3000.
 */
import { mkdirSync } from "node:fs"
import { ANCHORS,
  launchBrowser, BASE, clickByText, waitForText, textAppears, textGone,
  makeShot, reseed, check, failures,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT)

// Mirror of NEXT_STATUS ∘ STATUS_LABELS (src/lib/hub/types.ts), keyed by the
// label on the "Mark X" button we tap: after replaying "Mark X" the detail
// page must offer "Mark Y" — proof the status really advanced server-side.
const LABEL_AFTER = {
  Booked: "Dispatched",
  Dispatched: "At Pickup",
  "At Pickup": "In Transit",
  "In Transit": "Delivered",
  Delivered: "POD Received",
  "POD Received": "Invoiced",
  Invoiced: "Paid",
  Paid: "Settled",
}

async function officeQueueCount(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("hauldesk-office", 1)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("queue")) {
            db.close()
            resolve(0)
            return
          }
          const tx = db.transaction("queue", "readonly")
          const countReq = tx.objectStore("queue").count()
          countReq.onsuccess = () => {
            resolve(countReq.result)
            db.close()
          }
          countReq.onerror = () => reject(countReq.error)
        }
        req.onerror = () => reject(req.error)
      })
  )
}

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  try {
    console.log("1. Login as demo dispatcher, open a load that can advance")
    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.login)
    await page.type("#email", "dispatch@demo.thind")
    await page.type("#password", "ThindDemo1!")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      page.click('button[type="submit"]'),
    ])
    if (!page.url().includes("/hub")) throw new Error(`Expected /hub, got ${page.url()}`)

    await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.loads)
    await waitForText(page, "THD-")
    // Collect load-detail hrefs and goto them directly — a synthetic click on
    // a Next <Link> doesn't reliably drive the client router from evaluate().
    const loadHrefs = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('a[href^="/hub/loads/"]')]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h && !h.endsWith("/new") && !h.endsWith("/paste"))
      ),
    ])
    if (loadHrefs.length === 0) throw new Error("No load row link found on /hub/loads")
    // Open the first load whose lifecycle can still advance (skip settled/cancelled).
    let markLabel = null
    for (const href of loadHrefs.slice(0, 8)) {
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
      markLabel = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent.trim().startsWith("Mark ")
        )
        return btn ? btn.textContent.trim() : null
      })
      if (markLabel) break
    }
    check(Boolean(markLabel), `a load detail offers an advance button (got ${markLabel})`)
    const targetLabel = markLabel.replace(/^Mark /, "")
    await shot(page, "01-load-detail-online")

    console.log(`2. Drop the network (CDP), then tap "${markLabel}"`)
    await page.setOfflineMode(true)
    await page.waitForFunction(() => navigator.onLine === false, { timeout: 5000 })
    await clickByText(page, markLabel)
    const queuedToast = await textAppears(page, "No signal — saved, sends automatically")
    check(queuedToast, "offline tap shows the 'saved, sends automatically' toast instead of erroring")
    await shot(page, "02-offline-tap-queued")

    console.log("3. Confirm the intent landed in the OFFICE IndexedDB (not the driver's)")
    const queuedCount = await officeQueueCount(page)
    check(queuedCount === 1, `hauldesk-office queue holds exactly 1 intent while offline (got ${queuedCount})`)

    console.log("4. Banner reflects the pending count while offline")
    const bannerShown = await textAppears(page, "No signal — 1 update saved")
    check(bannerShown, "offline banner shows '1 update saved, sends automatically'")
    await shot(page, "03-offline-banner")

    console.log("5. Restore the network — replay should fire without a manual reload")
    await page.setOfflineMode(false)
    await page.waitForFunction(() => navigator.onLine === true, { timeout: 5000 })
    const sentToast = await textAppears(page, "Back online — 1 saved update sent", 15000)
    check(sentToast, "'Back online — 1 saved update sent' toast appears after signal returns")
    await shot(page, "04-back-online-toast")

    console.log("6. Queue drains and the banner clears")
    const drainedCount = await officeQueueCount(page)
    check(drainedCount === 0, `hauldesk-office queue is empty after replay (got ${drainedCount})`)
    const bannerCleared = await textGone(page, "No signal", 15000)
    check(bannerCleared, "offline banner clears once the queue drains")

    console.log("7. Reload proves the server, not just client state, advanced the load")
    await page.reload({ waitUntil: "networkidle2" })
    const nextLabel = LABEL_AFTER[targetLabel]
    if (nextLabel) {
      const advanced = await textAppears(page, `Mark ${nextLabel}`, 10000)
      check(advanced, `detail page now offers "Mark ${nextLabel}" — the queued advance replayed server-side`)
    } else {
      const gone = await textGone(page, markLabel, 10000)
      check(gone, `"${markLabel}" is no longer offered — the queued advance replayed server-side`)
    }
    await shot(page, "05-after-reload")

    console.log("8. Offline arrival: the stop-timestamp intent carries the tap-time through replay")
    const hasArrive = await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Mark arrived")
    )
    if (hasArrive) {
      await page.setOfflineMode(true)
      await page.waitForFunction(() => navigator.onLine === false, { timeout: 5000 })
      await clickByText(page, "Mark arrived")
      const arrivalQueued = await textAppears(page, "No signal — time saved, sends automatically")
      check(arrivalQueued, "offline arrival tap shows the 'time saved' toast")
      const arrivalCount = await officeQueueCount(page)
      check(arrivalCount === 1, `arrival intent queued in hauldesk-office (got ${arrivalCount})`)
      await page.setOfflineMode(false)
      await page.waitForFunction(() => navigator.onLine === true, { timeout: 5000 })
      const arrivalSent = await textAppears(page, "Back online — 1 saved update sent", 15000)
      check(arrivalSent, "queued arrival replays and the server accepts it (not 'couldn't be sent')")
      const arrivalDrained = await officeQueueCount(page)
      check(arrivalDrained === 0, `queue empty after the arrival replays (got ${arrivalDrained})`)
      await shot(page, "06-arrival-replayed")
    } else {
      console.log("   (no open stop on this load — arrival step skipped)")
    }

    console.log(`\n${failures.length === 0 ? "All office offline-queue smoke checks passed ✔" : `${failures.length} check(s) FAILED`}`)
    if (failures.length > 0) process.exitCode = 1
  } catch (err) {
    await shot(page, "ZZ-failure")
    console.error("\nSMOKE TEST FAILED:", err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main()
