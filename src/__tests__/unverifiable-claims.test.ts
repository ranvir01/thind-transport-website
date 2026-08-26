/**
 * No unverifiable marketing claims may ship.
 *
 * Four claims were removed from the site on 2026-08-04 under the owner's
 * no-fabricated-claims rule: the $1M+ liability-coverage credential, a
 * published on-time percentage, and the priority-processing /
 * immediate-orientation promises on the qualify flows. None was backed by a
 * verifiable source in this repo — and each is precisely the kind of specific,
 * checkable statement a broker or driver acts on and then holds against you.
 *
 * This test is the ratchet that keeps them out. It scans application source
 * for the literal claim strings and fails if any reappears. Restoring a claim
 * is deliberately a two-step act: bring the copy back AND delete its entry
 * here, in a commit that cites the document that verifies it (COI, measured
 * on-time data, a written orientation policy). If you cannot cite the source
 * in the commit message, the claim does not ship.
 *
 * The on-time percentage is additionally guarded by fmcsa-authority's
 * TRUST_FACTS test, which pins those fields to null.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const SRC = resolve(__dirname, "..")
const SELF = resolve(__dirname, "unverifiable-claims.test.ts")

const BANNED: { claim: string; verifiedBy: string }[] = [
  { claim: "$1M+ Liability Coverage", verifiedBy: "a current COI from the insurance agent" },
  { claim: "$1M+ Liability", verifiedBy: "a current COI from the insurance agent" },
  { claim: "Priority Application Processing", verifiedBy: "a written recruiting-office policy" },
  { claim: "priority application status", verifiedBy: "a written recruiting-office policy" },
  { claim: "Immediate Orientation", verifiedBy: "a written orientation schedule" },
  { claim: "Premium Equipment Assignment", verifiedBy: "a written equipment-assignment policy" },
  { claim: "A+ safety rating", verifiedBy: "an FMCSA safety rating letter (Satisfactory / Conditional / Unsatisfactory — FMCSA does not issue A+)" },
  { claim: "Highest commission in the industry", verifiedBy: "a sourced market survey, not a slogan" },
  { claim: "Industry leading!", verifiedBy: "a sourced market survey — slogans are banned in recruiting copy" },
  { claim: "founded in 2016", verifiedBy: "nothing — COMPANY_INFO.founded is 2014" },
  { claim: "Full benefits package", verifiedBy: "a benefits plan we actually carry (medical/dental/401k are not offered today)" },
  { claim: "highest paying trucking jobs", verifiedBy: "a sourced market survey — slogans are banned in recruiting copy" },
]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx)$/.test(entry) && full !== SELF) out.push(full)
  }
  return out
}

describe("unverifiable marketing claims stay out", () => {
  const files = sourceFiles(SRC)

  it("scans a real tree", () => {
    expect(files.length).toBeGreaterThan(400)
  })

  for (const { claim, verifiedBy } of BANNED) {
    it(`"${claim}" does not appear anywhere in src/`, () => {
      const hits = files.filter((f) => readFileSync(f, "utf8").includes(claim))
      expect(
        hits,
        `"${claim}" is back in:\n  ${hits.join("\n  ")}\n` +
          `It was removed as unverifiable. To restore it: obtain ${verifiedBy}, ` +
          `cite it in the commit message, and remove this entry in the same commit.`
      ).toEqual([])
    })
  }
})
