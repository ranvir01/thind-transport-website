/**
 * Every pay figure the marketing site prints must be one `PAY_RATES` publishes.
 *
 * Three cleanup passes have now each found the same defect in a new place: a
 * dollar figure typed by hand, drifting away from `src/lib/constants.ts`, and
 * contradicting the page next to it. The 08-30 audit found `$65K-$280K` and
 * `$0.55-$0.60 CPM` on the homepage, `$2.25-$3.25` in the job dialog, and a
 * calculator headlining $309,375 a few hundred pixels below the card
 * publishing a $250K ceiling.
 *
 * Removing them one at a time has not worked, because nothing stops the next
 * one. This does: any per-mile or annual pay figure in marketing source has to
 * fall inside a published range, or be interpolated from the constant.
 *
 * Scope is the public marketing site. `/hub` is the operations product — it
 * prints real money from the database and has nothing to do with these ranges.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { PAY_RATES } from "@/lib/constants"

const SRC = resolve(__dirname, "..")

/** "$150K-$250K" → [150000, 250000]; "$0.63" → [0.63, 0.63]. */
function bounds(range: string): [number, number] {
  const nums = range.match(/\d+(?:\.\d+)?/g)!.map(Number)
  const scale = range.includes("K") ? 1000 : 1
  return [nums[0] * scale, (nums[1] ?? nums[0]) * scale]
}

const perMile = [
  bounds(PAY_RATES.companyDriver.local.perMile),
  bounds(PAY_RATES.companyDriver.regional.perMile),
  bounds(PAY_RATES.companyDriver.otr.perMile),
  bounds(PAY_RATES.ownerOperator.perMile),
]

const annual = [
  bounds(PAY_RATES.companyDriver.local.annual),
  bounds(PAY_RATES.companyDriver.regional.annual),
  bounds(PAY_RATES.companyDriver.otr.annual),
  bounds(PAY_RATES.ownerOperator.annualGross),
]

/** Inside any published range, with a little slack for rounded copy. */
const covered = (value: number, ranges: [number, number][], slack = 0.02) =>
  ranges.some(([lo, hi]) => value >= lo * (1 - slack) && value <= hi * (1 + slack))

function marketingFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue
    const full = join(dir, entry)
    // /hub and the driver PWA print real money, not published ranges.
    if (/(^|\/)(hub|driver|driver-form|__tests__)$/.test(full)) continue
    if (statSync(full).isDirectory()) out.push(...marketingFiles(full))
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

describe("published pay figures", () => {
  const files = marketingFiles(SRC)

  it("scans the marketing tree", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it("prints no annual figure outside a PAY_RATES range", () => {
    const offenders: string[] = []
    for (const file of files) {
      // $57K, $82K, $250K — the shorthand the site writes annual pay in.
      for (const [match, digits] of strip(readFileSync(file, "utf8")).matchAll(/\$(\d{2,3})K\b/g)) {
        if (!covered(Number(digits) * 1000, annual)) {
          offenders.push(`${file.replace(SRC, "src")} — ${match}`)
        }
      }
    }
    expect(
      offenders,
      `These annual figures are outside every range PAY_RATES publishes:\n  ${offenders.join("\n  ")}\n` +
        `Either interpolate the constant, or change the constant if the pay changed.`
    ).toEqual([])
  })

  it("prints no per-mile figure outside a PAY_RATES range", () => {
    const offenders: string[] = []
    for (const file of files) {
      // Only figures the copy itself calls a per-mile rate. `$0.30-$0.75` in
      // the fuel FAQ is a discount per GALLON, and diesel prices come from
      // MARKET_DATA — neither is pay, and neither belongs in this range.
      const text = strip(readFileSync(file, "utf8"))
      for (const [match, digits] of text.matchAll(/\$(\d\.\d{2})(?=[^\n]{0,40}?(?:\/\s*mi\b|\/\s*mile|per mile|\bCPM\b))/gi)) {
        const value = Number(digits)
        if (!covered(value, perMile)) {
          offenders.push(`${file.replace(SRC, "src")} — ${match}`)
        }
      }
    }
    expect(
      offenders,
      `These per-mile figures are outside every range PAY_RATES publishes:\n  ${offenders.join("\n  ")}\n` +
        `Either interpolate the constant, or change the constant if the pay changed.`
    ).toEqual([])
  })
})
