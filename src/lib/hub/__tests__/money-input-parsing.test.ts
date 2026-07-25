/**
 * Money input parsing is consolidated on dollarsToCents (AGENTS.md: user
 * input goes through dollarsToCents). import.ts, dvir.ts, and recruiting.ts
 * previously inlined Math.round(parseMoney(x) * 100); these tests pin (1)
 * that the two forms agree on every representative CSV/form input, so the
 * consolidation is behavior-identical, and (2) that no server action inlines
 * the old form again.
 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseMoney } from "../csv"
import { dollarsToCents } from "../types"

const INPUTS: (string | undefined)[] = [
  "1234.56",
  "$1,234.56",
  "  $ 2,000 ",
  "0",
  "0.00",
  "0.005",
  "19.99",
  "-25.50",
  "$-25.50",
  "3",
  "1e3", // exponent stripped to "13" by both parsers — agreement is what matters
  "",
  undefined,
  "n/a",
  "free",
]

describe("dollarsToCents replaces Math.round(parseMoney(x) * 100)", () => {
  for (const input of INPUTS) {
    it(`agrees with the legacy form for ${JSON.stringify(input)}`, () => {
      expect(dollarsToCents(input)).toBe(Math.round(parseMoney(input) * 100))
    })
  }

  it("keeps a legitimately free $0.00 as 0 cents", () => {
    expect(dollarsToCents("0.00")).toBe(0)
  })

  it("rounds a half-cent half away from zero, not toward +Infinity (bare Math.round bug)", () => {
    // -12.345 * 100 = -1234.5: Math.round ties toward +Infinity and gives -1234
    // (one cent short of the true magnitude); the house convention
    // (roundHalfAwayFromZero, same as the positive case below) gives -1235.
    expect(dollarsToCents("-12.345")).toBe(-1235)
    expect(dollarsToCents("12.345")).toBe(1235)
  })
})

describe("no server action inlines Math.round(parseMoney(...) * 100)", () => {
  const actionsDir = join(__dirname, "../../../app/hub/_actions")
  for (const file of readdirSync(actionsDir).filter((f) => f.endsWith(".ts"))) {
    it(`${file} parses money through dollarsToCents`, () => {
      const source = readFileSync(join(actionsDir, file), "utf8")
      expect(source).not.toMatch(/Math\.round\(\s*parseMoney\(/)
    })
  }
})
