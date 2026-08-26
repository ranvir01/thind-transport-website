/**
 * The e2e preflight must catch a server that is serving a build other than the
 * one in `.next`.
 *
 * Found the expensive way on 2026-08-23: `next start` is a wrapper, and
 * `next-server` is what actually holds port 3000. A rebuild plus a restart that
 * killed only the wrapper left the ORIGINAL process serving. Its HTML pointed
 * at chunk filenames from the previous build, those files were gone under the
 * new `.next`, and the requests 500'd — Chrome raised `ChunkLoadError`, the app
 * fell back to its "This page couldn't load" shell, and three consecutive runs
 * of e2e-driver-offline-smoke failed at step 1 with navigation timeouts and a
 * missing-copy miss. Nothing in any of it said "stale server", and the same
 * smoke had passed minutes earlier. It passed 3/3 again the moment the orphan
 * `next-server` was killed.
 *
 * The preflight now compares .next/BUILD_ID against the served HTML, so the
 * next agent to hit this reads the cause instead of debugging the app.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

import { isLocalBase, staleBuildProblem } from "../../../scripts/build-freshness.mjs"

const LOCAL = "http://localhost:3000"
const BUILD_ID = "BWT7xFrj4fsT7IcvDB--A"

describe("isLocalBase", () => {
  it("recognises the rig's own server", () => {
    expect(isLocalBase(LOCAL)).toBe(true)
    expect(isLocalBase("http://127.0.0.1:3000")).toBe(true)
  })

  it("does not claim a remote drive is local", () => {
    expect(isLocalBase("https://thindtransport.com")).toBe(false)
  })
})

describe("staleBuildProblem", () => {
  it("stays quiet when the served HTML carries the local build id", () => {
    const html = `<script src="/_next/static/${BUILD_ID}/_ssgManifest.js"></script>`
    expect(staleBuildProblem({ base: LOCAL, html, buildId: BUILD_ID })).toBeNull()
  })

  it("flags a server still serving an older build", () => {
    const html = `<script src="/_next/static/an0ther0ldbu1ld/_ssgManifest.js"></script>`
    const problem = staleBuildProblem({ base: LOCAL, html, buildId: BUILD_ID })
    expect(problem).toContain(BUILD_ID)
    // The fix has to be in the message; the symptom alone is what wasted the
    // session that found this.
    expect(problem).toContain("next-server")
    expect(problem).toContain("npm run start")
  })

  it("says nothing about a remote E2E_BASE_URL — local .next does not describe it", () => {
    expect(
      staleBuildProblem({ base: "https://thindtransport.com", html: "", buildId: BUILD_ID })
    ).toBeNull()
  })

  it("says nothing when there is no local build to compare against", () => {
    expect(staleBuildProblem({ base: LOCAL, html: "", buildId: null })).toBeNull()
  })
})

describe("the preflight actually runs the check", () => {
  // A helper nothing calls is a guard that silently stopped guarding.
  const runAll = readFileSync(path.join(process.cwd(), "scripts/e2e-run-all.mjs"), "utf-8")

  it("imports and calls staleBuildProblem before the suite starts", () => {
    expect(runAll).toContain('from "./build-freshness.mjs"')
    expect(runAll).toContain("staleBuildProblem({")
    expect(runAll).toContain(".next/BUILD_ID")
    // Must land in `problems`, which is what aborts the run with exit 2.
    expect(runAll).toMatch(/problems\.push\(stale\)/)
  })
})
