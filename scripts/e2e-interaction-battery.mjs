/**
 * E2E: the 20-check interaction battery (reference: commit 74a25800).
 *
 * Covers the interaction contract the marketing site + hub promised and that
 * nothing else re-verifies on a schedule: navbar auto-hide/reveal in both
 * scroll directions, mobile drawer open + Esc close, desktop dropdown Esc and
 * outside-click close, all three bottom-bar tap targets ≥44px, zero
 * horizontal overflow across 7 key pages at 390px, /shippers#quote anchor
 * clearance under the fixed nav, back-to-top appear + return, hub Ctrl+K
 * command palette, and the driver bottom-tab round trip.
 *
 * Prereqs: server running against a seeded DB (see e2e-lib.mjs header).
 * Read-only on the marketing site; hub checks log in as dispatch + driver
 * demo users but mutate nothing.
 *
 * Run: node scripts/e2e-interaction-battery.mjs [outputDir]
 */
import { mkdirSync } from "node:fs"
import { BASE, check, failures, login, makeShot, sleep, waitForStableText, waitForText, launchBrowser } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-interaction"
mkdirSync(OUT, { recursive: true })

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 }
const DESKTOP = { width: 1440, height: 950, deviceScaleFactor: 1 }

/** Pages that must show zero horizontal overflow at 390px. */
const OVERFLOW_PAGES = ["/", "/shippers", "/cdl-jobs", "/apply", "/pay-rates", "/loadoff", "/routes"]

const navEl = () => document.querySelector("nav")
const navHidden = () => {
  const nav = document.querySelector("nav")
  if (!nav) return null
  return nav.getBoundingClientRect().bottom <= 0
}

async function scrollByAndSettle(page, y) {
  await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "instant" }), y)
  await sleep(350) // rAF-throttled scroll handler + transition
}

