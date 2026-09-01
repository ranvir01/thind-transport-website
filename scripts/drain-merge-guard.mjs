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
 * built. This module is the pre-merge catch so the drain workflow
 * (`.github/workflows/drain-integrator.yml`) never quietly reverts to the
 * broken form. The test discovers `.github/workflows/*drain*` rather than
 * naming files: `main-drain-fallback.yml` shipped the broken form for months
 * because it was never added to a hand-maintained list.
 *
 * Learned again 2026-07-19 (QA rig drive on main@11c9be2): a --no-ff merge
 * commit alone is still not enough. Its tree is byte-identical to the
 * integrator tip Vercel already built as a preview, and Vercel's dedupe keys
 * on content as well as commit SHA — the first --no-ff drain produced no
 * deployment at all. The drain commit must also write `.drain-stamp` so every
 * drain carries a tree Vercel has never built.
 *
 * Shared by vitest (`src/lib/__tests__/drain-merge-guard.test.ts`).
 */

// A bare ref-to-ref push that moves main straight to another branch/SHA
// without ever creating a new commit — the pattern that hits Vercel's dedupe.
//
// Match anything up to the refspec rather than trying to spell out the source
// ref. The previous `[\w./-]*` character class could not express the spaces or
// braces in `${{ steps.gate.outputs.sha }}`, so the guard reported ok on
// main-drain-fallback.yml — the one file in the repo that actually violated
// it. Any `git push` whose refspec targets refs/heads/main is the bad form,
// however the source ref is written.
const RAW_REF_PUSH = /git push origin[^\n]*:refs\/heads\/main/

const NO_FF_MERGE = /merge --no-ff/

// The drain commit must change the tree, not just mint a new commit SHA —
// Vercel's dedupe keys on content, and a bare merge of the integrator tip
// has a byte-identical tree to the preview Vercel already built.
const TREE_STAMP = /\.drain-stamp/

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
  if (!TREE_STAMP.test(workflowText)) {
    reasons.push("missing the `.drain-stamp` tree stamp — a bare --no-ff merge has a tree identical to the integrator preview Vercel already built, and content-level dedupe skips the production build")
  }
  return { ok: reasons.length === 0, reasons }
}
