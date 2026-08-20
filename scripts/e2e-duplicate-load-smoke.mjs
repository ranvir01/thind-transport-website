/**
 * Duplicate-load end-to-end smoke: a dispatcher rebooks a dedicated weekly
 * lane in one click instead of re-keying the whole load. Drives the seeded
 * "Pipe" flatbed load (settled lane with a Detention accessorial, customer
 * ref, full driver/truck/trailer assignment, and closed stop timestamps)
 * through the Duplicate button and proves the copy keeps what recurs and
 * drops what belonged to the old trip:
 *
 *   keeps  — customer, lane/stops, rate, equipment, assignment, factored flag
 *   drops  — Detention accessorial (earned money), customer ref (BRK…),
 *            appointment windows, arrived/departed timestamps
 *   resets — status to Booked, source to DIRECT, fresh THD- reference
 *
 * Also checks the timeline provenance note ("Duplicated from THD-xxxx") and
 * that an accountant (no loads:write) is never offered the button.
 *
 * Reseeds demo data first. Usage: node scripts/e2e-duplicate-load-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { BASE, failures, check, waitForText, login, makeShot, reseed, clickByText, realConsoleErrors, launchBrowser, waitForLoadDetail} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-duplicate-load"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Owner opens the settled Pipe load")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/loads?status=all&q=Pipe`, { waitUntil: "networkidle2" })
  await waitForText(page, "Search, filter, and manage every load.")
  // The list row shows reference/lane, not the commodity — the q=Pipe filter
  // already narrows the table to the one Pipe load.
  await waitForText(page, "Sacramento")
  const loadHref = await page.evaluate(() => {
    const row = [...document.querySelectorAll("a")].find(
      (a) => /\/hub\/loads\/[0-9a-f-]{36}/.test(a.getAttribute("href") ?? "") && a.textContent.includes("THD-")
    )
    return row?.getAttribute("href") ?? null
  })
  check(!!loadHref, `Pipe load found in the loads list (${loadHref})`)
  await page.goto(`${BASE}${loadHref}`, { waitUntil: "networkidle2" })
  await waitForLoadDetail(page)

  const source = await page.evaluate(() => {
    const heading = document.querySelector("h1")?.textContent?.trim() ?? ""
    const body = document.body.innerText
    const driver = [...document.querySelectorAll("dt")]
      .find((dt) => dt.textContent?.trim() === "Driver")
      ?.nextElementSibling?.textContent?.trim() ?? null
    return {
      reference: heading,
      driver,
      hasDetentionLine: [...document.querySelectorAll("dt")].some((dt) => /detention/i.test(dt.textContent ?? "")),
      hasCustomerRef: /Ref BRK/i.test(body),
      hasDuplicate: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Duplicate"),
    }
  })
  check(/^THD-\d+$/.test(source.reference), `source load open (${source.reference})`)
  check(source.hasDetentionLine, "source shows its Detention accessorial")
  check(source.hasCustomerRef, "source shows its customer ref (BRK…)")
  check(!!source.driver && source.driver !== "Unassigned", `source has an assigned driver (${source.driver})`)
  check(source.hasDuplicate, "owner is offered the Duplicate button")
  await shot(page, "01-source-load")

  console.log("2. Duplicate — lands on a fresh booked copy")
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }),
    clickByText(page, "Duplicate"),
  ])
  await waitForLoadDetail(page)
  const copy = await page.evaluate(() => {
    const heading = document.querySelector("h1")?.textContent?.trim() ?? ""
    const body = document.body.innerText
    const driver = [...document.querySelectorAll("dt")]
      .find((dt) => dt.textContent?.trim() === "Driver")
      ?.nextElementSibling?.textContent?.trim() ?? null
    const sourceDd = [...document.querySelectorAll("dt")]
      .find((dt) => dt.textContent?.trim() === "Source")
      ?.nextElementSibling?.textContent?.trim() ?? null
    return {
      url: location.pathname,
      reference: heading,
      driver,
      sourceField: sourceDd,
      status: body.includes("Booked"),
      hasDetentionLine: [...document.querySelectorAll("dt")].some((dt) => /detention/i.test(dt.textContent ?? "")),
      hasCustomerRef: /Ref BRK/i.test(body),
      factored: /Factored/.test(body),
      total: body.match(/Total\s*\$([\d,]+)/)?.[1] ?? null,
      apptChips: /Appt /.test(body),
      openTimestamps: (body.match(/Arrived: —/g) ?? []).length,
      provenance: body.match(/Duplicated from (THD-\d+)/)?.[1] ?? null,
      hasInvoiceChip: /INV-/.test(body),
    }
  })
  check(/^THD-\d+$/.test(copy.reference) && copy.reference !== source.reference,
    `copy got a fresh reference (${source.reference} → ${copy.reference})`)
  check(copy.status, "copy starts at Booked")
  // textContent ignores the uppercase CSS transform — compare case-insensitively.
  check(copy.sourceField?.toLowerCase() === "direct", `copy is a DIRECT booking (${copy.sourceField})`)
  check(copy.driver === source.driver, `assignment carried over (${copy.driver})`)
  check(copy.factored, "factored flag carried over")
  check(copy.total === "2,800", `total excludes the old trip's detention ($${copy.total} = linehaul + FSC)`)
  check(!copy.hasDetentionLine, "no Detention accessorial on the copy")
  check(!copy.hasCustomerRef, "old customer ref (BRK…) not carried over")
  check(!copy.apptChips, "appointment windows cleared — new trip books its own")
  check(copy.openTimestamps === 2, `both stops start with open timestamps (${copy.openTimestamps})`)
  check(copy.provenance === source.reference, `timeline names the source (Duplicated from ${copy.provenance})`)
  check(!copy.hasInvoiceChip, "no invoice attached to the copy")
  await shot(page, "02-duplicated-load")

  console.log("3. Accountant (no loads:write) is not offered Duplicate")
  // A fresh context: the accountant must not inherit the owner session.
  const context2 = await browser.createBrowserContext()
  const page2 = await context2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(page2, "accounting@demo.thind")
  await page2.goto(`${BASE}${copy.url}`, { waitUntil: "networkidle2" })
  await waitForLoadDetail(page2)
  const accountant = await page2.evaluate(() => ({
    hasDuplicate: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Duplicate"),
  }))
  check(!accountant.hasDuplicate, "accountant sees no Duplicate button")
  await shot(page2, "03-accountant-no-duplicate")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/401/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nDuplicate-load smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nDuplicate-load smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
