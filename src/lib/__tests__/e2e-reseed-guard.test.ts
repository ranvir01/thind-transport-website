/**
 * State-consuming smokes that historically omitted reseed() inherit a dirty
 * DB when run in isolation or via e2e-run-all (sorted name order). Office
 * smoke failed at the recurring-task step on a dirty board and passed
 * immediately after seed:demo. These three were the leftover holdouts.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const SCRIPTS = [
  "e2e-dvir-smoke.mjs",
  "e2e-recruiting-smoke.mjs",
  "e2e-ifta-smoke.mjs",
]

describe("state-consuming smokes reseed themselves", () => {
  it.each(SCRIPTS)("%s calls reseed()", (file) => {
    const src = readFileSync(path.join(process.cwd(), "scripts", file), "utf-8")
    expect(src, `${file} must import reseed from e2e-lib`).toMatch(/reseed/)
    expect(src, `${file} must call reseed() before launching`).toMatch(/^\s*reseed\(\)/m)
  })
})
