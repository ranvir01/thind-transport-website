/**
 * Driver PWA chrome must follow the carrier's accent color (--driver-accent)
 * instead of Thind's marketing gold, same regression class already guarded
 * for the customer portal (see portal-accent-tokens.test.ts). Fixed so far:
 * the persistent bottom-tab nav's active-tab color, the offline-sync "sending"
 * banner, the pay page's advance/settlement net amounts, and the home/more/
 * timeoff/messages/docs pages. The signup wizard's own copy promises
 * "Invoices, PDFs, and the driver app will use this color" — this suite
 * keeps that promise honest. See AGENTS.md's semantic-token doctrine.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LAYOUT_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/layout.tsx"), "utf-8")
const NAV_SOURCE = readFileSync(join(__dirname, "../../../components/hub/driver/DriverNav.tsx"), "utf-8")
const OFFLINE_SYNC_SOURCE = readFileSync(
  join(__dirname, "../../../components/hub/driver/OfflineSync.tsx"),
  "utf-8"
)
const PAY_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/pay/page.tsx"), "utf-8")
const HOME_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/page.tsx"), "utf-8")
const MORE_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/more/page.tsx"), "utf-8")
const TIMEOFF_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/timeoff/page.tsx"), "utf-8")
const MESSAGES_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/messages/page.tsx"), "utf-8")
const DOCS_PAGE_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/docs/page.tsx"), "utf-8")

describe("driver layout accent wiring", () => {
  it("sets --driver-accent from the carrier's resolved portal accent", () => {
    expect(LAYOUT_SOURCE).toMatch(/"--driver-accent":\s*accent\.text/)
    expect(LAYOUT_SOURCE).toMatch(/resolvePortalAccent/)
  })
})

describe("driver nav accent tokens", () => {
  it("the active bottom-tab label follows the carrier's accent color, not stock gold", () => {
    expect(NAV_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(NAV_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("offline sync accent tokens", () => {
  it("the 'sending' banner follows the carrier's accent color, not stock gold", () => {
    expect(OFFLINE_SYNC_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(OFFLINE_SYNC_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("pay page accent tokens", () => {
  it("advance and settlement net amounts follow the carrier's accent color, not stock gold", () => {
    expect(PAY_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(PAY_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("home page accent tokens", () => {
  it("the weather banner, last-pay amount, and HOS clock readouts follow the carrier's accent color, not stock gold", () => {
    expect(HOME_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(HOME_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("more page accent tokens", () => {
  it("the nav icon tiles and call-the-office button follow the carrier's accent color, not stock gold", () => {
    expect(MORE_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(MORE_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("time off page accent tokens", () => {
  it("the 'waiting on the office' status pill follows the carrier's accent color, not stock gold", () => {
    expect(TIMEOFF_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(TIMEOFF_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("messages page accent tokens", () => {
  it("the thread icon tile follows the carrier's accent color, not stock gold", () => {
    expect(MESSAGES_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(MESSAGES_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})

describe("docs page accent tokens", () => {
  it("the document icon follows the carrier's accent color, not stock gold", () => {
    expect(DOCS_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(DOCS_PAGE_SOURCE).toMatch(/var\(--driver-accent\)/)
  })
})
