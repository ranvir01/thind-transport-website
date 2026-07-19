/**
 * Showcase-surfaces smoke: the reviewer-facing pages that landed in the
 * showcase pass (/loadoff product page, Help video walkthroughs, /hub/settings
 * index) had no smoke — a broken video source, a lost poster frame, or a
 * gating regression on the settings index would ship silently.
 *
 * Covers, at 1440px:
 *   1. /loadoff (public): "Watch it run" section present; all three tour
 *      videos pick a playable source and reach readyState >= 2 with a poster;
 *      no console errors.
 *   2. Video byte-range serving: Range request on tour-office.mp4 answers 206
 *      (Safari refuses to play mp4 from a server that answers 200-only).
 *   3. Owner: /hub/help shows "Video walkthroughs"; /hub/settings index shows
 *      all six area cards (users, integrations, branding, packet, pricebook,
 *      app).
 *   4. Accounting: /hub/settings shows only the three non-owner cards
 *      (packet + pricebook + app) — the index must gate like the nav does.
 *
 * Each role gets its own incognito browser context: pages share cookies
 * inside one context, so a second login() would land on an already
 * authenticated redirect and never see the #email field.
 *
 * Card counts scope to `.grid a[href^='/hub/settings/']` — the sidebar nav
 * also lives inside <main> and links three settings subpages, so a bare
 * main-scoped selector overcounts.
 *
 * Read-only: no reseed needed; safe to run in any order with other smokes.
 *
 * Usage: node scripts/e2e-showcase-smoke.mjs [outputDir]
 */
import puppeteer from "puppeteer"
import { execSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { BASE, failures, check, login, makeShot } from "./e2e-lib.mjs"

const OUT = process.argv[2] ?? "e2e-shots-showcase"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: false })

async function main() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] })

  async function newPage() {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    const errors = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    page.on("pageerror", (e) => errors.push(String(e)))
    return { ctx, page, errors }
  }

  // ---- 1. /loadoff videos (public, no login) ----
  {
    const { ctx, page, errors } = await newPage()
    const resp = await page.goto(`${BASE}/loadoff`, { waitUntil: "networkidle2", timeout: 30000 })
    check(resp.status() === 200, `/loadoff answers 200 (got ${resp.status()})`)
    const hasSection = await page.evaluate(() => document.body.textContent.includes("Watch it run"))
    check(hasSection, "/loadoff has the 'Watch it run' section")
    const vids = await page.evaluate(async () => {
      const els = [...document.querySelectorAll("video")]
      for (const v of els) { v.preload = "auto"; v.load() }
      await new Promise((r) => setTimeout(r, 5000))
      return els.map((v) => ({
        src: (v.currentSrc || "").split("/").pop(),
        readyState: v.readyState,
        poster: !!v.getAttribute("poster"),
        duration: Number.isFinite(v.duration) ? Math.round(v.duration) : null,
      }))
    })
    check(vids.length === 3, `/loadoff embeds 3 videos (got ${vids.length}: ${vids.map((v) => v.src).join(", ")})`)
    for (const v of vids) {
      check(v.readyState >= 2, `video ${v.src} loads metadata+data (readyState ${v.readyState}, ${v.duration}s)`)
      check(v.poster, `video ${v.src} has a poster frame`)
    }
    const real = errors.filter((e) => !/favicon/.test(e))
    check(real.length === 0, `/loadoff console clean (${real.slice(0, 2).join(" | ") || "clean"})`)
    await shot(page, "loadoff-watch-it-run")
    await ctx.close()
  }

  // ---- 2. byte-range serving ----
  {
    const status = execSync(
      `curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-1023' ${BASE}/videos/tour-office.mp4`
    ).toString()
    check(status === "206", `tour-office.mp4 Range request answers 206 (got ${status})`)
  }

  // ---- 3. owner: help videos + settings index ----
  {
    const { ctx, page, errors } = await newPage()
    await login(page, "owner@demo.thind")
    const help = await page.goto(`${BASE}/hub/help`, { waitUntil: "networkidle2", timeout: 30000 })
    check(help.status() === 200, `/hub/help answers 200 as owner (got ${help.status()})`)
    const hasVids = await page.evaluate(() => document.body.textContent.includes("Video walkthroughs"))
    check(hasVids, "/hub/help has the 'Video walkthroughs' section")

    const settings = await page.goto(`${BASE}/hub/settings`, { waitUntil: "networkidle2", timeout: 30000 })
    check(settings.status() === 200, `/hub/settings answers 200 as owner (got ${settings.status()})`)
    const ownerCards = await page.evaluate(() =>
      [...document.querySelectorAll(".grid a[href^='/hub/settings/']")].map((a) => a.getAttribute("href"))
    )
    const ownerOnly = ["/hub/settings/users", "/hub/settings/integrations", "/hub/settings/branding"]
    check(
      ownerCards.length === 6 && ownerOnly.every((href) => ownerCards.includes(href)),
      `owner sees all 6 settings area cards incl. owner-only ones (got ${ownerCards.join(", ") || "none"})`
    )
    // authjs "Failed to fetch" right after login is a known cosmetic race — don't fail on it.
    const real = errors.filter((e) => !/favicon|Failed to fetch/.test(e))
    check(real.length === 0, `owner pages console clean (${real.slice(0, 2).join(" | ") || "clean"})`)
    await shot(page, "settings-index-owner")
    await ctx.close()
  }

  // ---- 4. accounting: settings index gating ----
  {
    const { ctx, page } = await newPage()
    await login(page, "accounting@demo.thind")
    const settings = await page.goto(`${BASE}/hub/settings`, { waitUntil: "networkidle2", timeout: 30000 })
    check(settings.status() === 200, `/hub/settings answers 200 as accounting (got ${settings.status()})`)
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll(".grid a[href^='/hub/settings/']")].map((a) => a.getAttribute("href"))
    )
    check(
      cards.length === 3 &&
        ["/hub/settings/packet", "/hub/settings/pricebook", "/hub/settings/app"].every((href) =>
          cards.includes(href)
        ),
      `accounting sees exactly packet + pricebook + app (got ${cards.join(", ") || "none"})`
    )
    await shot(page, "settings-index-accounting")
    await ctx.close()
  }

  await browser.close()

  if (failures.length) {
    console.log(`\n❌ ${failures.length} check(s) failed:`)
    for (const f of failures) console.log(`   - ${f}`)
    process.exit(1)
  }
  console.log("\n✅ showcase smoke passed")
}

await main()
