import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { checkDrainWorkflow } from "../../../scripts/drain-merge-guard.mjs"

const OLD_FAST_FORWARD_STEP = `
      - name: Fast-forward main
        run: |
          SHA=$(git rev-parse origin/"$INTEGRATOR")
          git push origin "$SHA":refs/heads/main
`

// The exact step main-drain-fallback.yml carried until it was deleted. The
// guard's old regex reported ok on this: its source-ref character class had no
// way to match the spaces and braces of a ${...} expression, so the only file
// in the repo that violated the rule was the one file it never flagged.
const EXPRESSION_FAST_FORWARD_STEP = `
      - name: Fast-forward main
        run: |
          set -euo pipefail
          git push origin "\${{ steps.gate.outputs.sha }}:refs/heads/main"
`

const UNSTAMPED_MERGE_STEP = `
      - name: Merge integrator into main (new commit — avoids Vercel SHA dedupe)
        run: |
          SHA=$(git rev-parse origin/"$INTEGRATOR")
          git checkout -B main origin/main
          git merge --no-ff "$SHA" -m "Drain integrator to main ($SHA)"
          git push origin main
`

const FIXED_MERGE_STEP = `
      - name: Merge integrator into main (new commit + stamped tree — defeats Vercel dedupe)
        run: |
          SHA=$(git rev-parse origin/"$INTEGRATOR")
          git checkout -B main origin/main
          git merge --no-ff --no-commit "$SHA"
          printf 'sha=%s\\n' "$SHA" > .drain-stamp
          git add .drain-stamp
          git commit -m "Drain integrator to main ($SHA)"
          git push origin main
`

describe("checkDrainWorkflow", () => {
  it("flags a bare fast-forward ref push", () => {
    const result = checkDrainWorkflow(OLD_FAST_FORWARD_STEP)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/bare ref-to-branch push/)
  })

  it("flags a bare ref push whose source is a ${...} workflow expression", () => {
    const result = checkDrainWorkflow(EXPRESSION_FAST_FORWARD_STEP)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/bare ref-to-branch push/)
  })

  it("flags a --no-ff merge without the tree stamp (content dedupe still skips the build)", () => {
    const result = checkDrainWorkflow(UNSTAMPED_MERGE_STEP)
    expect(result.ok).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/\.drain-stamp/)
  })

  it("passes a --no-ff merge step with the tree stamp", () => {
    const result = checkDrainWorkflow(FIXED_MERGE_STEP)
    expect(result.ok).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it("keeps the repo's drain workflows on the --no-ff merge form (the Vercel SHA-dedupe regression)", () => {
    // Discovered, not hand-maintained. main-drain-fallback.yml shipped a bare
    // fast-forward push for months precisely because it was never added here.
    const dir = path.join(process.cwd(), ".github/workflows")
    const files = readdirSync(dir)
      .filter((f) => /drain/.test(f))
      .map((f) => path.join(".github/workflows", f))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const text = readFileSync(path.join(process.cwd(), file), "utf-8")
      const result = checkDrainWorkflow(text)
      expect(result.reasons, `${file}: ${result.reasons.join("; ")}`).toEqual([])
      expect(result.ok, file).toBe(true)
    }
  })
})
