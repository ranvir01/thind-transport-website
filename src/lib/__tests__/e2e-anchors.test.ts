/**
 * Guard: e2e anchor strings must exist in app source.
 *
 * Both smoke failures in the 2026-07-19 QA rig drive were stale anchors —
 * page copy was edited, the sweep/smoke anchor was not, and the mismatch
 * took a 13-minute Playwright drive to surface. This test catches the same
 * drift in seconds: every anchor in scripts/e2e-sweep.mjs and every smoke's
 * landing waitForText literal must appear somewhere in src/**.
 *
 * Anchors that span an interpolation (e.g. the reports subtitle's
 * `Per-truck P&L, ${rangeLabel}`) fall back to comma-split fragments —
 * each fragment must still appear, so a copy edit on either side of the
 * interpolation is caught.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function buildCorpus(): string {
  const parts: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(entry.name)) parts.push(readFileSync(p, "utf-8").toLowerCase())
    }
  }
  walk(path.join(ROOT, "src"))
  return parts.join("\n")
}

const corpus = buildCorpus()

/** Full-anchor match, else every comma-split fragment (interpolated subtitles). */
function anchorMisses(anchor: string): string | null {
  const lower = anchor.toLowerCase()
  if (corpus.includes(lower)) return null
  const fragments = lower.split(",").map((f) => f.trim()).filter((f) => f.length >= 4)
  const missing = fragments.filter((f) => !corpus.includes(f))
  if (fragments.length > 0 && missing.length === 0) return null
  return missing.length > 0 ? missing.join(" / ") : lower
}

describe("e2e-sweep anchors", () => {
  const sweep = readFileSync(path.join(ROOT, "scripts", "e2e-sweep.mjs"), "utf-8")
  // [name, url-or-variable, anchor] page tuples, including the runtime ones
  // (portal-load / track) whose URL is an identifier.
  const tupleRe = /\[\s*"([^"]+)"\s*,\s*(?:"[^"]*"|[A-Za-z_$][\w$]*)\s*,\s*"([^"]+)"\s*\]/g
  const anchors = [...sweep.matchAll(tupleRe)].map((m) => ({ name: m[1], anchor: m[2] }))

  it("parses the page tables (regex must not silently rot)", () => {
    expect(anchors.length).toBeGreaterThanOrEqual(40)
  })

  it("every anchor appears in src/** source", () => {
    const stale = anchors
      .map(({ name, anchor }) => {
        const miss = anchorMisses(anchor)
        return miss ? `${name}: "${anchor}" (missing: ${miss})` : null
      })
      .filter(Boolean)
    expect(stale, "stale sweep anchors — update the anchor or restore the page copy").toEqual([])
  })
})

describe("smoke landing anchors", () => {
  const scriptsDir = path.join(ROOT, "scripts")
  const smokes = readdirSync(scriptsDir).filter((f) => /^e2e-.*smoke\.mjs$/.test(f))
  const firstLiteral = /waitForText(?:Report)?\(\s*[\w$]+\s*,\s*"([^"]+)"/

  const landings = smokes
    .map((file) => {
      const text = readFileSync(path.join(scriptsDir, file), "utf-8")
      const m = text.match(firstLiteral)
      return m ? { file, anchor: m[1] } : null
    })
    .filter((x): x is { file: string; anchor: string } => x !== null)

  it("finds landing waitForText literals in most smokes (regex must not silently rot)", () => {
    expect(smokes.length).toBeGreaterThanOrEqual(30)
    expect(landings.length).toBeGreaterThanOrEqual(30)
  })

  it("every smoke's landing waitForText copy appears in src/** source", () => {
    const stale = landings
      .map(({ file, anchor }) => (anchorMisses(anchor) ? `${file}: "${anchor}"` : null))
      .filter(Boolean)
    expect(stale, "stale landing anchors — update the smoke or restore the page copy").toEqual([])
  })
})
