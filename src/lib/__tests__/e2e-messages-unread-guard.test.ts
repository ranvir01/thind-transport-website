/**
 * Guard: e2e-messages-smoke must leave the office thread before the driver
 * replies.
 *
 * Regression (Tuesday nightly 34949769223, main@397b22b9): ChatThread polls
 * `router.refresh()` every 15s and `markThreadReadAction` runs whenever
 * `messages.length` changes. The smoke left the dispatcher sitting on the
 * open thread while the driver replied, so a poll that landed after the
 * insert marked the reply read. The office list then previewed the new
 * last_body with unread_count = 0 — "office list shows an unread badge for
 * the reply" failed, every other smoke that night passed.
 *
 * Product behaviour is correct (the office user is still looking at the
 * thread). The smoke has to unmount ChatThread first. This test locks that
 * order statically so we do not wait another nightly to notice a revert.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const SMOKE = path.join(process.cwd(), "scripts", "e2e-messages-smoke.mjs")

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith("//") && !t.startsWith("*")
    })
    .join("\n")
}

describe("e2e-messages-smoke leaves the office thread before the driver replies", () => {
  const src = codeOnly(readFileSync(SMOKE, "utf-8"))

  it("finds the office send and the driver reply (guard is not silently vacuous)", () => {
    expect(src.indexOf("sendChat(office, officeMarker)")).toBeGreaterThan(-1)
    expect(src.indexOf("sendChat(driver, driverMarker)")).toBeGreaterThan(
      src.indexOf("sendChat(office, officeMarker)")
    )
  })

  it("navigates the office page off the thread URL before sendChat(driver)", () => {
    const officeSend = src.indexOf("sendChat(office, officeMarker)")
    const driverSend = src.indexOf("sendChat(driver, driverMarker)")
    const between = src.slice(officeSend, driverSend)
    expect(between).toMatch(/office\.goto\(\s*`\$\{BASE\}\/hub\/messages`/)
  })
})
