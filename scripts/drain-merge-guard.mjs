/**
 * Guard against the integrator→main drain regressing to a bare fast-forward
 * ref push.
 *
 * Learned 2026-07-19 (QA rig drive on main@5218a91): `git push origin
 * <integrator-sha>:refs/heads/main` lands the exact commit SHA Vercel already
 * built as an integrator-branch preview. Vercel dedupes deployments by SHA, so
 * the production alias can move with no new build ever queued — production
 * sat 194 commits stale while the drain kept reporting success. The fix is to
 * always drain via a brand-new `--no-ff` merge commit, a SHA Vercel has never
 * built. This module is the pre-merge catch so the drain workflows
 * (`.github/workflows/drain-integrator.yml`, `drain-fallback.yml`) never
 * quietly revert to the broken form.
 *
 * Shared by vitest (`src/lib/__tests__/drain-merge-guard.test.ts`).
 */

// A bare ref-to-ref push that moves main straight to another branch/SHA
// without ever creating a new commit — the pattern that hits Vercel's dedupe.
const RAW_REF_PUSH = /git push origin ["'`]?\$?\{?[\w./-]*\}?["'`]?:refs\/heads\/main/

const NO_FF_MERGE = /merge --no-ff/

/**
 * @param {string} workflowText raw contents of a drain workflow YAML file
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkDrainWorkflow(workflowText) {
  const reasons = []
  if (RAW_REF_PUSH.test(workflowText)) {
    reasons.push("uses a bare ref-to-branch push (git push origin <sha>:refs/heads/main) — this can land a SHA Vercel already built and skip production dedupe")
  }
  if (!NO_FF_MERGE.test(workflowText)) {
    reasons.push("missing a `merge --no-ff` step — the drain must always create a new commit")
  }
  return { ok: reasons.length === 0, reasons }
}
