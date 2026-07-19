import { describe, expect, it } from "vitest"
import { evaluateStaleness } from "../../../../scripts/prod-smoke.mjs"

const MAIN = "a".repeat(40)
const OLD = "b".repeat(40)

describe("evaluateStaleness (prod SHA vs origin/main)", () => {
  it("passes when production runs origin/main's tip", () => {
    const v = evaluateStaleness({ prodSha: MAIN, mainSha: MAIN, tipAgeMinutes: 500 })
    expect(v.status).toBe("current")
    expect(v.detail).toContain(MAIN.slice(0, 7))
  })

  it("alarms on a mismatch once origin/main's tip is past the grace window", () => {
    const v = evaluateStaleness({ prodSha: OLD, mainSha: MAIN, behindCount: 194, tipAgeMinutes: 60 })
    expect(v.status).toBe("stale")
    expect(v.detail).toContain("194 commits behind")
    expect(v.detail).toContain("--no-ff")
  })

  it("gives a fresh main tip grace — the deploy is likely still building", () => {
    const v = evaluateStaleness({ prodSha: OLD, mainSha: MAIN, tipAgeMinutes: 5 })
    expect(v.status).toBe("grace")
  })

  it("honors a custom grace window", () => {
    expect(evaluateStaleness({ prodSha: OLD, mainSha: MAIN, tipAgeMinutes: 25, graceMinutes: 30 }).status).toBe("grace")
    expect(evaluateStaleness({ prodSha: OLD, mainSha: MAIN, tipAgeMinutes: 25, graceMinutes: 15 }).status).toBe("stale")
  })

  it("treats a mismatch with unknown tip age as stale — lookup errors must not hide the alarm", () => {
    const v = evaluateStaleness({ prodSha: OLD, mainSha: MAIN, tipAgeMinutes: null })
    expect(v.status).toBe("stale")
    expect(v.detail).toContain("unknown age")
  })

  it("treats a missing /api/version as stale after grace (deployment predates the check)", () => {
    const v = evaluateStaleness({ prodSha: null, mainSha: MAIN, tipAgeMinutes: 120 })
    expect(v.status).toBe("stale")
    expect(v.detail).toContain("/api/version")
  })

  it("gives a missing /api/version grace while the endpoint's own commit may still be deploying", () => {
    const v = evaluateStaleness({ prodSha: null, mainSha: MAIN, tipAgeMinutes: 3 })
    expect(v.status).toBe("grace")
  })

  it("is inconclusive when origin/main itself cannot be resolved", () => {
    const v = evaluateStaleness({ prodSha: OLD, mainSha: null, tipAgeMinutes: null })
    expect(v.status).toBe("inconclusive")
  })

  it("words a one-commit lag in the singular", () => {
    const v = evaluateStaleness({ prodSha: OLD, mainSha: MAIN, behindCount: 1, tipAgeMinutes: 60 })
    expect(v.detail).toContain("1 commit behind")
  })
})
