/**
 * Shift Mode smoke: the sandbox as a living company on a real-time clock.
 * Resets the sandbox from the public picker (fresh pacing + sim epoch), then
 * proves the loop end to end against a running server:
 *
 *   · the seed wrote the sim clock; the first tick advances, an immediate
 *     re-tick is rate-limited, and two simultaneous ticks can't both win
 *     (advisory lock — at most one `advanced: true`)
 *   · NPC paperwork runs through the real domain functions (stale PODs get
 *     invoiced by the autopilot; autopilot status changes hit load_events)
 *   · the dispatcher clocks in (ShiftCard), sees live objectives, clocks out
 *     to a recap — and a mid-shift reset VOIDS the shift instead of scoring
 *     stale math
 *   · while a sandbox tab is open the world visibly moves: new position
 *     pings land past the baseline and the thermostat drops fresh rate cons
 *   · the driver seat (390px) opens onto the live load with its own
 *     Shift-capable banner
 *
 * Usage: node scripts/e2e-sandbox-sim-smoke.mjs [outputDir]
 * (server must be running — `npm run start` after `npm run build`)
 */
import { mkdirSync } from "node:fs"
import pg from "pg"
import {
  BASE,
  check,
  clickByText,
  failures,
  launchBrowser,
  makeShot,
  realConsoleErrors,
  textAppears,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-sandbox-sim"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const C = "33333333-3333-3333-3333-333333333333"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL, max: 2 })
const rows = (text, params = [C]) => pool.query(text, params).then((r) => r.rows)

const tick = async () => {
  const res = await fetch(`${BASE}/api/hub/sandbox/tick`, { method: "POST" })
  return res.json()
}

/**
 * Click a button and wait for its visible effect, retrying — a click that
 * lands between SSR paint and React hydration is silently dead (the DOM
 * button exists, the handler doesn't yet), so "click once, assert once"
 * flakes on any full-navigation arrival.
 */
async function clickUntil(page, buttonText, expectText, { attempts = 4, waitMs = 6_000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await clickByText(page, buttonText).catch(() => {})
    if (await textAppears(page, expectText, waitMs)) return true
  }
  return false
}

/** Retry a DB predicate until it holds or the deadline passes. */
async function pollDb(label, predicate, { timeoutMs = 45_000, everyMs = 3_000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) {
      check(true, label)
      return true
    }
    await sleep(everyMs)
  }
  check(false, label)
  return false
}

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  // ---- 1 · Reset from the public picker: fresh pacing, fresh sim epoch ----
  console.log("— reset —")
  await page.goto(`${BASE}/hub/sandbox`, { waitUntil: "networkidle2" })
  await clickByText(page, "Reset sandbox")
  check(await textAppears(page, "Sandbox reset", 120_000), "picker reset rebuilt the world")

  const simState = await rows(`SELECT settings->'sim' AS sim FROM hub.carrier_settings WHERE carrier_id = $1`)
  const epoch = simState[0]?.sim?.epoch ?? null
  check(Boolean(epoch), `seed wrote the sim clock (epoch ${String(epoch).slice(0, 8)}…)`)

  const baseline = {
    maxPing: (await rows(`SELECT MAX(ts) AS t FROM hub.position_pings WHERE carrier_id = $1`))[0]?.t,
    invoices: Number((await rows(`SELECT COUNT(*)::int AS n FROM hub.invoices WHERE carrier_id = $1`))[0].n),
  }

  // ---- 2 · Tick contract: advance, rate-limit, and the advisory lock ----
  console.log("— tick contract —")
  const t1 = await tick()
  check(t1.advanced === true, `first tick advanced (${t1.ops ?? 0} ops)`)
  const t2 = await tick()
  check(t2.advanced === false, `immediate re-tick rate-limited (${t2.reason})`)
  const [p1, p2] = await Promise.all([tick(), tick()])
  check(!(p1.advanced && p2.advanced), "two simultaneous ticks can't both win the lock")

  // Tick 1's paperwork: the autopilot invoiced the stale POD backlog through
  // createInvoiceFromLoad, and its status walks are on the load timeline.
  await pollDb("autopilot invoiced the stale POD backlog (≥3 invoices)", async () => {
    const n = Number((await rows(`SELECT COUNT(*)::int AS n FROM hub.invoices WHERE carrier_id = $1`))[0].n)
    return n >= baseline.invoices + 3
  })
  await pollDb("autopilot status changes ride the real load timeline", async () => {
    const n = Number(
      (
        await rows(
          `SELECT COUNT(*)::int AS n FROM hub.load_events
            WHERE carrier_id = $1 AND kind = 'status_change' AND actor_name = 'Blue Ridge autopilot'`
        )
      )[0].n
    )
    return n > 0
  })

  // ---- 3 · Dispatcher clocks in ----
  console.log("— dispatcher shift —")
  await clickByText(page, "Dispatcher")
  await page.waitForFunction(() => location.pathname === "/hub/loadboard", { timeout: 45_000 })
  if (!(await textAppears(page, "Work a live shift", 30_000))) {
    // One retry through a hard reload — a cold prod route + fresh session
    // can land before the layout streamed the banner.
    await page.reload({ waitUntil: "networkidle2" })
    const there = await textAppears(page, "Work a live shift", 20_000)
    check(there, "shift card renders on the loadboard (after reload)")
    if (!there) {
      console.log("  page text:", (await page.evaluate(() => document.body.innerText)).slice(0, 500))
    }
  }
  check(await clickUntil(page, "Clock in", "On shift"), "clock-in flips the card to On shift")
  check(await textAppears(page, "Book 2 loads", 20_000), "live objectives render")
  await shot(page, "dispatcher-on-shift")

  // ---- 4 · The world moves while the tab is open ----
  // SimTicker heartbeats every ~25s; pings space ≥60s apart. Give it a
  // real minute, nudge a tick, then look for motion + the thermostat.
  console.log("— live world (≈70s of wall clock) —")
  await sleep(65_000)
  await tick().catch(() => {})
  await pollDb("NPC trucks moved — new position pings past the baseline", async () => {
    const t = (await rows(`SELECT MAX(ts) AS t FROM hub.position_pings WHERE carrier_id = $1`))[0]?.t
    return t && baseline.maxPing && new Date(t) > new Date(baseline.maxPing)
  })
  await pollDb("thermostat dropped a fresh rate con (broker notification)", async () => {
    const n = Number(
      (
        await rows(
          `SELECT COUNT(*)::int AS n FROM hub.notifications
            WHERE carrier_id = $1 AND title LIKE 'New rate con%'`
        )
      )[0].n
    )
    return n > 0
  }, { timeoutMs: 90_000 })

  // ---- 5 · Clock out → recap ----
  check(await clickUntil(page, "Clock out", "Shift recap"), "clock-out deals the recap card")
  await shot(page, "dispatcher-recap")

  // ---- 6 · A mid-shift reset voids the shift ----
  console.log("— reset voids a shift —")
  check(await clickUntil(page, "Start another shift", "Clock in"), "recap resets to a fresh clock-in")
  check(await clickUntil(page, "Clock in", "On shift"), "second shift starts")
  check(await clickUntil(page, "Reset", "Sandbox reset", { waitMs: 120_000, attempts: 1 }), "banner reset succeeded mid-shift")
  check(
    await clickUntil(page, "Clock out", "void"),
    "reset mid-shift voids the recap instead of scoring stale math"
  )
  await shot(page, "shift-voided")

  // ---- 7 · Driver seat at phone width opens on the live load ----
  console.log("— driver seat —")
  const driver = await browser.newPage()
  await driver.setViewport({ width: 390, height: 844 })
  await driver.goto(`${BASE}/hub/sandbox`, { waitUntil: "networkidle2" })
  await clickByText(driver, "Company driver")
  await driver.waitForFunction(() => location.pathname === "/hub/driver", { timeout: 45_000 })
  check(await textAppears(driver, "BRH-", 30_000), "driver home shows the live load")
  check(await textAppears(driver, "Work a live shift", 20_000), "driver banner carries the shift card")
  await shot(driver, "driver-live-390")

  const real = realConsoleErrors(consoleErrors)
  check(real.length === 0, real.length ? `console errors: ${real.slice(0, 3).join(" | ")}` : "no console errors")

  await browser.close()
  await pool.end()

  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):\n${failures.map((f) => `  - ${f}`).join("\n")}`)
    process.exit(1)
  }
  console.log("\n✅ sandbox sim smoke passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
