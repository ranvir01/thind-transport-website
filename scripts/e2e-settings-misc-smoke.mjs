/**
 * Verify-and-build cycle sweep: settings/branding, settings/packet,
 * settings/app — the three settings screens with no dedicated smoke script
 * (e2e-sweep.mjs only render-checks packet/app; branding has no coverage at
 * all). Owner-only branding accent set/reset, packet documents + send
 * panels render, app page install/push panels render at 1440px and 390px,
 * zero console errors, non-owner gating on branding.
 */
import { launchBrowser, login, waitForText, makeShot, check, failures, IGNORABLE_CONSOLE_ERROR } from "./e2e-lib.mjs"

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const outDir = "e2e-shots-logs/settings-misc"
import { mkdirSync } from "node:fs"
mkdirSync(outDir, { recursive: true })
const shot = makeShot(outDir)

const browser = await launchBrowser()

try {
  // 1. Owner: branding page — set accent, verify persisted, reset.
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.setViewport({ width: 1440, height: 900 })

    console.log("1. Owner opens branding settings")
    await login(page, "owner@demo.thind")
    await page.goto(`${BASE}/hub/settings/branding`, { waitUntil: "networkidle2" })
    check(await waitForText(page, "Branding").then(() => true).catch(() => false), "branding page renders")
    await shot(page, "01-branding")

    check(!!(await page.$('input[type="color"]')), "custom accent color input present")

    const clickButtonWithText = async (re) => {
      const btns = await page.$$("button")
      for (const b of btns) {
        const text = await page.evaluate((el) => el.textContent, b)
        if (text && re.test(text)) { await b.click(); return true }
      }
      return false
    }

    // Pick the Blue preset radio, save, verify it persists across a reload.
    check(await clickButtonWithText(/^Blue$/), "clicked the Blue preset swatch")
    check(await clickButtonWithText(/Save accent color/), "clicked Save accent color")
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {})
    await shot(page, "02-accent-saved")

    await page.reload({ waitUntil: "networkidle2" })
    check(await waitForText(page, "Branding").then(() => true).catch(() => false), "branding page survives reload")
    const blueSelected = await page.evaluate(() => {
      const radio = document.querySelector('button[role="radio"][aria-checked="true"]')
      return radio?.textContent?.includes("Blue") ?? false
    })
    check(blueSelected, "Blue accent persisted after reload")
    await shot(page, "03-branding-reloaded")

    // Reset back to the standard look so the demo tenant isn't left mutated for later runs.
    check(await clickButtonWithText(/Reset to standard look/), "clicked Reset to standard look")
    check(await clickButtonWithText(/Remove accent color/), "clicked Remove accent color (save the reset)")
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => {})
    await page.reload({ waitUntil: "networkidle2" })
    const noneSelected = await page.evaluate(
      () => document.querySelector('button[role="radio"][aria-checked="true"]') === null
    )
    check(noneSelected, "accent reset to standard look persisted after reload")
    await shot(page, "04-accent-reset")

    const realErrors = errors.filter((e) => !IGNORABLE_CONSOLE_ERROR.test(e))
    check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)
    await ctx.close()
  }

  // 2. Non-owner (dispatcher) is bounced off branding (owner-only route).
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    console.log("2. Dispatcher is bounced off branding settings (owner only)")
    await login(page, "dispatch@demo.thind")
    await page.goto(`${BASE}/hub/settings/branding`, { waitUntil: "networkidle2" })
    const path = await page.evaluate(() => location.pathname)
    check(path !== "/hub/settings/branding", `dispatcher redirected away (landed on ${path})`)
    await shot(page, "05-dispatcher-bounced")
    await ctx.close()
  }

  // 3. Office user: carrier packet page — documents panel + send/COI forms render.
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.setViewport({ width: 1440, height: 900 })

    console.log("3. Office user opens carrier packet")
    await login(page, "accounting@demo.thind")
    await page.goto(`${BASE}/hub/settings/packet`, { waitUntil: "networkidle2" })
    check(await waitForText(page, "Carrier packet").then(() => true).catch(() => false), "packet page renders")
    check(await waitForText(page, "COI").then(() => true).catch(() => false), "COI request panel present")
    await shot(page, "06-packet")
    const realErrors = errors.filter((e) => !IGNORABLE_CONSOLE_ERROR.test(e))
    check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)
    await ctx.close()
  }

  // 4. Office user: phone-app page at desktop + driver 390px-equivalent (still office role, forced-light).
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.setViewport({ width: 1440, height: 900 })

    console.log("4. Office user opens phone-app settings (1440px)")
    await login(page, "owner@demo.thind")
    await page.goto(`${BASE}/hub/settings/app`, { waitUntil: "networkidle2" })
    check(await waitForText(page, "Install").then(() => true).catch(() => false), "install panel present")
    check(await waitForText(page, "alerts").then(() => true).catch(() => false), "push-alerts panel present")
    await shot(page, "07-app-1440")

    await page.setViewport({ width: 390, height: 844 })
    await page.reload({ waitUntil: "networkidle2" })
    check(await waitForText(page, "Install").then(() => true).catch(() => false), "install panel present at 390px")
    await shot(page, "08-app-390")

    const realErrors = errors.filter((e) => !IGNORABLE_CONSOLE_ERROR.test(e))
    check(realErrors.length === 0, `no console errors (${realErrors.length}: ${realErrors.slice(0, 2).join(" | ")})`)
    await ctx.close()
  }

  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed:`)
    for (const f of failures) console.log(`  - ${f}`)
    process.exitCode = 1
  } else {
    console.log("\nSettings-misc smoke passed.")
  }
} finally {
  await browser.close()
}
