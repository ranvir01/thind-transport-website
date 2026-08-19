/**
 * Guard: after a soft-nav landing gate, an e2e script must wait for the
 * destination to RENDER before reading its content.
 *
 * Regression (nightly full-cycle rig, 2026-08-17): e2e-nightly-cycle clicked
 * "Invoice this load", waited only for `location.pathname` to start with
 * `/hub/money/invoices/`, then immediately read the invoice's Summary values
 * and "Invoice PDF" link. But the pathname flips the instant router.push()
 * fires — before the invoice detail's server component has streamed in — so
 * the page was still the loading skeleton (no Summary <dt>s, no PDF link).
 * summaryValue()/fetchLinkBytes() read null, and the drive failed two checks
 * ("invoice amount parses (null cents)", "invoice PDF is a real %PDF") plus
 * crashed on `document.querySelector("#pay_amount").value` a few lines later.
 *
 * It only bit on the FIRST cold serve after a build (widest first-serve
 * window: cold route compile, cold DB pool, cold PDF lib) and passed on every
 * warm re-run, so it read as a flake rather than the timing bug it was. The
 * three sibling money smokes (invoices / business-cycle / accounting-drive)
 * never flake here because each gates on `waitForSelector("#pay_amount")` —
 * the payment form mounts only once the detail has rendered — before reading.
 * The nightly drive simply omitted that gate.
 *
 * This test enforces the rule statically, in seconds, instead of paying for a
 * ~13-minute Playwright drive against a cold rig to surface it: every
 * `waitForFunction(() => location.pathname …)` LANDING gate (a "we arrived"
 * check, not a "we left" `!== ` / `!location.pathname` check) must be followed
 * by a real render gate before the first read of destination content.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SCRIPTS_DIR = path.join(ROOT, "scripts")

/**
 * Nav-bar labels are always in the DOM (they render in the app chrome, not the
 * page body), so `waitForText(page, "<nav label>")` proves nothing about the
 * destination content having arrived — it is NOT a render gate. Anchors that
 * are real destination copy ("Open balance", "Receivables", "Net pay") are.
 */
function navLabels(): Set<string> {
  const nav = readFileSync(path.join(ROOT, "src", "lib", "hub", "navigation.ts"), "utf-8")
  return new Set([...nav.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase()))
}

const NAV_LABELS = navLabels()

/**
 * Strip comments before scanning — a comment that names a helper (this file's
 * own explanatory comment mentions `summaryValue()`) must not read as a call.
 * Line numbers are preserved: block comments become the same count of blank
 * lines, line comments are truncated in place. `//` after a `:` (URLs like
 * `http://`) is left alone so it never eats a real line.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n")
}

/**
 * A landing gate: waits for the URL to BECOME a path (arrival), not leave one.
 *
 * `waitForPath()` is the named helper for the same waitForFunction pathname
 * check (defined in e2e-lib.mjs, which this scan excludes). It is NOT a
 * render gate — the blanket `waitFor*` pass used to treat it as one, which
 * hid redirect smokes that read destination content against a loading
 * skeleton. `waitForPathAndText` is a render gate (it also waits on copy)
 * and does not match `\bwaitForPath\(`.
 */
