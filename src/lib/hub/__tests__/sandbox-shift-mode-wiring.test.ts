/**
 * Drift guard for Shift Mode's soft kill. The flag is only as good as its
 * wiring, and the wiring is spread across three chromes plus two server
 * entry points — exactly the shape that rots silently. A layout that renders
 * the sandbox banner without resolving `sim.shift_mode` would leave the
 * ticker running with the flag off (the banner's prop now fails closed, so
 * the symptom would instead be Shift Mode never appearing — equally wrong,
 * equally quiet).
 *
 * Static source assertions, in the spirit of the repo's other drift tests
 * (see cron-route.test.ts): cheap, and they fail the moment someone adds a
 * fourth chrome without the flag.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { FLAG_REGISTRY } from "../flags"

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf-8")

const LAYOUTS = [
  "src/app/hub/(office)/layout.tsx",
  "src/app/hub/driver/layout.tsx",
  "src/app/hub/portal/layout.tsx",
]

describe("the flag exists and is sandbox-scoped ops", () => {
  it("sim.shift_mode is registered, defaults on, and is an ops flag", () => {
    expect(FLAG_REGISTRY["sim.shift_mode"]).toMatchObject({ type: "ops", defaultValue: true })
  })
})

describe("every chrome that mounts the banner resolves the flag", () => {
  for (const file of LAYOUTS) {
    it(`${file} passes sim= to SandboxBanner`, () => {
      const src = read(file)
      expect(src).toContain("SandboxBanner")
      expect(src, "must resolve the flag").toContain('getFlag("sim.shift_mode"')
      expect(src, "must pass it to the banner").toMatch(/sim=\{/)
    })
  }

  it("no other file mounts SandboxBanner without the flag", () => {
    // Catches a fourth chrome added later.
    const { execSync } = require("node:child_process") as typeof import("node:child_process")
    const hits = execSync(
      `grep -rl "<SandboxBanner" src --include=*.tsx || true`,
      { encoding: "utf-8" }
    )
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.endsWith("SandboxBanner.tsx"))
    expect(hits.sort()).toEqual(LAYOUTS.sort())
  })
})

describe("the banner fails closed", () => {
  it("sim defaults to false, so a caller that forgets cannot bypass the kill switch", () => {
    const src = read("src/components/hub/SandboxBanner.tsx")
    expect(src).toMatch(/sim = false/)
  })

  it("the ticker and the shift card are both behind it", () => {
    const src = read("src/components/hub/SandboxBanner.tsx")
    expect(src).toMatch(/\{sim \? <SimTicker \/> : null\}/)
    expect(src).toMatch(/const shiftSeat = sim &&/)
  })
})

describe("both server entry points enforce it", () => {
  it("the tick route checks the flag before doing any work", () => {
    const src = read("src/app/api/hub/sandbox/tick/route.ts")
    expect(src).toContain('getFlag("sim.shift_mode"')
    // Ordering: the free env check comes before the flag lookup.
    expect(src.indexOf("demoLoginEnabled()")).toBeLessThan(src.indexOf('getFlag("sim.shift_mode"'))
  })

  it("the shift actions check it too — a tab open when the flag flips must stand down", () => {
    const src = read("src/app/hub/_actions/sandbox-shift.ts")
    expect(src).toContain('getFlag("sim.shift_mode"')
    expect(src, "stand-down signal for an already-mounted card").toContain("off: true")
  })
})
