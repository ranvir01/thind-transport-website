import { describe, it, expect } from "vitest"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { pendingMismatchWarning } from "../../../../scripts/agent-loop-status.mjs"

/**
 * Regression: agent:status once reported "Pending claude/* branches: 0" while
 * agent:branches listed 200+, because the status script shelled out to the
 * inventory's --json mode and a swallowed parse failure defaulted to 0. The
 * status script now imports buildInventory directly, reports failures as
 * UNKNOWN, and cross-checks a claimed 0 against git's ancestry view.
 */
describe("pendingMismatchWarning", () => {
  it("warns when inventory says 0 pending but branches are unmerged by ancestry", () => {
    const warning = pendingMismatchWarning(0, 217)
    expect(warning).toMatch(/217 claude\/\* branch/)
    expect(warning).toMatch(/agent:branches/)
  })

  it("stays quiet when 0 pending matches 0 unmerged", () => {
    expect(pendingMismatchWarning(0, 0)).toBeNull()
  })

  it("stays quiet when pending work is reported (no mismatch to flag)", () => {
    expect(pendingMismatchWarning(349, 429)).toBeNull()
    expect(pendingMismatchWarning(1, 0)).toBeNull()
  })
})
