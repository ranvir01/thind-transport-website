/**
 * License policy, plus a standing guard over what is actually installed.
 *
 * The classifier tests pin the reasoning (OR lets us choose, AND does not;
 * weak copyleft is not strong copyleft). The audit test walks the real
 * dependency tree, so a `npm install` that drags in an AGPL package three
 * levels down fails here rather than in a lawyer's email.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  BANNED_UPSTREAM_PROJECTS,
  NEEDS_ATTRIBUTION,
  classifyLicense,
  spdxTerms,
} from "../license-policy"

describe("classifyLicense", () => {
  it("accepts the permissive licenses this repo runs on", () => {
    for (const license of ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "BSD-2-Clause", "0BSD", "MIT-0"]) {
      expect(classifyLicense(license), license).toBe("ok")
    }
  })

  it("bans the licenses that would reach our proprietary code", () => {
    for (const license of ["GPL-2.0", "GPL-3.0-only", "AGPL-3.0", "LGPL-2.1", "SSPL-1.0"]) {
      expect(classifyLicense(license), license).toBe("banned")
    }
  })

  it("treats file-level copyleft as its own verdict, not as banned", () => {
    // MPL-2.0 §3.3 explicitly permits combining with proprietary code. Calling
    // this "banned" would mean ripping out web-push for no legal reason.
    expect(classifyLicense("MPL-2.0")).toBe("weak")
    expect(classifyLicense("EPL-2.0")).toBe("weak")
    expect(classifyLicense("CDDL-1.0")).toBe("weak")
  })

  it("lets us take the permissive branch of a dual license", () => {
    expect(classifyLicense("(MIT OR GPL-2.0)")).toBe("ok")
    expect(classifyLicense("(MIT OR EUPL-1.1+)")).toBe("ok")
    expect(classifyLicense("Apache-2.0 OR MPL-2.0")).toBe("ok")
  })

  it("does not let AND be escaped the same way — every term binds", () => {
    expect(classifyLicense("MIT AND GPL-3.0")).toBe("banned")
    expect(classifyLicense("(MIT AND Zlib)")).toBe("ok") // both permissive
  })

  it("sends an unrecognized license to a human instead of guessing", () => {
    expect(classifyLicense("SEE LICENSE IN COPYING")).toBe("review")
    expect(classifyLicense("UNKNOWN")).toBe("review")
  })

  it("splits SPDX expressions on every operator", () => {
    expect(spdxTerms("(MIT OR Apache-2.0 AND BSD-3-Clause)")).toEqual([
      "MIT", "Apache-2.0", "BSD-3-Clause",
    ])
    expect(spdxTerms("Apache-2.0 WITH LLVM-exception")).toEqual(["Apache-2.0", "LLVM-exception"])
  })

  it("marks the notice-bearing licenses as needing attribution", () => {
    for (const license of ["Apache-2.0", "BSD-3-Clause", "MPL-2.0", "OFL-1.1", "CC-BY-4.0"]) {
      expect(NEEDS_ATTRIBUTION.test(license), license).toBe(true)
    }
    expect(NEEDS_ATTRIBUTION.test("MIT")).toBe(false)
    expect(NEEDS_ATTRIBUTION.test("ISC")).toBe(false)
  })
})

describe("the installed tree obeys the policy", () => {
  const root = process.cwd()

  it("has no strongly-copylefted production dependency", () => {
    // The audit script exits non-zero on a banned production package, so this
    // is the whole guard: if it throws, read its output.
    expect(() =>
      execFileSync("node", ["scripts/license-audit.mjs"], { cwd: root, encoding: "utf-8" })
    ).not.toThrow()
  })

  it("does not depend on any of the banned upstream projects", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"))
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ].map((n) => n.toLowerCase())
    for (const banned of BANNED_UPSTREAM_PROJECTS) {
      expect(names.some((n) => n.includes(banned)), `banned upstream: ${banned}`).toBe(false)
    }
  })

  it("ships a THIRD_PARTY_NOTICES.md that names the standing obligations", () => {
    const notices = path.join(root, "THIRD_PARTY_NOTICES.md")
    expect(existsSync(notices)).toBe(true)
    const text = readFileSync(notices, "utf-8")
    expect(text).toContain("proprietary")
    expect(text).toContain("Standing obligations")
    // The MPL package must be called out by name, with the rule that applies.
    expect(text).toContain("web-push")
    expect(text).toContain("never vendor-and-modify")
  })
})
