/**
 * Inbox end-to-end smoke: an emailed rate con becomes a booked load.
 *
 * pollDocsMailbox used to file attachments only onto loads that ALREADY
 * existed; mail for freight not yet booked hit `if (load)` and its attachments
 * were DISCARDED behind a "file it by hand" notification. Unmatched rate cons
 * now land in hub.intake_drafts and surface at /hub/inbox, prefilled through
 * the same rate-con→form mapping the paste screen uses.
 *
 * This drives the half a human touches, against the two drafts seed-demo
 * stages (a clean Pacific Crest rate con and a thinner Mid Valley offer):
 *
 *   1. the queue renders both, with the parse summary and a confidence badge
 *   2. Review & book opens the shared LoadForm already filled from the parse
 *   3. booking creates a real load and empties that row out of the queue
 *   4. Dismiss clears the other without creating anything
 *   5. an accountant (no loads:write) cannot accept or dismiss
 *
 * Reseeds demo data first. Usage: node scripts/e2e-inbox-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  BASE, failures, check, waitForText, login, makeShot, reseed, clickByText,
  realConsoleErrors, launchBrowser, waitForLoadDetail, textGone,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-inbox"
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

  console.log("1. Owner opens the Inbox")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub/inbox`, { waitUntil: "networkidle2" })
  // Anchored on the page's own subtitle, never a sidebar word — "Inbox" is a
  // nav label and would be satisfied by the chrome before the queue renders.
  await waitForText(page, "Rate cons that arrived by email")

  const queue = await page.evaluate(() => {
    const body = document.body.innerText
    return {
      rows: document.querySelectorAll('a[href^="/hub/inbox/"]').length,
      hasCrest: body.includes("Kent WA to Fresno CA"),
      hasMidValley: body.includes("FW: load offer 53ft dry van"),
      hasSender: body.includes("dispatch@pacificcrestlogistics.example"),
      // buildDocSummary chips prove the parse, not just the subject line.
      hasParseChip: /PCL-99120/.test(body),
      hasConfidence: body.includes("Reads clean"),
      reviewButtons: [...document.querySelectorAll("a")].filter((a) => a.textContent.trim() === "Review & book").length,
    }
  })
  check(queue.rows === 2, `two drafts waiting (${queue.rows})`)
  check(queue.hasCrest && queue.hasMidValley, "both subjects render")
  check(queue.hasSender, "the sending broker is shown")
  check(queue.hasParseChip, "the parse summary shows the load number it read (PCL-99120)")
  check(queue.hasConfidence, "a confidence badge is shown")
  check(queue.reviewButtons === 2, `each draft offers Review & book (${queue.reviewButtons})`)
  await shot(page, "01-inbox-queue")

  console.log("2. The nav badges the waiting count")
  const badge = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a[href="/hub/inbox"]')].find((a) => a.textContent.includes("Inbox"))
    return link?.textContent?.replace(/\s+/g, "") ?? null
  })
  check(badge === "Inbox2", `nav shows the pending count (${badge})`)

  console.log("3. Review & book opens the prefilled form")
  const crestHref = await page.evaluate(() => {
    const panel = [...document.querySelectorAll("li")].find((li) => li.innerText.includes("Kent WA to Fresno CA"))
    return [...(panel?.querySelectorAll("a") ?? [])]
      .find((a) => a.getAttribute("href")?.startsWith("/hub/inbox/"))
      ?.getAttribute("href") ?? null
  })
  check(!!crestHref, `found the Pacific Crest draft (${crestHref})`)
  await page.goto(`${BASE}${crestHref}`, { waitUntil: "networkidle2" })
  await waitForText(page, "check every field before booking")

  const form = await page.evaluate(() => {
    const val = (id) => document.getElementById(id)?.value ?? null
    return {
      linehaul: val("linehaul"),
      fsc: val("fsc"),
      weight: val("weight"),
      reference: val("customer_reference"),
      commodity: val("commodity"),
      // MC 784512 on the rate con is Pacific Crest Logistics on file, so the
      // broker picker must resolve by MC — the whole point of matchBroker.
      customer: val("customer"),
      customerLabel: document.querySelector("#customer")?.selectedOptions?.[0]?.textContent?.trim() ?? null,
      cities: [...document.querySelectorAll('input[aria-label="City"]')].map((i) => i.value),
    }
  })
  check(form.linehaul === "3200.00", `linehaul prefilled in dollars (${form.linehaul})`)
  check(form.fsc === "350.00", `FSC prefilled (${form.fsc})`)
  check(form.weight === "42000", `weight prefilled (${form.weight})`)
  check(form.reference === "PCL-99120", `customer reference prefilled (${form.reference})`)
  check(form.commodity === "paper", `commodity prefilled (${form.commodity})`)
  check(form.cities.includes("Kent") && form.cities.includes("Fresno"), `lane prefilled (${form.cities.join(" → ")})`)
  check(!!form.customer, "broker resolved from the rate con's MC number")
  check(form.customerLabel === "Pacific Crest Logistics", `matched the right broker (${form.customerLabel})`)
  await shot(page, "02-prefilled-form")

  console.log("4. Book it — every field already filled from the email")
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
    clickByText(page, "Book load"),
  ])
  await waitForLoadDetail(page)
  const booked = await page.evaluate(() => ({
    reference: document.querySelector("h1")?.textContent?.trim() ?? "",
    body: document.body.innerText,
  }))
  check(/^THD-\d+$/.test(booked.reference), `emailed rate con became a load (${booked.reference})`)
  check(/PCL-99120/.test(booked.body), "the broker's own reference carried onto the load")
  await shot(page, "03-booked-load")

  console.log("5. The accepted draft leaves the queue")
  await page.goto(`${BASE}/hub/inbox`, { waitUntil: "networkidle2" })
  await waitForText(page, "Rate cons that arrived by email")
  await textGone(page, "Kent WA to Fresno CA")
  const afterAccept = await page.evaluate(() => ({
    rows: document.querySelectorAll('a[href^="/hub/inbox/"]').length,
    stillHasMidValley: document.body.innerText.includes("FW: load offer 53ft dry van"),
  }))
  check(afterAccept.rows === 1, `one draft left (${afterAccept.rows})`)
  check(afterAccept.stillHasMidValley, "the untouched draft is still waiting")

  console.log("6. Dismiss clears the last one without creating a load")
  const loadsBefore = await countLoads(page)
  await clickByText(page, "Dismiss")
  await textGone(page, "FW: load offer 53ft dry van")
  await waitForText(page, "Nothing waiting")
  const loadsAfter = await countLoads(page)
  check(loadsAfter === loadsBefore, `dismiss created no load (${loadsBefore} → ${loadsAfter})`)
  await page.goto(`${BASE}/hub/inbox`, { waitUntil: "networkidle2" })
  await waitForText(page, "Nothing waiting")
  const emptyBadge = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a[href="/hub/inbox"]')].find((a) => a.textContent.includes("Inbox"))
    return link?.textContent?.replace(/\s+/g, "") ?? null
  })
  check(emptyBadge === "Inbox", `badge gone when the queue is empty (${emptyBadge})`)
  await shot(page, "04-inbox-empty")

  console.log("7. An accountant cannot accept or dismiss")
  reseed()
  const context2 = await browser.createBrowserContext()
  const page2 = await context2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(page2, "accounting@demo.thind")
  await page2.goto(`${BASE}/hub/inbox`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Rate cons that arrived by email")
  await clickByText(page2, "Dismiss")
  // The action is gated on loads:write server-side; the draft must survive.
  await page2.waitForFunction(
    () => document.body.innerText.includes("FW: load offer 53ft dry van"),
    { timeout: 10000 }
  )
  const stillThere = await page2.evaluate(() => document.querySelectorAll('a[href^="/hub/inbox/"]').length)
  check(stillThere === 2, `accountant's dismiss was refused, both drafts intact (${stillThere})`)
  await shot(page2, "05-accountant-refused")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/401|403/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nInbox smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nInbox smoke passed.")
}

/** Load count from the list page — proof that dismiss books nothing. */
async function countLoads(page) {
  const here = page.url()
  await page.goto(`${BASE}/hub/loads?status=all`, { waitUntil: "networkidle2" })
  const n = await page.evaluate(
    () => [...document.querySelectorAll("a")].filter((a) => /\/hub\/loads\/[0-9a-f-]{36}/.test(a.getAttribute("href") ?? "")).length
  )
  await page.goto(here, { waitUntil: "networkidle2" })
  return n
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
