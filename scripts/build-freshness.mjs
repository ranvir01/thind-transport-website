/**
 * Is the server answering on BASE actually serving the build sitting in
 * `.next` right now?
 *
 * `next start` does not own port 3000 — `next-server` does, and it survives
 * killing the npm wrapper. A rebuild plus a "restart" that only replaced the
 * wrapper leaves the ORIGINAL process serving: it hands out HTML referencing
 * chunk filenames from the build it started with, those files no longer exist
 * under the new `.next`, and every request for them 500s. Chrome reports
 * `ChunkLoadError` and the app renders its "This page couldn't load" shell, so
 * every smoke fails at its first navigation — with a timeout or a missing-copy
 * miss, never with the word "stale". Cost a QA session three green-then-red
 * reruns of the same smoke on 2026-08-23 before the extra `next-server` turned
 * up in `ps`.
 *
 * Next embeds the build id in the served HTML, so the check is exact: same id
 * means same build, and no id means an older or different app is answering.
 * Local rigs only — a remote `E2E_BASE_URL` is another machine, where the
 * local `.next` says nothing about what it is running.
 */

/** True when BASE points at this machine, the only case `.next` describes. */
export function isLocalBase(base) {
  return /localhost|127\.0\.0\.1/.test(base)
}

/**
 * @param {{ base: string, html: string, buildId: string | null }} rig
 * @returns {string | null} preflight problem text, or null when the rig is fine
 */
export function staleBuildProblem({ base, html, buildId }) {
  // No local build to compare against (CI checks out and builds in one go, and
  // a remote drive has no business reading this repo's .next) — nothing to say.
  if (!isLocalBase(base) || !buildId) return null
  if (html.includes(buildId)) return null
  return (
    `the server at ${base} is serving a different build than .next (build id ${buildId} ` +
    `absent from its HTML) — an old next-server almost certainly still owns the port. ` +
    `Every smoke will fail on ChunkLoadError that reads like a product break. Fix: ` +
    `pkill -f next-server, then npm run start`
  )
}
