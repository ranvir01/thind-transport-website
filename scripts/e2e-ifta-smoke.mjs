/**
 * IFTA generate smoke test: owner computes the current quarter from seeded
 * pings + fuel, the worksheet renders with credible MPG and per-jurisdiction
 * rows, the on-screen net tax reconciles with the CSV export, and the
 * draft -> reviewed -> filed status flow advances.
 *
 * Usage: node scripts/e2e-ifta-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { launchBrowser, BASE, sleep, failures, check, clickByText, waitForText, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-ifta"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: true })

const quarterKey = (d = new Date()) =>
  `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`
const priorQuarterKey = () => {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - 3)
  return quarterKey(d)
}

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  // The demo loop spans the trailing ~90 days, so the PRIOR quarter holds a
  // full quarter of pings/fuel — that's the one worth strict validation. The
  // current (partial) quarter just has to compute without error.
  const quarter = priorQuarterKey()

  console.log("1. Login as owner")
  await login(page, "owner@demo.thind")

  console.log(`2. Open IFTA screen for ${quarter}`)
  await page.goto(`${BASE}/hub/compliance/ifta?q=${quarter}`, { waitUntil: "networkidle2" })
  await waitForText(page, `IFTA — ${quarter}`)
  await shot(page, "01-ifta-before-compute")

  console.log("3. Compute the quarter")
  await clickByText(page, "ompute quarter").catch(() => clickByText(page, "Recompute"))
  await waitForText(page, "Quarter computed")
  await sleep(1200)
  await shot(page, "02-ifta-computed")

  console.log("4. Validate the worksheet")
  const screen = await page.evaluate(() => {
    const text = document.body.innerText
    const stat = (label) => {
      const nodes = [...document.querySelectorAll("span")]
      const el = nodes.find((n) => n.textContent?.trim().toUpperCase() === label)
      return el?.parentElement?.querySelector("p")?.textContent?.trim() ?? null
    }
    const rows = [...document.querySelectorAll("tbody tr")].map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent?.trim() ?? "")
    )
    return {
      status: stat("STATUS"),
      source: stat("MILEAGE SOURCE"),
      miles: stat("FLEET MILES"),
      mpg: stat("FLEET MPG"),
      netTax: stat("NET TAX"),
      rows,
      missingRates: text.includes("Missing rates for"),
    }
  })
  check(screen.status?.toLowerCase() === "draft", `status is draft (got ${screen.status})`)
  check(!!screen.source, `mileage source shown (${screen.source})`)
  const mpg = Number(screen.mpg)
  check(mpg > 4 && mpg < 9, `fleet MPG credible for a tractor (got ${screen.mpg})`)
  const miles = Number((screen.miles ?? "").replace(/,/g, ""))
  check(miles > 1000, `fleet miles nonzero (got ${screen.miles})`)
  check(screen.rows.length >= 2, `>=2 jurisdiction rows (got ${screen.rows.length})`)
  check(!screen.missingRates, "no missing-rates warning (rates seeded)")

  const parseCents = (s) => {
    const m = (s ?? "").match(/(-?)\$([\d,]+)\.(\d{2})/)
    if (!m) return null
    return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, "")) * 100 + Number(m[3]))
  }
  const netTaxCents = parseCents(screen.netTax)
  const rowSum = screen.rows.reduce((acc, row) => acc + (parseCents(row[6]) ?? 0), 0)
  check(
    netTaxCents !== null && rowSum === netTaxCents,
    `jurisdiction rows sum to header net tax (${rowSum} vs ${netTaxCents})`
  )

  console.log("5. Reconcile against the CSV export")
  const csv = await page.evaluate(async (q) => {
    const res = await fetch(`/api/hub/ifta/${q}/worksheet.csv`)
    return { status: res.status, body: await res.text() }
  }, quarter)
  check(csv.status === 200, `worksheet.csv responds 200 (got ${csv.status})`)
  const csvLines = csv.body.trim().split("\n")
  check(csvLines.length >= screen.rows.length + 1, `CSV has all jurisdiction lines (${csvLines.length - 1})`)
  const netCol = csvLines[0].split(",").findIndex((h) => /net/i.test(h))
  const csvNetSum = csvLines
    .slice(1)
    .filter((l) => !/^total/i.test(l))
    .reduce((acc, l) => acc + Math.round(Number(l.split(",")[netCol] ?? 0) * 100), 0)
  check(
    Math.abs(csvNetSum - netTaxCents) <= csvLines.length,
    `CSV net column reconciles with screen net tax (${csvNetSum} vs ${netTaxCents})`
  )
  const sources = await page.evaluate(async (q) => {
    const res = await fetch(`/api/hub/ifta/${q}/sources.csv`)
    return { status: res.status, size: (await res.text()).length }
  }, quarter)
  check(sources.status === 200 && sources.size > 100, `sources.csv responds with data (${sources.status}, ${sources.size}b)`)

  console.log("6. Advance draft -> reviewed -> filed")
  await clickByText(page, "Mark reviewed")
  await waitForText(page, "Marked reviewed")
  await sleep(1000)
  await clickByText(page, "Mark filed")
  await waitForText(page, "Marked filed")
  await sleep(1000)
  const finalStatus = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("span")]
    const el = nodes.find((n) => n.textContent?.trim().toUpperCase() === "STATUS")
    return el?.parentElement?.querySelector("p")?.textContent?.trim() ?? null
  })
  check(finalStatus?.toLowerCase() === "filed", `status advanced to filed (got ${finalStatus})`)
  await shot(page, "03-ifta-filed")

  console.log(`7. Current partial quarter (${quarterKey()}) computes cleanly`)
  await page.goto(`${BASE}/hub/compliance/ifta?q=${quarterKey()}`, { waitUntil: "networkidle2" })
  await clickByText(page, "ompute quarter").catch(() => clickByText(page, "Recompute"))
  await waitForText(page, "Quarter computed")
  await sleep(1200)
  const partial = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("span")]
    const stat = (label) => {
      const el = nodes.find((n) => n.textContent?.trim().toUpperCase() === label)
      return el?.parentElement?.querySelector("p")?.textContent?.trim() ?? null
    }
    return { status: stat("STATUS"), miles: stat("FLEET MILES") }
  })
  check(partial.status?.toLowerCase() === "draft", `partial quarter computed as draft (got ${partial.status})`)
  check(Number((partial.miles ?? "").replace(/,/g, "")) >= 0, `partial quarter miles parse (${partial.miles})`)
  await shot(page, "04-ifta-partial-quarter")

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nIFTA smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nIFTA smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