const LANDING_GATE = /waitForFunction\([^\n]*location\.pathname|\bwaitForPath\(/
const LEAVING_GATE = /!location\.pathname|location\.pathname\s*!==/

/** Destination-copy anchors for redirect smokes that land via waitForPath. */
const WAIT_FOR_PATH_COPY: Record<string, string> = {
  "/hub": "Unconfirmed drivers",
  "/hub/driver": "Last pay",
  "/hub/suspended": "Workspace suspended",
}

/** A hard navigation resets the state — page.goto awaits the destination itself. */
const HARD_NAV = /\.goto\(/

/**
 * Reads that pull RENDERED page content — the calls that return null against a
 * loading skeleton. `page.evaluate(() => location.pathname)` reads the URL, not
 * the DOM, so it is deliberately excluded (the location-only guard below).
 */
const CONTENT_READ =
  /summaryValue\(|dtValue\(|totalsValue\(|fetchLinkBytes\(|fetchPdf\(|\.type\(/
const EVALUATE_DOM = /\.evaluate\(/
const READS_DOM = /innerText|querySelector|document\./
const READS_LOCATION_ONLY = /location\.(pathname|href|search)/

/** A gate that actually waits for the destination body to render. */
function isRenderGate(line: string): boolean {
  // Another URL wait is not a render gate — it proves nothing rendered.
  // waitForPath is in LANDING_GATE, so this also rejects the named helper.
  if (LANDING_GATE.test(line) || LEAVING_GATE.test(line)) return false
  if (/waitForSelector\(|waitForNetworkIdle|waitForStableText\(|waitForPathAndText\(/.test(line)) {
    return true
  }
  // A waitForFunction that inspects the DOM (querySelector/innerText) is a
  // content wait, unlike one that only checks location.
  if (/waitForFunction\(/.test(line) && READS_DOM.test(line)) return true
  // waitForText / textAppears with a plain double-quoted anchor: real only if
  // the anchor is destination copy, not an always-present nav label.
  const m = /(?:waitForText|textAppears)\(\s*[\w$]+\s*,\s*"([^"]+)"/.exec(line)
  if (m) return !NAV_LABELS.has(m[1].toLowerCase())
  // Any other waiter — waitForText on a template/variable anchor, or a project
  // helper like waitForLoadDetail() — waits on real content; give it the pass.
  if (/\bwaitFor[A-Za-z]+\(/.test(line)) return true
  return false
}

function isContentRead(line: string): boolean {
  if (CONTENT_READ.test(line)) return true
  if (EVALUATE_DOM.test(line) && READS_DOM.test(line) && !READS_LOCATION_ONLY.test(line)) {
    // Multi-line page.evaluate() bodies read DOM on a later line; this catches
    // only single-line reads, which is where the skeleton race actually lands
    // (summaryValue/fetchLinkBytes are single-line helper calls).
    return true
  }
  return false
}

const scripts = readdirSync(SCRIPTS_DIR).filter(
  (f) => /^e2e-.*\.mjs$/.test(f) && f !== "e2e-lib.mjs"
)

/**
 * Walk each landing gate forward. The first thing that matters wins:
 *   render gate → SAFE, the read that follows sees real content;
 *   hard nav    → SAFE, the gate was for a page we then navigated away from;
 *   content read→ VIOLATION, we read the skeleton.
 */
function violationsIn(file: string): string[] {
  const lines = stripComments(readFileSync(path.join(SCRIPTS_DIR, file), "utf-8")).split("\n")
  const out: string[] = []
  lines.forEach((line, i) => {
    if (!LANDING_GATE.test(line) || LEAVING_GATE.test(line)) return
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j]
      if (isRenderGate(l) || HARD_NAV.test(l)) break
      if (isContentRead(l)) {
        out.push(`${file}:${i + 1} → reads content at :${j + 1} (${l.trim().slice(0, 60)})`)
        break
      }
    }
  })
  return out
}

describe("e2e soft-nav landing gates wait for render before reading", () => {
  it("finds landing gates to check (guard is not silently vacuous)", () => {
    const total = scripts.reduce(
      (n, f) =>
        n +
        readFileSync(path.join(SCRIPTS_DIR, f), "utf-8")
          .split("\n")
          .filter((l) => LANDING_GATE.test(l) && !LEAVING_GATE.test(l)).length,
      0
    )
    expect(total).toBeGreaterThanOrEqual(12)
  })

  it("counts waitForPath as a landing gate (pathname helper, not a render wait)", () => {
    let pathWaits = 0
    let asLanding = 0
    for (const f of scripts) {
      for (const line of readFileSync(path.join(SCRIPTS_DIR, f), "utf-8").split("\n")) {
        if (!/\bwaitForPath\(/.test(line)) continue
        pathWaits += 1
        if (LANDING_GATE.test(line) && !LEAVING_GATE.test(line)) asLanding += 1
        expect(isRenderGate(line), `${f}: waitForPath must not count as a render gate`).toBe(
          false
        )
      }
    }
    expect(pathWaits).toBeGreaterThanOrEqual(8)
    expect(asLanding).toBe(pathWaits)
  })

  it("redirect smokes wait for destination copy after waitForPath", () => {
    const PATH_RE = /waitForPath\(\s*[\w$]+\s*,\s*"([^"]+)"/
    const TEXT_RE = /(?:waitForText|textAppears)\(\s*[\w$]+\s*,\s*"([^"]+)"/
    const misses: string[] = []
    for (const f of scripts) {
      const lines = stripComments(readFileSync(path.join(SCRIPTS_DIR, f), "utf-8")).split("\n")
      lines.forEach((line, i) => {
        const pathMatch = PATH_RE.exec(line)
        if (!pathMatch) return
        const copy = WAIT_FOR_PATH_COPY[pathMatch[1]]
        if (!copy) {
          misses.push(`${f}:${i + 1} waitForPath("${pathMatch[1]}") has no destination-copy mapping`)
          return
        }
        for (let j = i + 1; j < lines.length; j++) {
          const l = lines[j]
          if (HARD_NAV.test(l) || isContentRead(l)) {
            misses.push(
              `${f}:${i + 1} waitForPath("${pathMatch[1]}") has no waitForText("${copy}") before a read`
            )
            return
          }
          const textMatch = TEXT_RE.exec(l)
          if (textMatch?.[1] === copy) return
          if (isRenderGate(l)) {
            misses.push(
              `${f}:${i + 1} waitForPath("${pathMatch[1]}") gated on "${textMatch?.[1] ?? l.trim().slice(0, 40)}" instead of "${copy}"`
            )
            return
          }
        }
        misses.push(`${f}:${i + 1} waitForPath("${pathMatch[1]}") never waits for "${copy}"`)
      })
    }
    expect(misses).toEqual([])
  })

  it("every landing gate is followed by a render gate before a content read", () => {
    const violations = scripts.flatMap(violationsIn)
    expect(
      violations,
      "an e2e script reads destination content after only a location.pathname " +
        "gate — the URL flips before the server component streams in, so the " +
        "read hits the loading skeleton. Add a render gate (waitForSelector on " +
        "a form field, or waitForText on real destination copy) after the " +
        "pathname wait, like the invoices/business-cycle/accounting smokes do."
    ).toEqual([])
  })
})
