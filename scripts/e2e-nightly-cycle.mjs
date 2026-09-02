/**
 * Nightly end-to-end regression: the WHOLE business cycle in ONE continuous
 * drive against a single seed. The per-area smokes each reseed, so they never
 * observe the states that actually follow one another in a real week:
 * invoice+pay a load, THEN draft settlements over the same drivers, THEN have
 * the driver send paperwork. Ordering interactions only show up here.
 *
 * Usage: node nightly-cycle.mjs [outDir]
 */
import pg from "pg"
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { ANCHORS,
  launchBrowser, BASE, failures, check, waitForText, textGone, login, makeShot,
  clickByText, reseed, trackPageErrors,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "nightly-shots"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

const parseCents = (s) => {
  const m = (s ?? "").match(/(-?)\$?([\d,]+)\.(\d{2})/)
  if (!m) return null
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
}

const summaryValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

const totalsValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

/** Fetch a link's bytes in-page and report real magic bytes, not just headers. */
const fetchLinkBytes = (page, linkText) =>
  page.evaluate(async (t) => {
    const a = [...document.querySelectorAll("a")].find((n) => n.textContent.includes(t))
    if (!a) return { found: false }
    const res = await fetch(a.href)
    const buf = new Uint8Array(await res.arrayBuffer())
    return {
      found: true, status: res.status, type: res.headers.get("content-type"),
      magic: String.fromCharCode(...buf.slice(0, 5)), bytes: buf.length,
    }
  }, linkText)

async function fileInputIn(page, containerSelector, containerText) {
  const handle = await page.evaluateHandle(
    (sel, text) => {
      const matches = [...document.querySelectorAll(sel)].filter(
        (el) => el.querySelector('input[type="file"]') && el.textContent.toLowerCase().includes(text.toLowerCase())
      )
      const box = matches.find((m) => !matches.some((o) => o !== m && m.contains(o)))
      return box?.querySelector('input[type="file"]') ?? null
    },
    containerSelector, containerText
  )
  return handle.asElement()
}

const settlementLinks = (page, needles) =>
  page.evaluate((n) =>
    [...document.querySelectorAll('a[href^="/hub/money/settlements/"]')]
      .filter((a) => n.every((s) => a.textContent.toLowerCase().includes(s.toLowerCase())))
      .map((a) => a.getAttribute("href")),
  needles)

async function main() {
  reseed()
  const db = new pg.Client({ connectionString: process.env.POSTGRES_URL })
  await db.connect()

  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const { errors: consoleErrors } = trackPageErrors(page)

  try {
    // ---------------- PHASE 1: cash in ----------------
    console.log("\n=== PHASE 1: owner invoices a pod_received load and gets paid ===")
    await login(page, "owner@demo.thind")

    await page.goto(`${BASE}/hub/loads?status=pod_received`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.loads)
    const podHrefs = await page.evaluate(() =>
      [...new Set(
        [...document.querySelectorAll('a[href^="/hub/loads/"]')]
          .map((a) => a.getAttribute("href"))
          .filter((h) => /^\/hub\/loads\/[0-9a-f-]{36}$/.test(h))
      )]
    )
    check(podHrefs.length > 0, `pod_received loads listed (${podHrefs.length})`)
    // Take the first pod_received load that actually offers the one-click
    // invoice action — a load already carrying an invoice has no button.
    let target = null
    for (const href of podHrefs) {
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
      const hasButton = await page.evaluate(() =>
        [...document.querySelectorAll("button")].some((b) => /invoice this load/i.test(b.textContent ?? ""))
      )
      if (hasButton) { target = { href }; break }
    }
    check(!!target, `a pod_received load offers "Invoice this load" (${target?.href})`)
    if (!target) throw new Error("no invoiceable pod_received load — reseed")
    const targetRef = await page.evaluate(() => document.body.innerText.match(/THD-\d+/)?.[0] ?? null)
    console.log(`   driving load: ${targetRef} ${target.href}`)
    await shot(page, "01-load-pod-received")

    await clickByText(page, "Invoice this load", { tag: "button" })
    await waitForText(page, "Invoice", 20000)
    await page.waitForFunction(() => location.pathname.startsWith("/hub/money/invoices/"), { timeout: 20000 })
    const invoicePath = await page.evaluate(() => location.pathname)
    check(!!invoicePath, `landed on the new invoice (${invoicePath})`)

    // The pathname flips the instant router.push() fires — before the invoice
    // detail's server component has streamed in, so the page is still the
    // loading skeleton (no Summary <dt>s, no "Invoice PDF" link). Reading
    // summaryValue()/fetchLinkBytes() here raced that skeleton and returned
    // null on the first cold serve after a build (wider first-serve window:
    // cold route compile, cold DB pool, cold PDF lib). Gate on the payment
    // form, which mounts only once the detail has rendered — the same gate the
    // invoices/business-cycle/accounting smokes already use — so every read
    // below sees real content regardless of how slow the first serve is.
    await page.waitForSelector("#pay_amount", { timeout: 20000 })

    const amount = parseCents(await summaryValue(page, "Amount"))
    const open = parseCents(await summaryValue(page, ANCHORS.openBalance))
    check(amount !== null && amount > 0, `invoice amount parses (${amount} cents)`)
    check(open === amount, `open balance equals amount (${open} vs ${amount})`)

    const invPdf = await fetchLinkBytes(page, "Invoice PDF")
    check(invPdf.found && invPdf.status === 200 && /pdf/.test(invPdf.type ?? "") &&
      invPdf.magic === "%PDF-" && invPdf.bytes > 1000,
      `invoice PDF is a real %PDF (${invPdf.status} ${invPdf.type} magic=${invPdf.magic} ${invPdf.bytes}B)`)
    await shot(page, "02-invoice-draft")

    // pay it in full, in one payment
    const dollars = (amount / 100).toFixed(2)
    await page.evaluate(() => (document.querySelector("#pay_amount").value = ""))
    await page.type("#pay_amount", dollars)
    const typed = await page.evaluate(() => document.querySelector("#pay_amount")?.value ?? null)
    check(typed === dollars, `payment field holds the full amount (${JSON.stringify(typed)} vs ${dollars})`)
    await clickByText(page, "Record payment", { tag: "button" })
    await waitForText(page, "Payment recorded", 20000)
    await page.waitForFunction(() => {
      const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === "Open balance")
      return /\$0\.00/.test(dt?.parentElement?.querySelector("dd")?.textContent ?? "")
    }, { timeout: 20000 }).catch(() => {})
    const afterOpen = parseCents(await summaryValue(page, ANCHORS.openBalance))
    check(afterOpen === 0, `open balance is $0.00 after full payment (${afterOpen})`)
    const invText = await page.evaluate(() => document.body.innerText)
    check(/paid/i.test(invText), "invoice reads paid")
    await shot(page, "03-invoice-paid")

    await page.goto(`${BASE}${target.href}`, { waitUntil: "networkidle2" })
    const loadText = await page.evaluate(() => document.body.innerText)
    check(/paid/i.test(loadText), "load advanced to paid")

    // ---------------- PHASE 2: cash out ----------------
    console.log("\n=== PHASE 2: owner drafts settlements and approves one ===")
    await page.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.settlements)
    await shot(page, "04-settlements-before")

    await clickByText(page, "Draft this week", { tag: "button" })
    await waitForText(page, "settlement draft(s) created", 30000)
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll("button")].find((n) =>
        (n.textContent ?? "").toLowerCase().includes("draft this week"))
      return !!b && !b.disabled
    }, { timeout: 20000 }).catch(() => {})
    const drafts = await settlementLinks(page, ["draft"])
    check(drafts.length > 0, `settlement drafts created (${drafts.length})`)
    await shot(page, "05-settlements-drafted")

    // Pick a draft whose driver actually has an outstanding advance, so the
    // "advances flip to applied" assertion has something to observe.
    const advBefore = await db.query(
      `SELECT a.id, a.reference, a.status, d.first_name, d.last_name
         FROM hub.advances a JOIN hub.drivers d ON d.id = a.driver_id
        WHERE a.status = 'outstanding' ORDER BY a.created_at`
    )
    console.log(`   outstanding advances before approval: ${advBefore.rows.length}`)
    let chosen = drafts[0]
    let chosenDriver = null
    for (const row of advBefore.rows) {
      const name = `${row.first_name} ${row.last_name}`
      const match = await settlementLinks(page, [name, "draft"])
      if (match.length) { chosen = match[0]; chosenDriver = name; break }
    }
    check(!!chosenDriver, `a drafted settlement belongs to a driver with an outstanding advance (${chosenDriver})`)
    console.log(`   approving: ${chosenDriver} — ${chosen}`)

    await page.goto(`${BASE}${chosen}`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.netPay)
    const gross = parseCents(await totalsValue(page, "Gross"))
    const deductions = parseCents(await totalsValue(page, "Deductions"))
    const net = parseCents(await totalsValue(page, ANCHORS.netPay))
    check(gross !== null && net !== null, `settlement totals parse (gross ${gross}, ded ${deductions}, net ${net})`)
    check(net === gross - Math.abs(deductions ?? 0),
      `net pay = gross − deductions to the cent (${net} vs ${gross} − ${Math.abs(deductions ?? 0)})`)
    await shot(page, "06-settlement-draft")

    await clickByText(page, "Approve", { tag: "button" })
    await waitForText(page, ANCHORS.statusApproved, 30000)
    const stmtPdf = await fetchLinkBytes(page, "Statement PDF")
    check(stmtPdf.found && stmtPdf.status === 200 && /pdf/.test(stmtPdf.type ?? "") &&
      stmtPdf.magic === "%PDF-" && stmtPdf.bytes > 1000,
      `statement PDF is a real %PDF (${stmtPdf.status} ${stmtPdf.type} magic=${stmtPdf.magic} ${stmtPdf.bytes}B)`)
    await shot(page, "07-settlement-approved")

    const advAfter = await db.query(
      `SELECT a.status, a.reference FROM hub.advances a
         JOIN hub.drivers d ON d.id = a.driver_id
        WHERE d.first_name || ' ' || d.last_name = $1`, [chosenDriver ?? ""]
    )
    const stillOut = advAfter.rows.filter((r) => r.status === "outstanding")
    const applied = advAfter.rows.filter((r) => r.status === "applied")
    check(applied.length > 0 && stillOut.length === 0,
      `${chosenDriver}'s advances flipped to applied (${applied.length} applied, ${stillOut.length} still outstanding)`)

    // and the office UI agrees with the database
    await page.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
    await waitForText(page, ANCHORS.advances)
    const advUi = await page.evaluate((ref) => {
      const el = [...document.querySelectorAll("p")].find((n) => n.textContent.includes(ref))
      return el?.closest("div.flex")?.textContent ?? null
    }, applied[0]?.reference ?? "")
    check(/applied/i.test(advUi ?? ""), `advances screen shows it applied (${(advUi ?? "missing").trim().slice(0, 70)})`)
    await shot(page, "08-advances-applied")

    // ---------------- PHASE 3: the driver's phone ----------------
    console.log("\n=== PHASE 3: driver at 390px confirms dispatch and sends a POD ===")
    const ctx = await browser.createBrowserContext()
    const dpage = await ctx.newPage()
    await dpage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    const { errors: driverErrors } = trackPageErrors(dpage)

    await dpage.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    await waitForText(dpage, ANCHORS.login)
    await dpage.type("#email", "driver@demo.thind")
    await dpage.type("#password", "ThindDemo1!")
    await Promise.all([
      dpage.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
      dpage.click('button[type="submit"]'),
    ])
    check(dpage.url().includes("/hub/driver"), `driver landed on the PWA (${dpage.url()})`)
    await waitForText(dpage, "THD-")
    await shot(dpage, "09-driver-home-390")

    await clickByText(dpage, "confirm this dispatch")
    await waitForText(dpage, ANCHORS.toastDispatchConfirmed, 20000)
    check(await textGone(dpage, "confirm this dispatch"), "confirm-dispatch button cleared after refresh")
    await shot(dpage, "10-driver-confirmed")

    const podPath = path.join(OUT, "pod-photo.png")
    writeFileSync(podPath, PNG)
    const podBefore = Number((await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count)
    const podInput = await fileInputIn(dpage, "div", "send paperwork")
    check(!!podInput, "SEND PAPERWORK file input present")
    await podInput.uploadFile(podPath)
    await waitForText(dpage, "POD sent to the office", 20000)
    await dpage.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {})
    const podAfter = Number((await db.query("SELECT COUNT(*) FROM hub.documents WHERE kind = 'pod'")).rows[0].count)
    check(podAfter === podBefore + 1, `hub.documents pod row landed (${podBefore} -> ${podAfter})`)
    const newest = await db.query(
      `SELECT d.file_name, l.reference FROM hub.documents d
         JOIN hub.loads l ON d.entity_type = 'load' AND l.id = d.entity_id
        WHERE d.kind = 'pod' ORDER BY d.created_at DESC LIMIT 1`
    )
    check(newest.rows[0]?.file_name?.includes("pod-photo"),
      `newest pod row is this upload (${newest.rows[0]?.file_name} on ${newest.rows[0]?.reference})`)
    await shot(dpage, "11-driver-pod-sent")

    const realOwner = consoleErrors.filter((e) => !/favicon|manifest|_vercel/i.test(e))
    const realDriver = driverErrors.filter((e) => !/favicon|manifest|_vercel/i.test(e))
    check(realOwner.length === 0, `no console errors on office screens (${realOwner.length}: ${realOwner.slice(0, 2).join(" | ")})`)
    check(realDriver.length === 0, `no console errors on the driver PWA (${realDriver.length}: ${realDriver.slice(0, 2).join(" | ")})`)
  } finally {
    await browser.close()
    await db.end()
  }

  if (failures.length) {
    console.error(`\n❌ Nightly cycle FAILED (${failures.length}):`)
    for (const f of failures) console.error(`   - ${f}`)
    process.exit(1)
  }
  console.log("\n✅ Nightly full-cycle regression passed.")
}

main().catch((e) => { console.error(e); process.exit(1) })
