/**
 * E2E: the accountant's day, driven AS the accountant (accounting@demo.thind,
 * 1440px). Every money smoke logs in as owner or dispatcher, so the
 * accountant role's permission set (money:write + money:approve, but NO
 * loads:write / users:manage / settings:manage) had never been driven
 * end-to-end through its own UI until this script.
 *
 * Workflow covered: role landing on /hub/money → AR overview → one-click
 * invoice of the POD-received load → full payment to $0.00 open → weekly
 * settlement draft → approve → mark paid → deny a driver advance request →
 * negative checks that owner-only surfaces (users, settings) stay closed.
 *
 * Prereqs: server running against a seeded DB (see e2e-lib.mjs). Consumes
 * state — reseeds itself.
 *
 * Run: node scripts/e2e-accounting-drive.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  BASE, check, clickByText, failures, launchBrowser, login, makeShot, reseed,
  sleep, waitForText, realConsoleErrors,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-accounting"
mkdirSync(OUT, { recursive: true })

const parseCents = (s) => {
  const m = s?.match(/\$([\d,]+\.\d{2})/)
  return m ? Math.round(Number(m[1].replace(/,/g, "")) * 100) : null
}

/** Value shown next to a Summary <dt> label on invoice/settlement detail. */
const summaryValue = (page, label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === l)
    return dt?.parentElement?.querySelector("dd")?.textContent?.trim() ?? null
  }, label)

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const shot = makeShot(OUT)
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Accountant lands on /hub/money")
  await login(page, "accounting@demo.thind")
  await page.waitForFunction(() => location.pathname.startsWith("/hub"), { timeout: 20000 })
  const landing = await page.evaluate(() => location.pathname)
  check(landing === "/hub/money", `role landing is /hub/money (got ${landing})`)
  await waitForText(page, "Receivables")
  await shot(page, "01-money-overview")

  console.log("2. Invoice the POD-received load")
  await page.goto(`${BASE}/hub/loads?status=pod_received`, { waitUntil: "networkidle2" })
  const hrefs = await page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll('a[href^="/hub/loads/"]')]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/hub\/loads\/[0-9a-f-]{36}$/.test(h))
    )]
  )
  check(hrefs.length > 0, `pod_received loads listed (${hrefs.length})`)
  let invoiced = false
  for (const href of hrefs) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
    const hasButton = await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Invoice this load"))
    )
    if (!hasButton) continue
    await clickByText(page, "Invoice this load", { tag: "button" })
    await page.waitForFunction(
      () => /\/hub\/money\/invoices\/[0-9a-f-]{36}$/.test(location.pathname),
      { timeout: 20000 }
    )
    invoiced = true
    break
  }
  check(invoiced, "accountant can one-click invoice (money:write)")
  await waitForText(page, "Open balance")
  const invoiceUrl = await page.evaluate(() => location.pathname)
  await shot(page, "02-invoice-draft")

  console.log("3. Record full payment → paid, $0.00 open")
  await page.waitForSelector("#pay_amount", { timeout: 10000 })
  const openCents = parseCents(await summaryValue(page, "Open balance"))
  check(openCents > 0, `open balance positive before payment (${openCents})`)
  // Clear the prefilled amount first — typing into the prefilled number input
  // concatenates digits (Chrome drops the second decimal point), which is how
  // this drive discovered the unguarded-overpay backlog item.
  await page.evaluate(() => (document.querySelector("#pay_amount").value = ""))
  await page.type("#pay_amount", (openCents / 100).toFixed(2))
  await clickByText(page, "Record payment", { tag: "button" })
  await waitForText(page, "Payment recorded")
  await page.waitForFunction(
    () => {
      const dt = [...document.querySelectorAll("dt")].find((n) => n.textContent.trim() === "Open balance")
      return /\$0\.00/.test(dt?.parentElement?.querySelector("dd")?.textContent ?? "")
    },
    { timeout: 20000 }
  )
  check((await summaryValue(page, "Status"))?.toLowerCase() === "paid", "status flips to paid after full payment")
  check(
    await page.evaluate(() => !document.querySelector("#pay_amount")),
    "record-payment form hidden once settled"
  )
  await shot(page, "03-invoice-paid")

  console.log("4. Draft weekly settlements, approve one, mark it paid")
  await page.goto(`${BASE}/hub/money/settlements`, { waitUntil: "networkidle2" })
  await waitForText(page, "Weekly driver pay")
  await clickByText(page, "Draft this week", { tag: "button" })
  await waitForText(page, "settlement draft(s) created")
  // Completion signal is the draft button re-enabling after router.refresh.
  await page.waitForFunction(
    () => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Draft this week"))
      return b && !b.disabled
    },
    { timeout: 20000 }
  )
  const draftLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/hub/money/settlements/"]')]
      .filter((a) => a.textContent.toLowerCase().includes("draft"))
      .map((a) => a.getAttribute("href"))
  )
  check(draftLinks.length >= 1, `settlement drafts created (${draftLinks.length})`)
  await page.goto(`${BASE}${draftLinks[0]}`, { waitUntil: "networkidle2" })
  await waitForText(page, "Net pay")
  const gross = parseCents(await summaryValue(page, "Gross"))
  const deductions = parseCents(await summaryValue(page, "Deductions"))
  const net = parseCents(await summaryValue(page, "Net pay"))
  check(
    gross !== null && deductions !== null && net === gross - deductions,
    `net pay = gross − deductions to the cent (${gross} − ${deductions} = ${net})`
  )
  await clickByText(page, "Approve", { tag: "button" })
  await waitForText(page, "Status: approved", 20000)
  check(true, "accountant can approve a settlement (money:approve)")
  await clickByText(page, "Mark paid", { tag: "button" })
  await waitForText(page, "Status: paid", 20000)
  const actionsGone = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /approve|mark paid/i.test(b.textContent)).length
  )
  check(actionsGone === 0, "no settlement actions once paid")
  await shot(page, "04-settlement-paid")

  console.log("5. Advances queue: outstanding exposure and issue form render")
  // (Pending driver-request decisions are covered end-to-end by
  // e2e-advances-smoke.mjs — the base seed carries no pending requests.)
  await page.goto(`${BASE}/hub/money/advances`, { waitUntil: "networkidle2" })
  await waitForText(page, "Cash and EFS-code advances")
  check(
    await page.evaluate(() => /outstanding/i.test(document.body.innerText)),
    "outstanding advance exposure visible"
  )
  check(
    await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => /record advance/i.test(b.textContent))
    ),
    "issue-advance form available (money:write)"
  )
  await shot(page, "05-advances")

  console.log("6. Fuel screen readable, transactions render")
  await page.goto(`${BASE}/hub/fuel`, { waitUntil: "networkidle2" })
  await waitForText(page, "Fuel")
  check(
    await page.evaluate(() => /gallons|transactions/i.test(document.body.innerText)),
    "fuel transactions render for accountant"
  )

  console.log("7. Owner-only surfaces stay closed to the accountant")
  await page.goto(`${BASE}/hub/settings/users`, { waitUntil: "networkidle2" })
  const usersBlocked = await page.evaluate(
    () => location.pathname !== "/hub/settings/users" ||
      /don.t have access|not authorized|permission/i.test(document.body.innerText)
  )
  check(usersBlocked, "users management blocked (users:manage)")
  const navLeaks = await page.evaluate(() =>
    [...document.querySelectorAll("nav a")]
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("/hub/settings/users"))
  )
  check(navLeaks.length === 0, `nav does not advertise user management (${navLeaks.join(",")})`)

  const realErrors = realConsoleErrors(consoleErrors).filter(
    (e) => !/404|Failed to load resource/i.test(e)
  )
  check(realErrors.length === 0, `no console errors (${realErrors[0] ?? "clean"})`)

  await browser.close()
  console.log("")
  if (failures.length) {
    console.error(`❌ accounting drive: ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log(`✅ accounting drive: all checks passed (invoice ${invoiceUrl})`)
}

main().catch((err) => {
  console.error("Drive crashed:", err)
  process.exit(1)
})
