/**
 * Sidebar smoke: the collapsible rail (#12) and grouped utility links (#13).
 *
 *   1. the expanded sidebar renders Work / Reference / Setup, not one flat "More"
 *   2. on the seeded, fully-set-up tenant the Setup group starts folded, and a
 *      click unfolds it
 *   3. Collapse → the aside becomes the 56px icon rail with one icon per
 *      primary section; the Inbox badge survives as a dot on Loads
 *   4. the preference persists: a full reload lands collapsed
 *   5. the rail's More icon expands it again
 *   6. a different user on the same carrier is NOT collapsed — it is per user
 *
 * Anchors on data attributes and the page's own headings, never on a word the
 * sidebar renders in both states. Reseeds first.
 * Usage: node scripts/e2e-sidebar-smoke.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import {
  BASE, failures, check, waitForText, login, makeShot, reseed, realConsoleErrors, launchBrowser,
} from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-sidebar"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: false })

const railState = (page) => page.evaluate(() => document.querySelector("aside[data-rail]")?.getAttribute("data-rail") ?? null)
const asideWidth = (page) => page.evaluate(() => Math.round(document.querySelector("aside[data-rail]")?.getBoundingClientRect().width ?? 0))

async function main() {
  reseed()
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })

  console.log("1. Owner opens Today — sidebar expanded, three groups")
  await login(page, "owner@demo.thind")
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await waitForText(page, "Unconfirmed drivers")
  check((await railState(page)) === "expanded", `sidebar starts expanded (${await railState(page)})`)
  check((await asideWidth(page)) === 212, `expanded width is the deliberate 212px (${await asideWidth(page)})`)
  const groups = await page.evaluate(() =>
    [...document.querySelectorAll("aside [data-nav-group]")].map((el) => el.getAttribute("data-nav-group"))
  )
  check(groups.join(",") === "work,reference,setup", `groups render in order (${groups.join(",")})`)
  const flatMore = await page.evaluate(() =>
    [...document.querySelectorAll("aside p")].some((p) => p.textContent.trim() === "More")
  )
  check(!flatMore, "the old flat 'More' heading is gone")
  await shot(page, "01-expanded-groups")

  console.log("2. Setup starts folded on a set-up tenant, unfolds on click")
  const setupBtn = await page.$('aside [data-nav-group="setup"] button[aria-expanded]')
  check(!!setupBtn, "Setup group has a fold control")
  const foldedBefore = await page.evaluate(() =>
    document.querySelector('aside [data-nav-group="setup"] button[aria-expanded]')?.getAttribute("aria-expanded")
  )
  check(foldedBefore === "false", `Setup starts folded (aria-expanded=${foldedBefore})`)
  const setupLinksBefore = await page.$$eval('aside [data-nav-group="setup"] a', (as) => as.length)
  check(setupLinksBefore === 0, `no Setup links rendered while folded (${setupLinksBefore})`)
  await setupBtn.click()
  await page.waitForFunction(
    () => document.querySelectorAll('aside [data-nav-group="setup"] a').length > 0,
    { timeout: 5000 }
  )
  const setupLinksAfter = await page.$$eval('aside [data-nav-group="setup"] a', (as) => as.map((a) => a.getAttribute("href")))
  check(setupLinksAfter.includes("/hub/import") && setupLinksAfter.includes("/hub/settings/users"),
    `Setup unfolds to its links (${setupLinksAfter.length})`)
  await shot(page, "02-setup-unfolded")

  console.log("3. Collapse to the icon rail")
  await page.click('[data-testid="sidebar-toggle"]')
  await page.waitForFunction(() => document.querySelector("aside[data-rail]")?.getAttribute("data-rail") === "collapsed", { timeout: 5000 })
  // Let the width transition settle before measuring.
  await page.waitForFunction(() => Math.round(document.querySelector("aside[data-rail]").getBoundingClientRect().width) === 56, { timeout: 5000 }).catch(() => {})
  check((await asideWidth(page)) === 56, `rail is 56px (${await asideWidth(page)})`)
  const rail = await page.evaluate(() => ({
    icons: [...document.querySelectorAll('aside nav[aria-label="Sections"] a')].map((a) => a.getAttribute("aria-label")),
    inboxDot: !!document.querySelector('aside nav[aria-label="Sections"] a[aria-label="Loads"] span[aria-hidden]'),
    activeToday: document.querySelector('aside nav[aria-label="Sections"] a[aria-current="page"]')?.getAttribute("aria-label") ?? null,
    textLinks: [...document.querySelectorAll("aside a")].filter((a) => /Compliance|Reports|Toolbox/.test(a.textContent)).length,
  }))
  check(rail.icons.length >= 5, `one icon per primary section (${rail.icons.join("/")})`)
  check(rail.icons.includes("Loads") && rail.icons.includes("Money"), "rail icons are labelled for screen readers")
  check(rail.inboxDot, "Inbox badge survives as a dot on Loads (2 seeded drafts)")
  check(rail.activeToday === "Overview", `active section highlighted (${rail.activeToday})`)
  check(rail.textLinks === 0, "no utility text links leak into the rail")
  await shot(page, "03-collapsed-rail")

  console.log("4. Preference persists across a full reload")
  await page.goto(`${BASE}/hub/loads`, { waitUntil: "networkidle2" })
  await waitForText(page, "Search, filter, and manage every load.")
  check((await railState(page)) === "collapsed", `still collapsed after reload on another page (${await railState(page)})`)
  const activeLoads = await page.evaluate(() =>
    document.querySelector('aside nav[aria-label="Sections"] a[aria-current="page"]')?.getAttribute("aria-label") ?? null
  )
  check(activeLoads === "Loads", `rail follows the active section (${activeLoads})`)

  console.log("5. The rail's More icon expands it again")
  await page.click('aside button[aria-label="Show more links"]')
  await page.waitForFunction(() => document.querySelector("aside[data-rail]")?.getAttribute("data-rail") === "expanded", { timeout: 5000 })
  check((await railState(page)) === "expanded", "More expands the sidebar")
  await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await waitForText(page, "Unconfirmed drivers")
  check((await railState(page)) === "expanded", "expanded state persisted too")
  await shot(page, "04-expanded-again")

  console.log("6. Per user, not per carrier: the dispatcher is unaffected")
  await page.click('[data-testid="sidebar-toggle"]')
  await page.waitForFunction(() => document.querySelector("aside[data-rail]")?.getAttribute("data-rail") === "collapsed", { timeout: 5000 })
  const ctx2 = await browser.createBrowserContext()
  const page2 = await ctx2.newPage()
  await page2.setViewport({ width: 1440, height: 900 })
  page2.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.location().url ?? ""} ${msg.text()}`)
  })
  await login(page2, "dispatch@demo.thind")
  await page2.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
  await waitForText(page2, "Unconfirmed drivers")
  check((await railState(page2)) === "expanded", `dispatcher's sidebar is expanded (${await railState(page2)})`)
  const ownerOnlyLeak = await page2.$$eval('aside [data-nav-group="setup"] a, aside a', (as) =>
    as.some((a) => a.getAttribute("href") === "/hub/settings/users")
  )
  check(!ownerOnlyLeak, "owner-only Settings link is not in the dispatcher's Setup group")
  await shot(page2, "05-dispatcher-expanded")

  const realErrors = realConsoleErrors(consoleErrors).filter((e) => !/401/i.test(e))
  check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)

  await browser.close()
  if (failures.length > 0) {
    console.error(`\nSidebar smoke FAILED: ${failures.length} check(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log("\nSidebar smoke passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
