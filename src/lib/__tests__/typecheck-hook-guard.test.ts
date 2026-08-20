import { describe, expect, it } from "vitest"
import { readFileSync, statSync } from "node:fs"
import path from "node:path"
import {
  checkHookInstall,
  checkPrePushHook,
} from "../../../scripts/typecheck-hook-guard.mjs"

const REPO_ROOT = path.resolve(__dirname, "../../..")

const GOOD_HOOK = `#!/bin/sh
if [ "\${SKIP_TYPECHECK_GATE:-}" = "1" ]; then exit 0; fi
if ! node scripts/typecheck-gate.mjs; then
  exit 1
fi
`

// The shape this whole guard exists to prevent: a hook that looks like
// enforcement, prints a warning, and lets the push through anyway.
const WARN_ONLY_HOOK = `#!/bin/sh
node scripts/typecheck-gate.mjs || echo "typecheck gate failed (not blocking)"
exit 0
`

const WRONG_COMMAND_HOOK = `#!/bin/sh
if [ "\${SKIP_TYPECHECK_GATE:-}" = "1" ]; then exit 0; fi
npx tsc --noEmit || exit 1
`

const NO_BYPASS_HOOK = `#!/bin/sh
node scripts/typecheck-gate.mjs || exit 1
`

describe("checkPrePushHook", () => {
  it("accepts a hook that runs the gate, can be bypassed, and blocks on failure", () => {
    expect(checkPrePushHook(GOOD_HOOK)).toEqual({ ok: true, reasons: [] })
  })

  it("flags a warn-only hook that never fails the push", () => {
    const result = checkPrePushHook(WARN_ONLY_HOOK)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/never exits non-zero/)
  })

  it("flags a hook that calls tsc directly instead of the gate", () => {
    const result = checkPrePushHook(WRONG_COMMAND_HOOK)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/typecheck-gate\.mjs/)
  })

  it("flags a hook with no bypass — it could wedge the integrator drain", () => {
    const result = checkPrePushHook(NO_BYPASS_HOOK)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/SKIP_TYPECHECK_GATE/)
  })
})

describe("checkHookInstall", () => {
  it("accepts a prepare script that installs the hooks path", () => {
    expect(
      checkHookInstall({ scripts: { prepare: "node scripts/install-git-hooks.mjs" } }).ok,
    ).toBe(true)
  })

  it("flags a package.json with no prepare script", () => {
    const result = checkHookInstall({ scripts: { build: "next build" } })
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/prepare/)
  })

  it("flags a prepare script that does something unrelated", () => {
    const result = checkHookInstall({ scripts: { prepare: "npm run build" } })
    expect(result.ok).toBe(false)
  })
})

describe("the repo's own hook wiring", () => {
  it(".githooks/pre-push satisfies the guard", () => {
    const hook = readFileSync(path.join(REPO_ROOT, ".githooks/pre-push"), "utf8")
    expect(checkPrePushHook(hook)).toEqual({ ok: true, reasons: [] })
  })

  it(".githooks/pre-push is executable — git silently ignores a non-executable hook", () => {
    const mode = statSync(path.join(REPO_ROOT, ".githooks/pre-push")).mode
    expect(mode & 0o111).not.toBe(0)
  })

  it("package.json installs the hooks path on prepare", () => {
    const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"))
    expect(checkHookInstall(pkg)).toEqual({ ok: true, reasons: [] })
  })

  it("the gate the hook invokes still exists under that exact path", () => {
    expect(() =>
      statSync(path.join(REPO_ROOT, "scripts/typecheck-gate.mjs")),
    ).not.toThrow()
  })
})
