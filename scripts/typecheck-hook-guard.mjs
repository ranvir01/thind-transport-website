/**
 * typecheck-hook-guard.mjs — keep the pre-push typecheck gate wired up.
 *
 * The gap this closes (backlog item, 2026-08-20): `npm run typecheck:gate` is
 * not part of `npm run build`. The verify chain every routine prompt spells out
 * is `npm run build && npx vitest run`, and vitest transpiles with esbuild
 * without typechecking — so a test-file type error passes both commands and
 * lands on `main`. `.github/workflows/drain-integrator.yml` does run the gate,
 * but Routine 1 agents drain by hand and never touch the Action, so it is not
 * the backstop it appears to be.
 *
 * The fix is a repo-local `.githooks/pre-push` hook, installed by the
 * `prepare` lifecycle script (zero new dependencies — husky does exactly this
 * `core.hooksPath` trick and is not worth a dependency here).
 *
 * This module is the guard on the guard, in the same shape as
 * drain-merge-guard.mjs: pure functions over file text, unit-tested with inline
 * fixtures and re-run against the real repo files. Wiring that silently comes
 * undone (a `prepare` script dropped in a merge, a hook that stops invoking the
 * gate) fails a test instead of quietly disarming the gate.
 *
 * Shared by vitest (`src/lib/__tests__/typecheck-hook-guard.test.ts`).
 *
 * A second gap (same day): Cursor / Claude agent images install with
 * `npm ci --ignore-scripts`, so `prepare` never runs and the hook never
 * arms. The routine preambles (`docs/cursor-agent-preamble.md`,
 * `docs/claude-routine-preamble.md`) must tell agents to run
 * `npm run hooks:install` at the start of every run — otherwise the
 * ignore-scripts path stays unprotected between drains.
 */

// The hook must actually invoke the gate — not `tsc` directly, which skips the
// app/test split and the ratchet messaging.
const INVOKES_GATE = /scripts\/typecheck-gate\.mjs/

// A hook that cannot be bypassed can wedge the integrator drain, and main
// staying deployable outranks this gate. `git push --no-verify` is always
// available, but an explicit env bypass keeps the escape hatch discoverable
// from the hook's own failure message.
const HAS_BYPASS = /SKIP_TYPECHECK_GATE/

// A non-zero exit is the only thing that actually blocks a push.
const BLOCKS_ON_FAILURE = /exit 1/

/**
 * @param {string} hookText raw contents of .githooks/pre-push
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkPrePushHook(hookText) {
  const reasons = []
  if (!INVOKES_GATE.test(hookText)) {
    reasons.push("does not run scripts/typecheck-gate.mjs — the hook is decorative unless it invokes the gate")
  }
  if (!HAS_BYPASS.test(hookText)) {
    reasons.push("has no SKIP_TYPECHECK_GATE bypass — a hook that cannot be bypassed can wedge the integrator drain")
  }
  if (!BLOCKS_ON_FAILURE.test(hookText)) {
    reasons.push("never exits non-zero — a pre-push hook only blocks a push by failing")
  }
  return { ok: reasons.length === 0, reasons }
}

/**
 * The hook only runs if git is pointed at `.githooks`, and a fresh clone is
 * not. `prepare` runs on `npm install` and is the standard place to do it.
 *
 * @param {object} packageJson parsed package.json
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkHookInstall(packageJson) {
  const reasons = []
  const prepare = packageJson?.scripts?.prepare ?? ""
  if (!/install-git-hooks|hooks:install|core\.hooksPath/.test(prepare)) {
    reasons.push("package.json has no `prepare` script installing the hooks path — a fresh clone would never run .githooks/pre-push")
  }
  return { ok: reasons.length === 0, reasons }
}

/**
 * Agents that `npm ci --ignore-scripts` never run `prepare`. The pasted
 * routine preambles are the only start-of-run checklist those agents follow,
 * so they must mention `hooks:install`.
 *
 * @param {string} preambleText raw contents of a routine preamble
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkPreambleArmsHook(preambleText) {
  const reasons = []
  if (!/hooks:install/.test(preambleText)) {
    reasons.push(
      "preamble does not mention hooks:install — agents using npm ci --ignore-scripts never arm .githooks/pre-push",
    )
  }
  return { ok: reasons.length === 0, reasons }
}
