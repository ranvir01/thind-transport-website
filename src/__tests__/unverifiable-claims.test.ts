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

  // Second sweep, 2026-08-30. The owner reviewed every claim an eight-dimension
  // audit surfaced and confirmed which are real; these are the ones that are
  // not, plus the ones only a document can settle.
  { claim: "Veteran Priority", verifiedBy: "a written veteran hiring-preference policy" },
  { claim: "Full benefits package", verifiedBy: "the benefit plan documents themselves" },
  { claim: "Paid Time Off", verifiedBy: "a written PTO policy (owner: not offered as of 2026-08-30)" },
  { claim: "Paid Holidays", verifiedBy: "a written holiday-pay policy (owner: not offered)" },
  { claim: "Family Leave", verifiedBy: "a written leave policy (owner: not offered)" },
  { claim: "A+ safety rating", verifiedBy: "nothing — FMCSA issues Satisfactory/Conditional/Unsatisfactory, never a letter grade" },
  { claim: "Zero out-of-service violations", verifiedBy: "the SAFER inspection record, which is public and speaks for itself" },
  { claim: "we track and guarantee it", verifiedBy: "a home-time tracking mechanism that actually exists" },
  { claim: "instant approval", verifiedBy: "the fuel-card issuer's written terms" },
  { claim: "No credit checks for company drivers", verifiedBy: "the fuel-card issuer's written terms" },
  { claim: "In-House Shop", verifiedBy: "a shop lease and the technicians' certifications (owner: no in-house shop)" },
  { claim: "ASE-certified technicians", verifiedBy: "the technicians' ASE certificates" },
  { claim: "within 4 hours on average", verifiedBy: "measured roadside response times" },
  { claim: "cover all costs", verifiedBy: "a written breakdown-cost policy with its exclusions" },
  { claim: "15,000+ Locations", verifiedBy: "the fuel-card issuer's published network size" },
  { claim: "save hundreds per month", verifiedBy: "nothing — the calculator computes this from the driver's own gallons" },
  { claim: "top shippers", verifiedBy: "named shippers who agree to be named" },
  { claim: "Most companies offer 70-85%", verifiedBy: "a published industry survey, cited inline with its year" },

  // Third sweep, 2026-08-30.
  { claim: "Rider Program", verifiedBy: "a written rider policy (owner: decided case by case)" },
  { claim: "Pet Policy", verifiedBy: "a written pet policy (owner: decided case by case)" },
  { claim: "Highest commission in the industry", verifiedBy: "a published survey of carrier splits" },
  { claim: "Industry leading", verifiedBy: "a published survey; it was sitting in constants.ts" },
]

/**
 * The blind spot the substring list cannot see.
 *
 * The 08-30 audit found `"In-house mechanical support"` and `"DOT-compliant,
 * FMCSA safety-rated fleet"` on the HOMEPAGE — paraphrases of two claims the
 * list above already banned as `"In-House Shop"` and `"A+ safety rating"`.
 * Both walked straight past it, because a banned sentence is a fact about the
 * world, not about a string.
 *
 * So these match the *claim*, however it is worded. Each pattern is
 * deliberately narrow — it must not fire on the honest phrasings the site uses
 * now ("our regular shop", "read our record on FMCSA SAFER").
 */
const BANNED_CONCEPTS: { concept: string; pattern: RegExp; verifiedBy: string }[] = [
  {
    concept: "we operate our own repair shop",
    pattern: /\bin[- ]house\b[^.\n]{0,40}\b(shop|mechanic|maintenance|technician|garage)/i,
    verifiedBy: "a shop lease and the technicians' certifications (owner: no in-house shop)",
  },
  {
    concept: "FMCSA grades carriers and we scored well",
    pattern: /\bFMCSA[- ]?(safety[- ])?rated\b|\bsafety rating of\b|\b[A-F][+-]? safety rating\b/i,
    verifiedBy: "nothing — FMCSA issues Satisfactory / Conditional / Unsatisfactory, never a grade",
  },
  {
    concept: "a measured roadside response time",
    pattern: /\bwithin \d+ hours? on average\b|\b<\s*\d+\s*hr\b/i,
    verifiedBy: "measured response times from the dispatch log",
  },
  {
    concept: "an unqualified promise to cover breakdown costs",
    pattern: /\bcover all (costs|repairs|expenses)\b/i,
    verifiedBy: "a written breakdown-cost policy, including its exclusions",
  },
]

/**
 * Strip comments before matching.
 *
 * A removal is usually worth a comment saying what was removed and why — and
 * the first run of the concept patterns below failed on exactly that: the note
 * in `EquipmentSection.tsx` explaining that "FMCSA safety-rated" had been
 * deleted was itself a match. The ratchet is about what the site *says* to a
 * visitor, so it reads code and not the prose around it. A claim that survives
 * only inside a comment is a claim nobody ships.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

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
      const hits = files.filter((f) => withoutComments(readFileSync(f, "utf8")).includes(claim))
      expect(
        hits,
        `"${claim}" is back in:\n  ${hits.join("\n  ")}\n` +
          `It was removed as unverifiable. To restore it: obtain ${verifiedBy}, ` +
          `cite it in the commit message, and remove this entry in the same commit.`
      ).toEqual([])
    })
  }

  for (const { concept, pattern, verifiedBy } of BANNED_CONCEPTS) {
    it(`nothing claims "${concept}", in any wording`, () => {
      const hits = files
        .map((f) => {
          const match = withoutComments(readFileSync(f, "utf8")).match(pattern)
          return match ? `${f} — "${match[0]}"` : null
        })
        .filter(Boolean)
      expect(
        hits,
        `This claim is back, in a wording the literal list would not catch:\n  ${hits.join("\n  ")}\n` +
          `To make it, you need ${verifiedBy} — cited in the commit message, ` +
          `with this entry removed in the same commit.`
      ).toEqual([])
    })
  }
})
