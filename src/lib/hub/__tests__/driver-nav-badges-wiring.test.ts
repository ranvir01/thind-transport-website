/**
 * DriverNav has rendered a Messages-tab badge for a while; nothing passed
 * `badges` so the count was always zero. The layout must reuse
 * listThreadsForDriver (carrier + driver + user) — the same unread definition
 * the inbox page already shows — and must not invent a second query.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LAYOUT_SOURCE = readFileSync(join(__dirname, "../../../app/hub/driver/layout.tsx"), "utf-8")
const NAV_SOURCE = readFileSync(join(__dirname, "../../../components/hub/driver/DriverNav.tsx"), "utf-8")

describe("driver layout wires Messages unread into DriverNav", () => {
  it("reuses listThreadsForDriver with carrier, driver, and user ids", () => {
    expect(LAYOUT_SOURCE).toMatch(/listThreadsForDriver/)
    expect(LAYOUT_SOURCE).toMatch(
      /listThreadsForDriver\(\s*user\.carrierId,\s*user\.driverId,\s*user\.id\s*\)/
    )
    expect(LAYOUT_SOURCE).not.toMatch(/FROM hub\.messages/)
  })

  it("passes the summed unread count on the Messages tab href", () => {
    expect(LAYOUT_SOURCE).toMatch(/badges=\{\{\s*["']\/hub\/driver\/messages["']:\s*unreadMessages/)
    expect(NAV_SOURCE).toMatch(/badges\?\.\[tab\.href\]/)
    expect(NAV_SOURCE).toMatch(/href:\s*["']\/hub\/driver\/messages["']/)
  })
})
