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
 *      every area card in the page's AREAS list.
 *   4. Accounting: /hub/settings shows only the non-ownerOnly cards — the
 *      index must gate like the nav does.
 *
 * The expected card lists are parsed from the settings page's AREAS array
 * rather than hardcoded — this smoke went stale twice when an area was
 * added, and the counts here silently disagreed with the page.
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
import { execSync } from "node:child_process"
import { mkdirSync, readFileSync } from "node:fs"
import { BASE, failures, check, login, makeShot, realConsoleErrors, launchBrowser, waitForText } from "./e2e-lib.mjs"

/**
 * Single source of truth for the settings index: parse href + ownerOnly out
 * of the AREAS array in the page source. Each AREAS entry lists href first
 * and ownerOnly last, so a lazy match pairs them without a real TS parser.
 */
function settingsAreas() {
  const src = readFileSync(new URL("../src/app/hub/(office)/settings/page.tsx", import.meta.url), "utf-8")
  const areas = [...src.matchAll(/href:\s*"(\/hub\/settings\/[^"]+)"[\s\S]*?ownerOnly:\s*(true|false)/g)].map(
    (m) => ({ href: m[1], ownerOnly: m[2] === "true" })
  )
  if (areas.length < 3 || !areas.some((a) => a.ownerOnly)) {
    throw new Error(`could not parse AREAS from settings/page.tsx (got ${JSON.stringify(areas)})`)
  }
  return areas
}

const OUT = process.argv[2] ?? "e2e-shots-showcase"
mkdirSync(OUT, { recursive: true })
const shot = makeShot(OUT, { fullPage: false })

async function main() {
  const browser = await launchBrowser()

  async function newPage() {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    const errors = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.location().url ?? ""} ${m.text()}`) })
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
    const real = realConsoleErrors(errors)
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
    // Title "How to use LoadOff" is not the nav label "Help" — wait for it
    // before reading "Video walkthroughs" off the streamed body.
    await waitForText(page, "How to use LoadOff")
    const hasVids = await page.evaluate(() => document.body.textContent.includes("Video walkthroughs"))
    check(hasVids, "/hub/help has the 'Video walkthroughs' section")

    const settings = await page.goto(`${BASE}/hub/settings`, { waitUntil: "networkidle2", timeout: 30000 })
    check(settings.status() === 200, `/hub/settings answers 200 as owner (got ${settings.status()})`)
    // Title "Settings" is the users-page nav label — wait for the index subtitle.
    await waitForText(page, "Company configuration, connections, and shared documents.")
    const ownerCards = await page.evaluate(() =>
      [...document.querySelectorAll(".grid a[href^='/hub/settings/']")].map((a) => a.getAttribute("href"))
    )
    const allAreas = settingsAreas().map((a) => a.href)
    check(
      ownerCards.length === allAreas.length && allAreas.every((href) => ownerCards.includes(href)),
      `owner sees all ${allAreas.length} settings area cards (got ${ownerCards.join(", ") || "none"})`
    )
    // authjs "Failed to fetch" right after login is a known cosmetic race — don't fail on it.
    const real = realConsoleErrors(errors).filter((e) => !/Failed to fetch/.test(e))
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
    await waitForText(page, "Company configuration, connections, and shared documents.")
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll(".grid a[href^='/hub/settings/']")].map((a) => a.getAttribute("href"))
    )
    const shared = settingsAreas().filter((a) => !a.ownerOnly).map((a) => a.href)
    check(
      cards.length === shared.length && shared.every((href) => cards.includes(href)),
      `accounting sees exactly the non-owner cards (${shared.map((h) => h.split("/").pop()).join(" + ")}) ` +
        `(got ${cards.join(", ") || "none"})`
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
