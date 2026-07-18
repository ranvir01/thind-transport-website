import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
// @ts-expect-error — plain .mjs script module without type declarations
import { parsePendingCount } from "../../../scripts/agent-loop-status.mjs"

const scriptsDir = path.resolve(__dirname, "../../../scripts")

describe("parsePendingCount", () => {
  it("counts pending branches from valid inventory JSON", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }, { branch: "b" }] })
    expect(parsePendingCount(raw)).toEqual({ count: 2, error: null })
  })

  it("reports zero only when the pending array is genuinely empty", () => {
    const raw = JSON.stringify({ integrator: "x", main: "y", pending: [] })
    expect(parsePendingCount(raw)).toEqual({ count: 0, error: null })
  })

  it("surfaces truncated JSON as an error, never as 0", () => {
    // Regression: agent:status once reported "Pending: 0" while agent:branches
    // showed 217, because the piped inventory JSON was cut off mid-payload and
    // the parse failure was swallowed to 0.
    const full = JSON.stringify({ integrator: "x", main: "y", pending: [{ branch: "a" }] }, null, 2)
    const truncated = full.slice(0, Math.floor(full.length / 2))
    const result = parsePendingCount(truncated)
    expect(result.count).toBeNull()
    expect(result.error).toMatch(/parse failed/)
  })

  it("surfaces empty output and missing pending[] as errors", () => {
    expect(parsePendingCount("").count).toBeNull()
    expect(parsePendingCount("   ").count).toBeNull()
    expect(parsePendingCount(JSON.stringify({ integrator: "x" })).count).toBeNull()
  })
})

describe("agent-branch-inventory --json stdout flushing", () => {
  it("does not process.exit() in the --json branch (exit truncates piped stdout)", () => {
    // Behavioral fix lives in agent-branch-inventory.mjs: large console.log
    // writes to a pipe are async, so process.exit() right after printing the
    // JSON cut it off at the pipe buffer. Guard the source so it doesn't creep back.
    const src = readFileSync(path.join(scriptsDir, "agent-branch-inventory.mjs"), "utf-8")
    const jsonBranch = src
      .slice(src.indexOf("if (json)"), src.indexOf("console.log(\"LoadOff agent branch inventory\")"))
      .replace(/^\s*\/\/.*$/gm, "")
    expect(jsonBranch.length).toBeGreaterThan(0)
    expect(jsonBranch).not.toMatch(/process\.exit/)
  })

  it("a large piped JSON payload arrives complete when the process exits naturally", () => {
    // Same failure shape as the real bug, reproduced with a minimal child:
    // ~1MB JSON printed via console.log, natural exit → pipe must receive it all.
    const child = [
      "const rows = Array.from({ length: 5000 }, (_, i) => ({ branch: `claude/b${i}`, files: 'x'.repeat(200) }))",
      "console.log(JSON.stringify({ pending: rows }))",
    ].join("\n")
    const out = execFileSync(process.execPath, ["-e", child], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    })
    expect(parsePendingCount(out)).toEqual({ count: 5000, error: null })
  })
})
