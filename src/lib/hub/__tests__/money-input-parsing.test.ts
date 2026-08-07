/**
 * Money input parsing is consolidated on dollarsToCents (AGENTS.md: user
 * input goes through dollarsToCents). import.ts, dvir.ts, and recruiting.ts
 * previously inlined Math.round(parseMoney(x) * 100); these tests pin (1)
 * that the two forms agree on every representative CSV/form input, so the
 * consolidation is behavior-identical, and (2) that no server action inlines
 * the old form again.
 *
 * The integration adapters and the rate-con parser don't call parseMoney (they
 * round an already-parsed number instead of a raw string), so they can't inline
 * the parseMoney form the section above guards — but they can inline a bare
 * Math.round(x * 100) instead of the house rounding convention
 * (roundHalfAwayFromZero), which was a real bug (dollarsToCents itself did this
 * until the money-math audit fixed it: see money-input-parsing's half-cent
 * test above). The section below guards those files against the same relapse.
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

  it("keeps the half-cent tie when binary-float multiply drifts LOW (2026-08 money-math audit)", () => {
    // 1.005 * 100 = 100.49999999999999 in IEEE-754, so a bare float multiply
    // loses the tie entirely and rounds DOWN — the earlier half-cent tests only
    // covered inputs whose drift happened to land high (12.345 * 100 →
    // 1234.5000000000002). The decimal the user typed is 100.5 cents, and the
    // house convention rounds it away from zero.
    expect(dollarsToCents("1.005")).toBe(101)
    expect(dollarsToCents("-1.005")).toBe(-101)
    expect(dollarsToCents(1.005)).toBe(101)
    // Common trucking forms of the same tie: 61.5 cpm and a half-cent total.
    expect(dollarsToCents("0.615")).toBe(62)
    expect(dollarsToCents("2.675")).toBe(268)
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

describe("no bare Math.round(x * 100) money rounding outside the house convention", () => {
  const files = [
    "../integrations/comdata.ts",
    "../integrations/dat.ts",
    "../integrations/truckstop.ts",
    "../parser.ts",
    "../fuel.ts",
    "../pay-rules.ts",
    "../../../components/hub/PayRulesPanel.tsx",
  ]
  for (const file of files) {
    it(`${file} rounds money cents through roundHalfAwayFromZero, not a bare Math.round`, () => {
      const source = readFileSync(join(__dirname, file), "utf8")
      expect(source).not.toMatch(/Math\.round\([^)]*\*\s*100\)/)
    })
  }
})
