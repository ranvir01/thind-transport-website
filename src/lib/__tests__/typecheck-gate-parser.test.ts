/**
 * scripts/typecheck-gate.mjs is the gate that says "application code must have
 * ZERO tsc errors", and drain-integrator.yml runs it before publishing to main.
 *
 * Its diagnostic parser captured the file path with `[^(]+` — a class that
 * excludes an opening parenthesis. Next.js route groups are literal
 * parentheses in the path (src/app/hub/(office)/...), so every diagnostic in
 * that directory failed to match the line at all and was counted as neither an
 * application error nor a test error. 76 of the app's 807 source files — the
 * entire office route group, which is most of the hub — were invisible to a
 * gate whose whole purpose is to see them.
 *
 * Found by introducing a real error there (a missing `cn` import) and watching
 * the gate report "application code: 0 error(s) ✅" while `tsc` reported it and
 * `next build` refused to compile.
 */
import { describe, expect, it } from "vitest"
// Resolvable without a @ts-expect-error: the script now exports a plain
// JSDoc-typed function, so tsc infers it.
import { parseDiagnostics } from "../../../scripts/typecheck-gate.mjs"

interface Diag {
  file: string
  line: number
  message: string
}

const parse = (s: string): Diag[] => parseDiagnostics(s) as Diag[]

describe("typecheck-gate diagnostic parser", () => {
  it("sees a diagnostic inside a Next.js route group", () => {
    const out = "src/app/hub/(office)/reports/owner/page.tsx(222,30): error TS2304: Cannot find name 'cn'."
    const [d] = parse(out)
    expect(d).toBeTruthy()
    expect(d.file).toBe("src/app/hub/(office)/reports/owner/page.tsx")
    expect(d.line).toBe(222)
    expect(d.message).toContain("TS2304")
  })

  it("still parses an ordinary path", () => {
    const [d] = parse("src/lib/hub/invoices.ts(64,12): error TS2345: Argument of type 'x'.")
    expect(d.file).toBe("src/lib/hub/invoices.ts")
    expect(d.line).toBe(64)
  })

  it("classifies route-group app files as application code, not tests", () => {
    const out = [
      "src/app/hub/(office)/money/page.tsx(10,1): error TS2304: Cannot find name 'a'.",
      "src/lib/hub/__tests__/foo.test.ts(3,1): error TS2304: Cannot find name 'b'.",
    ].join("\n")
    const diags = parse(out)
    expect(diags).toHaveLength(2)
    const isTest = (f: string) => f.includes("__tests__/") || f.endsWith(".test.ts")
    expect(diags.filter((d) => !isTest(d.file)).map((d) => d.file)).toEqual([
      "src/app/hub/(office)/money/page.tsx",
    ])
  })

  it("handles several route-group segments in one path", () => {
    const [d] = parse("src/app/(marketing)/(legal)/privacy/page.tsx(1,1): error TS1005: ';' expected.")
    expect(d.file).toBe("src/app/(marketing)/(legal)/privacy/page.tsx")
    expect(d.line).toBe(1)
  })

  it("anchors on the LAST (line,col) pair, not the first parenthesis", () => {
    // The greedy match must not stop at "(office)" and treat it as the location.
    const [d] = parse("src/app/hub/(office)/a/page.tsx(9,4): error TS2554: Expected 1 arguments, but got 2.")
    expect(d.line).toBe(9)
    expect(d.file.endsWith("page.tsx")).toBe(true)
  })

  it("ignores summary lines and noise", () => {
    const out = [
      "",
      "Found 3 errors in 2 files.",
      "src/lib/hub/db.ts(1,1): error TS2304: Cannot find name 'x'.",
      "  Errors  Files",
    ].join("\n")
    expect(parse(out)).toHaveLength(1)
  })

  it("does not match a path outside src/", () => {
    expect(parse("node_modules/foo/index.d.ts(1,1): error TS2304: nope.")).toHaveLength(0)
  })
})
