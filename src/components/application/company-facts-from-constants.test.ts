/**
 * Company facts on the lead-capture surfaces must come from
 * src/lib/constants.ts, never literals (AGENTS.md non-negotiable).
 *
 * Found 2026-07-26 on the conversion path: the pre-qualify success card
 * promised EVERY qualified driver the "$2,500 Sign-On Bonus" — but per
 * PAY_RATES that's the owner-operator bonus; company drivers get
 * "$1,000 (First Year)". A company driver walking into orientation on a
 * $2,500 promise is a broken-trust churn risk, the exact thing the
 * driver-recruitment-conversion skill's "proof of legitimacy" rule exists
 * to prevent. The card also hardcoded the recruiting phone number.
 *
 * Like lead-form-autofill.test.ts, a regression here is invisible to E2E
 * (the page renders fine with a wrong number in it), so we assert the
 * source directly.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), "utf8")

const preQualify = read("./PreQualificationForm.tsx")
const apply = read("./ApplicationForm.tsx")

describe("pre-qualify success card sources company facts from constants", () => {
  it("carries no hardcoded phone number (tel: links go through COMPANY_INFO)", () => {
    expect(preQualify).not.toMatch(/tel:\+?1?206/)
    expect(preQualify).not.toContain("765-6300")
    expect(preQualify).toContain("tel:${COMPANY_INFO.phoneFormatted}")
  })

  it("carries no hardcoded sign-on bonus dollar amounts", () => {
    expect(preQualify).not.toContain("$2,500")
    expect(preQualify).not.toContain("$1,000")
  })

  it("promises the bonus for the driver's actual track (O/O vs company)", () => {
    expect(preQualify).toContain("PAY_RATES.ownerOperator.signOnBonus")
    expect(preQualify).toContain("PAY_RATES.companyDriver.signOnBonus")
    // the track decision is keyed off the sleeper-truck answer, not guessed
    expect(preQualify).toMatch(/ownSleeperTruck\s*===\s*"Yes"/)
  })
})

describe("apply form sources company facts from constants", () => {
  it("carries no hardcoded phone number anywhere (incl. error toasts)", () => {
    expect(apply).not.toMatch(/tel:\+?1?206/)
    expect(apply).not.toContain("765-6300")
  })
})
