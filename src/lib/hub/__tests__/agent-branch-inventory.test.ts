import { describe, it, expect, afterAll } from "vitest"
import { mkdtempSync, writeFileSync, symlinkSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
// @ts-expect-error — plain .mjs fleet script, no type declarations
import { countUnpickedFromCherry, isCliEntry, buildInventory } from "../../../../scripts/agent-branch-inventory.mjs"

/**
 * git cherry polarity: "+" = commit NOT in upstream (unpicked work the
 * integrator must merge), "-" = patch-equivalent commit already landed.
 * Regression: the inventory once counted "-" as unpicked, so the integrator
 * re-merged already-landed branches and hid genuinely new session branches.
 */
describe("countUnpickedFromCherry", () => {
  it("counts + lines (not yet on main) as unpicked", () => {
    expect(countUnpickedFromCherry("+ abc123")).toBe(1)
    expect(countUnpickedFromCherry("+ abc123\n+ def456")).toBe(2)
  })

  it("does not count - lines (already picked to main)", () => {
    expect(countUnpickedFromCherry("- abc123")).toBe(0)
    expect(countUnpickedFromCherry("- abc123\n- def456")).toBe(0)
  })

  it("mixed output counts only the + lines", () => {
    expect(countUnpickedFromCherry("- landed1\n+ fresh1\n- landed2\n+ fresh2\n+ fresh3")).toBe(3)
  })

  it("empty output means nothing unpicked", () => {
    expect(countUnpickedFromCherry("")).toBe(0)
  })
})

/**
 * Regression: the CLI-entry guard was `import.meta.url === new URL("file://" + argv[1]).href`.
 * Node realpaths the main module, so under a symlinked checkout the guard
 * mismatched, main() never ran, --json printed nothing, and agent:status
 * swallowed the empty parse to "Pending: 0" while agent:branches showed 200+.
 */
describe("isCliEntry", () => {
  const dir = mkdtempSync(join(tmpdir(), "inv-guard-"))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it("matches when argv[1] is the module's own path", () => {
    const script = join(dir, "tool.mjs")
    writeFileSync(script, "")
    expect(isCliEntry(script, pathToFileURL(realpathSync(script)).href)).toBe(true)
  })

  it("matches when argv[1] is a symlink to the module (Node realpaths import.meta.url)", () => {
    const real = join(dir, "real.mjs")
    const link = join(dir, "link.mjs")
    writeFileSync(real, "")
    symlinkSync(real, link)
    const metaUrl = pathToFileURL(realpathSync(real)).href
    expect(isCliEntry(link, metaUrl)).toBe(true)
  })

  it("rejects a different module and a missing argv[1]", () => {
    const script = join(dir, "other.mjs")
    writeFileSync(script, "")
    expect(isCliEntry(script, pathToFileURL(join(dir, "not-me.mjs")).href)).toBe(false)
    expect(isCliEntry(undefined, pathToFileURL(script).href)).toBe(false)
  })
})

describe("buildInventory export", () => {
  it("is importable by agent-loop-status (no --json subprocess round-trip)", () => {
    expect(typeof buildInventory).toBe("function")
  })
})
