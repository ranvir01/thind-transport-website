/**
 * Real offline-mode drive of the driver PWA's replay queue
 * (src/components/hub/driver/offline-queue.ts + OfflineSync.tsx): drops the
 * browser's network via CDP mid-flow, taps an action that would otherwise hit
 * a server action, confirms it queues in IndexedDB instead of erroring,
 * restores the network, and confirms OfflineSync replays it without a
 * manual reload — the actual failure mode this subsystem exists to prevent
 * (a driver's arrival tap getting lost in a rural dead zone).
 *
 * Usage: node scripts/e2e-driver-offline-smoke.mjs [outputDir]
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

async function queueCountInPage(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("hauldesk-driver", 1)
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
    console.log("1. Login as demo driver, confirm dispatch (online)")
    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.login)
    await page.type("#email", "driver@demo.thind")
    await page.type("#password", "ThindDemo1!")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      page.click('button[type="submit"]'),
    ])
    if (!page.url().includes("/hub/driver")) throw new Error(`Expected /hub/driver, got ${page.url()}`)
    await waitForText(page, "THD-")
    await clickByText(page, "confirm this dispatch")
    await waitForText(page, ANCHORS.toastDispatchConfirmed)
    await shot(page, "01-confirmed-online")

    console.log("2. Drop the network (CDP), then tap 'I'm here' at the pickup")
    await page.setOfflineMode(true)
    // navigator.onLine flips async off the CDP event; give the page a beat
    // before the tap so runOrQueue sees the same offline state a real
    // dead-zone tap would (its else-branch guard is a fetch-failure catch,
    // but the fast path checks navigator.onLine first).
    await page.waitForFunction(() => navigator.onLine === false, { timeout: 5000 })
    await clickByText(page, "I'm here")
    const queuedToast = await textAppears(page, "No signal — saved on your phone")
    check(queuedToast, "offline tap shows the 'saved on your phone' toast instead of erroring")
    await shot(page, "02-offline-tap-queued")

    console.log("3. Confirm the intent actually landed in IndexedDB (not just the toast)")
    const queuedCount = await queueCountInPage(page)
    check(queuedCount === 1, `IndexedDB queue holds exactly 1 intent while offline (got ${queuedCount})`)

    console.log("4. OfflineSync banner reflects the pending count while offline")
    const bannerShown = await textAppears(page, "No signal — 1 update saved")
    check(bannerShown, "offline banner shows '1 update saved, sends automatically'")
    await shot(page, "03-offline-banner")

    console.log("5. Restore the network — replay should fire without a manual reload")
    await page.setOfflineMode(false)
    await page.waitForFunction(() => navigator.onLine === true, { timeout: 5000 })
    const sentToast = await textAppears(page, "Back online", 15000)
    check(sentToast, "'Back online — N sent' toast appears after signal returns")
    await shot(page, "04-back-online-toast")

    console.log("6. Queue drains and the arrival is now server-confirmed")
    const drainedCount = await queueCountInPage(page)
    check(drainedCount === 0, `IndexedDB queue is empty after replay (got ${drainedCount})`)
    const bannerCleared = await textGone(page, "No signal", 15000)
    check(bannerCleared, "offline banner clears once the queue drains")
    const arrivalLanded = await textAppears(page, ANCHORS.leavingNow, 15000)
    check(arrivalLanded, "pickup stop shows 'Leaving now' — the queued arrival replayed to the server")
    await shot(page, "05-replayed-arrival")

    console.log("7. Reload from a fresh navigation confirms the server, not just client state, has it")
    await page.reload({ waitUntil: "networkidle2" })
    const survivesReload = await textAppears(page, ANCHORS.leavingNow, 10000)
    check(survivesReload, "arrival persisted server-side (survives a full page reload)")
    await shot(page, "06-after-reload")

    console.log(`\n${failures.length === 0 ? "All offline-queue smoke checks passed ✔" : `${failures.length} check(s) FAILED`}`)
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
