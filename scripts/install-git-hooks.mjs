/**
 * install-git-hooks.mjs — point git at the repo's checked-in hooks.
 *
 * Run from the `prepare` lifecycle script, so `npm install` wires up
 * `.githooks/pre-push` (see scripts/typecheck-hook-guard.mjs for why).
 *
 * Always exits 0. This runs inside every `npm install`, including in tarball
 * installs and CI images with no git repo and no `.githooks` directory —
 * failing there would break installs for a convenience feature. CI does not
 * need it either: `npm ci --ignore-scripts` skips `prepare`, and the drain
 * workflow invokes `npm run typecheck:gate` explicitly.
 */
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

try {
  if (!existsSync(".git") || !existsSync(".githooks")) process.exit(0)
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" })
} catch {
  // Not a git repo, git missing, or a read-only config — nothing to do.
}