async function main() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  const shot = makeShot(OUT)

  // ---------- Mobile (390px): scroll hide/reveal, drawer, bottom bar ----------
  await page.setViewport(MOBILE)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 45000 })
  await waitForStableText(page)

  // 1. Nav hides on scroll-down past the hero.
  await scrollByAndSettle(page, 1400)
  await scrollByAndSettle(page, 400)
  check((await page.evaluate(navHidden)) === true, "1. navbar auto-hides on scroll-down past hero @390px")

  // 2. Nav reveals on scroll-up.
  await scrollByAndSettle(page, -300)
  check((await page.evaluate(navHidden)) === false, "2. navbar reveals on scroll-up @390px")
  await shot(page, "01-nav-revealed-mobile")

  // 3. Mobile drawer opens from the hamburger.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await sleep(300)
  await page.click('button[aria-label="Open navigation menu"]')
  await sleep(500)
  const drawerOpen = await page.evaluate(
    () => !!document.querySelector('button[aria-label="Close menu"]')
  )
  check(drawerOpen, "3. mobile drawer opens")
  await shot(page, "02-drawer-open")

  // 4. Esc closes the drawer (AnimatePresence keeps it mounted through the
  // spring exit — poll for unmount rather than a fixed wait).
  await page.keyboard.press("Escape")
  let drawerClosed = false
  try {
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Close menu"]'), {
      timeout: 4000,
    })
    drawerClosed = true
  } catch {}
  check(drawerClosed, "4. Esc closes the mobile drawer")

  // 5. Both bottom-bar tap targets (Call, Apply) are ≥44px tall. The bar mounts
  // only once the hero has scrolled off (one red per viewport), so scroll first.
  // Anchor on the tel: link — "div.fixed.bottom-0" also matches the drawer.
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }))
  await sleep(600)
  try {
    await page.waitForSelector('div.fixed.bottom-0 a[href^="tel:"]', { timeout: 4000 })
  } catch {}
  const targets = await page.evaluate(() => {
    const tel = document.querySelector('div.fixed.bottom-0 a[href^="tel:"]')
    const bar = tel?.closest("div.fixed.bottom-0")
    if (!bar) return null
    return [...bar.querySelectorAll("a")].map((a) => ({
      label: a.innerText.trim().split("\n")[0] || a.getAttribute("href"),
      h: Math.round(a.getBoundingClientRect().height),
      w: Math.round(a.getBoundingClientRect().width),
    }))
  })
  check(
    targets && targets.length === 2 && targets.every((t) => t.h >= 44 && t.w >= 44),
    `5. bottom-bar tap targets ≥44px (${JSON.stringify(targets)})`
  )

  // 6–12. Zero horizontal overflow on 7 key pages at 390px.
  for (const [i, url] of OVERFLOW_PAGES.entries()) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 45000 })
    await waitForStableText(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    check(overflow <= 0, `${6 + i}. zero horizontal overflow at 390px: ${url} (${overflow}px)`)
  }

  // 13. /shippers#quote anchor lands clear of the fixed nav.
  await page.goto(`${BASE}/shippers#quote`, { waitUntil: "networkidle2", timeout: 45000 })
  await sleep(700)
  const anchorClear = await page.evaluate(() => {
    const el = document.getElementById("quote")
    const nav = document.querySelector("nav")
    if (!el) return { ok: false, why: "no #quote element" }
    const top = el.getBoundingClientRect().top
    const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0
    return { ok: top >= navBottom - 1 && top < window.innerHeight, top: Math.round(top), navBottom: Math.round(navBottom) }
  })
  check(anchorClear.ok, `13. /shippers#quote lands clear of fixed nav (${JSON.stringify(anchorClear)})`)

  // 14. Back-to-top appears after deep scroll and returns to top.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 45000 })
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.7, behavior: "instant" }))
  await sleep(700)
  const bttVisible = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Back to top"]')
    return !!btn && btn.getBoundingClientRect().height > 0
  })
  let bttReturned = false
  if (bttVisible) {
    await page.click('button[aria-label="Back to top"]')
    await sleep(1500)
    bttReturned = await page.evaluate(() => window.scrollY < 50)
  }
  check(bttVisible && bttReturned, `14. back-to-top appears and returns to top (visible=${bttVisible}, returned=${bttReturned})`)

  // ---------- Desktop (1440px): dropdowns ----------
  await page.setViewport(DESKTOP)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 45000 })
  await waitForStableText(page)

  // 15. Desktop dropdown opens on click.
  const openDropdown = async () => {
    const opened = await page.evaluate(() => {
      const trigger = [...document.querySelectorAll('nav button[aria-haspopup="true"]')][0]
      if (!trigger) return false
      trigger.click()
      return true
    })
    await sleep(400)
    return opened
  }
  const dropdownExpanded = () =>
    page.evaluate(
      () => [...document.querySelectorAll('nav button[aria-haspopup="true"]')].some((b) => b.getAttribute("aria-expanded") === "true")
    )
  check((await openDropdown()) && (await dropdownExpanded()), "15. desktop dropdown opens @1440px")
  await shot(page, "03-dropdown-open")

  // 16. Esc closes the dropdown.
  await page.keyboard.press("Escape")
  await sleep(400)
  check(!(await dropdownExpanded()), "16. Esc closes desktop dropdown")

  // 17. Outside-click closes the dropdown.
  await openDropdown()
  check(await dropdownExpanded(), "17a. dropdown re-opens for outside-click check")
  await page.mouse.click(720, 700)
  await sleep(400)
  check(!(await dropdownExpanded()), "17. outside-click closes desktop dropdown")

  // ---------- Hub (1440px): Ctrl+K palette ----------
  // 18–19. Command palette opens on Ctrl+K and finds a route.
  await login(page, "dispatch@demo.thind")
  await page.keyboard.down("Control")
  await page.keyboard.press("k")
  await page.keyboard.up("Control")
  await sleep(600)
  const paletteInput = await page.$('input[placeholder="Go to a screen…"]')
  check(!!paletteInput, "18. hub Ctrl+K opens the command palette")
  // The palette takes Enter now (and arrows, Home/End). Still clicking the
  // first result here: a mouse user is the path this battery is checking, and
  // the keyboard path has its own coverage in the palette's own listbox roles.
  let paletteNavigates = false
  if (paletteInput) {
    await paletteInput.type("invoices")
    await sleep(500)
    await page.evaluate(() => {
      const first = document.querySelector("#hauldesk-cmd-input")
        ?.closest("div.w-full")
        ?.querySelector("ul button")
      if (first instanceof HTMLElement) first.click()
    })
    await sleep(1500)
    paletteNavigates = await page.evaluate(() => location.pathname === "/hub/money/invoices")
  }
  check(paletteNavigates, "19. palette search finds and opens /hub/money/invoices")
  await shot(page, "04-after-palette")

  // ---------- Driver PWA (390px): bottom tabs round trip ----------
  await page.setViewport(MOBILE)
  await page.deleteCookie(...(await page.cookies())) // switch users cleanly
  await login(page, "driver@demo.thind")
  await page.goto(`${BASE}/hub/driver`, { waitUntil: "networkidle2", timeout: 45000 })
  await waitForText(page, "Last pay")
  await waitForStableText(page)
  const TABS = ["/hub/driver/messages", "/hub/driver/pay", "/hub/driver/more", "/hub/driver"]
  let tabTrips = 0
  for (const href of TABS) {
    const clicked = await page.evaluate((h) => {
      const a = document.querySelector(`nav a[href="${h}"]`)
      if (!a) return false
      a.click()
      return true
    }, href)
    if (!clicked) break
    try {
      await page.waitForFunction((h) => location.pathname === h, { timeout: 15000 }, href)
      tabTrips++
    } catch {
      break
    }
    await sleep(400)
  }
  check(tabTrips === TABS.length, `20. driver bottom tabs round trip (${tabTrips}/${TABS.length})`)
  await shot(page, "05-driver-tabs-done")

  await browser.close()

  console.log("")
  if (failures.length) {
    console.error(`❌ interaction battery: ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log("✅ interaction battery: all 20 checks passed")
}

main().catch((err) => {
  console.error("Battery crashed:", err)
  process.exit(1)
})
