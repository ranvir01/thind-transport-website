/**
 * The whole business cycle as ONE continuous state: freight the office bills,
 * collects, settles and pays out, and the paperwork the driver sends back —
 * driven end to end without reseeding in between.
 *
 * Every per-area smoke calls reseed() on the way in (see e2e-lib.mjs), which
 * is what makes each one debuggable in isolation and is exactly why none of
 * them can catch a defect that only appears when the phases compose. The
 * nightly regression used to be three separate smokes run back to back —
 * invoices, settlements, driver POD — each starting from a fresh seed, so
 * "invoice a load, then settle its week, then have the driver file
 * paperwork" was never actually one story. This is that story, seeded once.
 *
 * What only a continuous drive can assert, and this does:
 *   • settling a week does not disturb AR — the invoice paid in phase 2 is
 *     still paid, to the cent, after the settlement run in phase 3
 *   • an applied advance stays applied across later drafting (no re-deduction)
 *   • a second draft run after driver paperwork lands still creates nothing,
 *     so already-settled loads cannot be paid twice
 *   • the driver's POD lands in hub.documents against this carrier's load
 *     while the office side of the same tenant is mid-cycle
 *
 * Cent values are the seed's, and match the ones e2e-invoices-smoke.mjs and
 * e2e-settlements-smoke.mjs pin independently — if this script and those
 * disagree, the composition changed the math and that is the bug.
 *
 * Usage: node scripts/e2e-business-cycle.mjs [outputDir]
 * Requires: npm run build && npm run start on localhost:3000, POSTGRES_URL
 * (reads .env.local). Reseeds ONCE at the start — it owns the demo tenant.
 */
import pg from "pg"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  launchBrowser, BASE, failures, check, waitForText, textGone, login, makeShot,
  clickByText, reseed, trackPageErrors,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-business-cycle"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

// Steel-beams pod_received load (THD-1009): 295000 linehaul + 31000 FSC + 10000 tarp.
// Its driver is seed driver 8 — deliberately NOT Harpreet or Jasdeep, so
// billing it cannot move the settlement math asserted below.
const INVOICE_TOTAL_CENTS = 336000
// Harpreet Singh, company per-mile: gross 78000 − (20000 advance + 7500 insurance).
const HARPREET_NET_CENTS = 50500

// tiny valid 1×1 PNG, stands in for the driver's camera photo
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

const parseCents = (s) => {
  const m = (s ?? "").match(/(-?)\$?([\d,]+)\.(\d{2})/)
  if (!m) return null
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
}

/** Value shown next to a <dt> label in a Summary/Totals block. */
const dtValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

/** Detail-page hrefs of settlement rows whose text matches every needle. */
const settlementLinks = (page, needles) =>
  page.evaluate((ns) => {
    return [...document.querySelectorAll('a[href^="/hub/money/settlements/"]')]
      .filter((a) => ns.every((n) => a.textContent.toLowerCase().includes(n.toLowerCase())))
      .map((a) => a.getAttribute("href"))
  }, needles)

/**
 * DraftSettlementsButton keeps `disabled={pending}` for the whole
 * useTransition, including the router.refresh() after the toast — re-enabling
 * is the completion signal, not a guess at how long the refresh takes.
 */
const draftButtonSettled = (page, timeout = 20000) =>
  page
    .waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          (b.textContent ?? "").toLowerCase().includes("draft this week")
        )
        return !!btn && !btn.disabled
      },
      { timeout }
    )
    .then(() => true)
    .catch(() => false)

/** Fetch a link's target in-page and report its real magic bytes, not its headers. */
const fetchPdf = (page, linkText) =>
  page.evaluate(async (text) => {
    const a = [...document.querySelectorAll("a")].find((n) => n.textContent.includes(text))
    if (!a) return { found: false }
    const res = await fetch(a.href)
    const buf = new Uint8Array(await res.arrayBuffer())
    return {
      found: true,
      status: res.status,
      type: res.headers.get("content-type"),
      magic: String.fromCharCode(...buf.slice(0, 5)),
      bytes: buf.length,
    }
  }, linkText)

