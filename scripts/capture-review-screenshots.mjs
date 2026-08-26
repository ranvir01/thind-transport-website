/**
 * Capture production HaulDesk screenshots for Claude spec review.
 * Usage: node scripts/capture-review-screenshots.mjs
 * Output: docs/review-screenshots/*.png
 */
import puppeteer from "puppeteer"
import { mkdirSync } from "node:fs"
import path from "node:path"

const BASE = "https://thindtransport.com"
const OUT = path.join(process.cwd(), "docs/review-screenshots")
const PASS = "ThindDemo1!"

mkdirSync(OUT, { recursive: true })

const OFFICE_PAGES = [
  ["01-login", "/hub/login", null],
  ["02-signup", "/hub/signup", null],
  ["03-today-desktop", "/hub", "dispatch@demo.thind"],
  ["04-help", "/hub/help", "dispatch@demo.thind"],
  ["05-setup-guide", "/hub/guide", "dispatch@demo.thind"],
  ["06-smart-setup", "/hub/setup", "dispatch@demo.thind"],
  ["07-dispatch", "/hub/dispatch", "dispatch@demo.thind"],
  ["08-planner", "/hub/planner", "dispatch@demo.thind"],
  ["09-loads", "/hub/loads", "dispatch@demo.thind"],
  ["10-paste-rate-con", "/hub/loads/paste", "dispatch@demo.thind"],
  ["11-money", "/hub/money", "dispatch@demo.thind"],
  ["12-settlements", "/hub/money/settlements", "dispatch@demo.thind"],
  ["13-fleet", "/hub/fleet", "dispatch@demo.thind"],
  ["14-drivers", "/hub/drivers", "dispatch@demo.thind"],
  ["15-compliance", "/hub/compliance", "dispatch@demo.thind"],
  ["16-fuel", "/hub/fuel", "dispatch@demo.thind"],
  ["17-messages", "/hub/messages", "dispatch@demo.thind"],
  ["18-map", "/hub/map", "dispatch@demo.thind"],
  ["19-tasks", "/hub/tasks", "dispatch@demo.thind"],
  ["20-recruiting", "/hub/recruiting", "dispatch@demo.thind"],
  ["21-tour", "/hub?tour=today-desk", "dispatch@demo.thind"],
  ["22-driver-desktop", "/hub/driver", "driver@demo.thind"],
  ["23-broker-portal", "/hub/portal", "broker@demo.thind"],
]

const MOBILE_PAGES = [
  ["24-today-mobile", "/hub", "dispatch@demo.thind"],
  ["25-dispatch-mobile", "/hub/dispatch", "dispatch@demo.thind"],
  ["26-driver-mobile", "/hub/driver", "driver@demo.thind"],
]

async function login(page, email) {
  await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2", timeout: 60000 })
  if (page.url().includes("/hub/login")) {
    await page.type("#email", email, { delay: 20 })
    await page.type("#password", PASS, { delay: 20 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.click('button[type="submit"]'),
    ])
  }
}

async function shot(page, name, urlPath, email, viewport) {
  if (email) await login(page, email)
  await page.setViewport(viewport)
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle2", timeout: 60000 })
  if (urlPath.includes("tour=")) await new Promise((r) => setTimeout(r, 800))
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log("✓", file)
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
  const page = await browser.newPage()

  for (const [name, urlPath, email] of OFFICE_PAGES) {
    try {
      await shot(page, name, urlPath, email, { width: 1440, height: 900 })
    } catch (err) {
      console.error("✗", name, err.message)
    }
  }

  for (const [name, urlPath, email] of MOBILE_PAGES) {
    try {
      await shot(page, name, urlPath, email, { width: 390, height: 844 })
    } catch (err) {
      console.error("✗", name, err.message)
    }
  }

  // Load detail — open first load from list
  try {
    await login(page, "dispatch@demo.thind")
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
    const href = await page.$eval('a[href^="/hub/loads/"]:not([href*="paste"]):not([href*="new"])', (a) => a.getAttribute("href"))
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2" })
      await page.screenshot({ path: path.join(OUT, "15b-load-detail.png"), fullPage: true })
      console.log("✓ load detail")
    }
  } catch (err) {
    console.error("✗ load-detail", err.message)
  }

  await browser.close()
  console.log(`\nDone — ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
