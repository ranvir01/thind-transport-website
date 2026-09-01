/**
 * Local QA rig screenshot sweep (visual QA, improvement-loop §1d).
 * Drives the local `npm run start` server, logs in per role, screenshots
 * every nav-reachable office screen at 1440px and driver/portal at 390px.
 * Uses puppeteer pointed at the Playwright-managed chromium (the repo's
 * cloud-rig convention — see scripts/e2e-lib.mjs).
 *
 * Usage: node scripts/qa-local-shots.mjs <outDir>
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import path from "node:path"

const BASE = process.env.QA_BASE ?? "http://localhost:3000"
const OUT = process.argv[2] ?? path.join(process.cwd(), "qa-shots")
const PASS = "ThindDemo1!"
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

mkdirSync(path.join(OUT, "office"), { recursive: true })
mkdirSync(path.join(OUT, "mobile"), { recursive: true })

// Owner sees every office nav item; dispatcher is blocked from a few.
const OFFICE = [
  ["01-today", "/hub"],
  ["02-dispatch", "/hub/dispatch"],
  ["03-planner", "/hub/planner"],
  ["04-loadboard", "/hub/loadboard"],
  ["05-loads", "/hub/loads"],
  ["06-loads-new", "/hub/loads/new"],
  ["07-loads-paste", "/hub/loads/paste"],
  ["08-capacity", "/hub/capacity"],
  ["09-map", "/hub/map"],
  ["10-money", "/hub/money"],
  ["11-money-invoices", "/hub/money/invoices"],
  ["12-money-settlements", "/hub/money/settlements"],
  ["13-money-expenses", "/hub/money/expenses"],
  ["14-money-advances", "/hub/money/advances"],
  ["15-fleet", "/hub/fleet"],
  ["16-drivers", "/hub/drivers"],
  ["17-customers", "/hub/customers"],
  ["18-facilities", "/hub/facilities"],
  ["19-fuel", "/hub/fuel"],
  ["20-compliance", "/hub/compliance"],
  ["21-compliance-ifta", "/hub/compliance/ifta"],
  ["22-safety", "/hub/safety"],
  ["23-messages", "/hub/messages"],
  ["24-tasks", "/hub/tasks"],
  ["25-recruiting", "/hub/recruiting"],
  ["26-leads", "/hub/leads"],
  ["27-reports", "/hub/reports"],
  ["28-reports-owner", "/hub/reports/owner"],
  ["29-import", "/hub/import"],
  ["30-settings-users", "/hub/settings/users"],
  ["31-settings-app", "/hub/settings/app"],
  ["32-settings-integrations", "/hub/settings/integrations"],
  ["33-settings-packet", "/hub/settings/packet"],
  ["34-settings-branding", "/hub/settings/branding"],
  ["35-settings-pricebook", "/hub/settings/pricebook"],
  ["36-guide", "/hub/guide"],
  ["37-help", "/hub/help"],
  ["38-setup", "/hub/setup"],
]

const DRIVER = [
  ["d01-today", "/hub/driver"],
  ["d02-pay", "/hub/driver/pay"],
  ["d03-messages", "/hub/driver/messages"],
  ["d04-more", "/hub/driver/more"],
  ["d05-docs", "/hub/driver/docs"],
  ["d06-dvir", "/hub/driver/dvir"],
  ["d07-incident", "/hub/driver/incident"],
  ["d08-timeoff", "/hub/driver/timeoff"],
]

const PORTAL = [["p01-portal", "/hub/portal"]]

async function login(page, email) {
  // Clear any prior session so switching roles actually re-authenticates
  // (a stale owner cookie makes /hub/login redirect straight to /hub).
  const cookies = await page.cookies(BASE)
  if (cookies.length) await page.deleteCookie(...cookies)
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
  if (page.url().includes("/hub/login")) {
    await page.type("#email", email, { delay: 15 })
    await page.type("#password", PASS, { delay: 15 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.click('button[type="submit"]'),
    ])
  }
}

async function shot(page, dir, name, urlPath, viewport) {
  await page.setViewport(viewport)
  const resp = await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle2", timeout: 60000 })
  await new Promise((r) => setTimeout(r, 400))
  const status = resp ? resp.status() : "?"
  const landed = page.url().replace(BASE, "")
  const file = path.join(OUT, dir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  const flag = landed !== urlPath ? `  ↪ ${landed}` : ""
  console.log(`✓ ${name} [${status}]${flag}`)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()

  console.log("== OFFICE @1440 (owner) ==")
  await login(page, "owner@demo.thind")
  for (const [name, url] of OFFICE) {
    try { await shot(page, "office", name, url, { width: 1440, height: 900 }) }
    catch (e) { console.error(`✗ ${name}: ${e.message}`) }
  }

  console.log("== DRIVER @390 ==")
  await login(page, "driver@demo.thind")
  for (const [name, url] of DRIVER) {
    try { await shot(page, "mobile", name, url, { width: 390, height: 844 }) }
    catch (e) { console.error(`✗ ${name}: ${e.message}`) }
  }

  console.log("== PORTAL @390 (broker) ==")
  await login(page, "broker@demo.thind")
  for (const [name, url] of PORTAL) {
    try { await shot(page, "mobile", name, url, { width: 390, height: 844 }) }
    catch (e) { console.error(`✗ ${name}: ${e.message}`) }
  }

  await browser.close()
  console.log(`\nDone — ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