const pdfServed = (r) =>
  r.found && r.status === 200 && /pdf/.test(r.type ?? "") && r.magic === "%PDF-" && r.bytes > 1000

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
  const office = await browser.newPage()
  await office.setViewport({ width: 1440, height: 900 })
  const { errors: consoleErrors } = trackPageErrors(office)

  try {
    console.log("1. Owner bills the POD-received load")
    await login(office, "owner@demo.thind")
    await office.goto(`${BASE}/hub/loads?status=pod_received`, { waitUntil: "networkidle2" })
    const hrefs = await office.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('a[href^="/hub/loads/"]')]
          .map((a) => a.getAttribute("href"))
          .filter((h) => /^\/hub\/loads\/[0-9a-f-]{36}$/.test(h))
      ),
    ])
    let loadUrl = null
    for (const href of hrefs) {
      await office.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
      if ((await office.evaluate(() => document.body.innerText)).includes("Steel beams")) {
        loadUrl = href
        break
      }
    }
    check(!!loadUrl, `steel-beams load found (${loadUrl})`)
    if (!loadUrl) throw new Error("Seed load missing — reseed with npm run seed:demo")

    await clickByText(office, "Invoice this load", { tag: "button" })
    await office.waitForFunction(
      () => /\/hub\/money\/invoices\/[0-9a-f-]{36}$/.test(location.pathname),
      { timeout: 20000 }
    )
    await waitForText(office, "Open balance")
    const invoiceUrl = await office.evaluate(() => location.pathname)
    check(parseCents(await dtValue(office, "Amount")) === INVOICE_TOTAL_CENTS,
      `invoice totals linehaul+FSC+tarp to the cent (${await dtValue(office, "Amount")})`)
    check(pdfServed(await fetchPdf(office, "Invoice PDF")),
      `invoice PDF stored and served (${JSON.stringify(await fetchPdf(office, "Invoice PDF"))})`)
    await shot(office, "01-invoiced")

    console.log("2. Owner collects it in full")
    await office.waitForSelector("#pay_amount", { timeout: 10000 })
    const dollars = (INVOICE_TOTAL_CENTS / 100).toFixed(2)
    await office.type("#pay_amount", dollars)
    const typed = await office.evaluate(() => document.querySelector("#pay_amount")?.value ?? null)
    check(typed === dollars, `amount field holds the full amount before submit (${JSON.stringify(typed)})`)
    await clickByText(office, "Record payment", { tag: "button" })
    await waitForText(office, "Payment recorded")
    await office
      .waitForFunction(
        () => {
          const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === "Open balance")
          return /\$0\.00/.test(dt?.parentElement?.querySelector("dd")?.textContent ?? "")
        },
        { timeout: 20000 }
      )
      .catch(() => { throw new Error("open balance never reached $0.00 after paying in full") })
    check((await dtValue(office, "Status"))?.toLowerCase() === "paid", "invoice flips to paid")
    await office.goto(`${BASE}${loadUrl}`, { waitUntil: "networkidle2" })
    check((await office.evaluate(() => document.body.innerText.toLowerCase())).includes("paid"),
      "load advanced to paid")
    await shot(office, "02-paid")

    console.log("3. Owner settles the week — statement PDF, advance applied")
    await office.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
    await waitForText(office, "Weekly driver pay")
    await clickByText(office, "Draft this week", { tag: "button" })
    await waitForText(office, "settlement draft(s) created")
    check(await draftButtonSettled(office), "draft button re-enabled after router.refresh")
    const harpreet = await settlementLinks(office, ["Harpreet Singh", "draft"])
    check(harpreet.length === 1, `Harpreet draft created (${harpreet.length})`)
    if (!harpreet.length) throw new Error("no draft to approve")

    await office.goto(`${BASE}${harpreet[0]}`, { waitUntil: "networkidle2" })
    await waitForText(office, "Net pay")
    check(parseCents(await dtValue(office, "Net pay")) === HARPREET_NET_CENTS,
      `net pay unchanged by the billing run (${await dtValue(office, "Net pay")})`)
    await clickByText(office, "Approve", { tag: "button" })
    await waitForText(office, "Status: approved", 20000)
    check(pdfServed(await fetchPdf(office, "Statement PDF")),
      `statement PDF stored and served (${JSON.stringify(await fetchPdf(office, "Statement PDF"))})`)
    await shot(office, "03-settlement-approved")

    await office.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
    await waitForText(office, "Cash and EFS-code advances")
    const advanceRow = await office.evaluate(() => {
      const el = [...document.querySelectorAll("p")].find((n) => n.textContent.includes("EFS code 4417"))
      return el?.closest("div.flex")?.textContent ?? null
    })
    check(/applied/i.test(advanceRow ?? "") && !/outstanding/i.test(advanceRow ?? ""),
      `EFS advance flipped to applied (${(advanceRow ?? "missing").trim().slice(0, 80)})`)

    console.log("4. Settling did not disturb what was already collected")
    // The composition assertion: phase 3 moved driver money, so phase 2's
    // customer money must be exactly where it was left.
    await office.goto(`${BASE}${invoiceUrl}`, { waitUntil: "networkidle2" })
    await waitForText(office, "Open balance")
    check((await dtValue(office, "Status"))?.toLowerCase() === "paid", "invoice still paid after the settlement run")
    check(parseCents(await dtValue(office, "Open balance")) === 0, "open balance still $0.00")
    check(parseCents(await dtValue(office, "Paid")) === INVOICE_TOTAL_CENTS,
      `collected amount unchanged to the cent (${await dtValue(office, "Paid")})`)

    console.log("5. Driver files paperwork at 390px on the same live tenant")
    const ctx = await browser.createBrowserContext()
    const cab = await ctx.newPage()
    await cab.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    trackPageErrors(cab, consoleErrors)
    await login(cab, "driver@demo.thind")
    check(cab.url().includes("/hub/driver"), `landed on the driver app (${cab.url()})`)
    await waitForText(cab, "THD-")
    await shot(cab, "04-driver-home")

    await clickByText(cab, "confirm this dispatch")
    await waitForText(cab, "Dispatch confirmed")
    check(await textGone(cab, "confirm this dispatch"), "confirm-dispatch button cleared after refresh")

    const podPath = path.join(OUT, "pod-photo.png")
    writeFileSync(podPath, PNG)
    const podBefore = Number(
      (await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count
    )
    const podInput = await fileInputIn(cab, "div", "send paperwork")
    check(!!podInput, "SEND PAPERWORK file input present")
    await podInput.uploadFile(podPath)
    await waitForText(cab, "POD sent to the office", 20000)
    await cab.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {})
    await shot(cab, "05-pod-sent")

    const podAfter = Number(
      (await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count
    )
    check(podAfter === podBefore + 1, `hub.documents pod count ${podBefore} -> ${podAfter}`)
    // Carrier-scoped on BOTH sides: the document row and the load it hangs off
    // must belong to the same tenant the office half has been working in.
    const podRow = (
      await db.query(
        `SELECT d.file_name, l.reference, d.carrier_id = l.carrier_id AS same_tenant
           FROM hub.documents d
           JOIN hub.loads l ON d.entity_type = 'load' AND l.id = d.entity_id
          WHERE d.kind = 'pod' ORDER BY d.created_at DESC LIMIT 1`
      )
    ).rows[0]
    check(podRow?.file_name?.includes("pod-photo"),
      `newest pod row is this upload (${podRow?.file_name} on ${podRow?.reference})`)
    check(podRow?.same_tenant === true, "pod row and its load share a carrier_id")

    console.log("6. A second settlement run still pays nobody twice")
    await office.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
    await waitForText(office, "Weekly driver pay")
    await clickByText(office, "Draft this week", { tag: "button" })
    await waitForText(office, "0 settlement draft(s) created")
    check(await draftButtonSettled(office), "draft button re-enabled after the rerun")
    const harpreetAfter = await settlementLinks(office, ["Harpreet Singh", "draft"])
    check(harpreetAfter.length === 0, `no fresh Harpreet draft after the rerun (${harpreetAfter.length})`)
    const advanceStill = (
      await db.query(
        `SELECT status FROM hub.advances WHERE reference = 'EFS code 4417' ORDER BY created_at DESC LIMIT 1`
      )
    ).rows[0]
    check(advanceStill?.status === "applied",
      `advance stays applied through the rerun (${advanceStill?.status})`)
    await shot(office, "06-rerun-no-double-pay")

    check(consoleErrors.length === 0,
      `no console errors (${consoleErrors.length}: ${consoleErrors.slice(0, 2).join(" | ")})`)
  } catch (err) {
    await shot(office, "ZZ-failure").catch(() => {})
    failures.push(`crash: ${err.message}`)
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\nBusiness-cycle drive FAILED (${failures.length}):\n - ${failures.join("\n - ")}`)
    process.exit(1)
  }
  console.log("\nBusiness-cycle drive passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
