/**
 * Token lint — two scopes, two strictness levels.
 *
 * MARKETING (strict; exit 1): no raw hex colors, no raw pixel values in the
 * redesigned marketing components — every color, space, radius, shadow,
 * duration and easing must reference a token (tailwind.config.ts m-* system
 * or a semantic utility).
 *
 * Scope is the REDESIGNED surface only, listed below. Legacy marketing pages
 * keep their own conventions until their redesign pass touches them — a
 * repo-wide rule today would fail on hundreds of files nobody is editing, and
 * a lint that's always red teaches everyone to ignore it. Add each file/dir
 * here as it is redesigned.
 *
 * Allowed exceptions (each one deliberate):
 *  - 44px / 48px / 24px inside arbitrary values: WCAG tap-target minimums are
 *    defined in CSS pixels by the spec itself — they ARE the token.
 *  - 1px hairlines.
 *  - px inside comments and import paths.
 *
 * HUB (report mode by default; TOKEN_LINT_HUB_STRICT=1 makes it fail): the
 * office, driver and portal route trees plus src/components/hub. Two rules:
 *  - Raw hex colours in class/style code — a Tailwind arbitrary value
 *    (`bg-[#e9e5dc]`), a colour property (`fill="#fff"`, `color: "#666"`,
 *    `ctx.strokeStyle = "#…"`) or a standalone hex string literal. Every hub
 *    colour is a token from src/app/hub/hub-theme.css, which is excluded here
 *    because it is the token source (all hex by design) and has its own gate,
 *    src/lib/hub/__tests__/hub-theme-tokens.test.ts. `#202` in a truck number
 *    or `load #4411` in prose is not a colour and is not flagged.
 *  - An opacity modifier on a var()-backed token (`border-border/60`,
 *    `bg-accent/10`). Tailwind cannot split `var(--x)` into channels, so it
 *    drops the class SILENTLY — the element ships with no border/background
 *    at all. Use a *-soft token or a real rgba token instead.
 *  The px rule is deliberately NOT applied to the hub: it legitimately uses
 *  many arbitrary px sizes (text-[13.5px], min-h-[58px], w-[212px], …).
 *  Report mode exists so this gate is not red from its first commit — the
 *  violations print on every run, and the env var makes them fail. Ratchet:
 *  fix them, then make strict the default.
 *
 * Run: node scripts/token-lint.mjs                        (exit 1 on marketing violations)
 *      TOKEN_LINT_HUB_STRICT=1 node scripts/token-lint.mjs (…or hub violations)
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const SCOPE = [
  // Marketing components and routes that have been swept onto the m-* tokens.
  // A path lands here the moment its file is raw-hex/px free, and never leaves:
  // this list is the ratchet that stops the sweep from rotting.
  "src/components/home/AudienceSelector.tsx",
  "src/components/home/HomeTimeLanes.tsx",
  "src/components/home/OperationSection.tsx",
  "src/components/home/ThindPromise.tsx",
  "src/components/ui/Reveal.tsx",
  "src/components/shared/AsphaltHero.tsx",
  "src/components/shared/FAQAccordion.tsx",
  "src/components/shared/link-sets.ts",
  "src/components/features/GetTheApp.tsx",
  "src/components/features/WhySwitch.tsx",
  "src/components/features/PayTable.tsx",
  "src/components/features/JobDetailsDialog.tsx",
  "src/components/features/LaneTransitEstimator.tsx",
  "src/components/features/ShipperQuoteForm.tsx",
  "src/components/features/QuoteFormWithLane.tsx",
  "src/components/features/RouteMapVisualization.tsx",
  "src/components/features/AvailableTrucksStrip.tsx",
  "src/components/features/BrokerPacketForm.tsx",
  "src/components/features/FreightClassCalculator.tsx",
  "src/components/features/FuelSavingsCalculator.tsx",
  "src/components/features/ScheduleMeetingForm.tsx",
  "src/components/application/ApplicationForm.tsx",
  "src/components/application/PreQualificationForm.tsx",
  "src/components/application/apply-progress.ts",
  "src/components/cinematic/Navbar.tsx",
  "src/components/fleet",
  "src/app/about",
  "src/app/app",
  "src/app/apply/page.tsx",
  "src/app/benefits",
  "src/app/brokers",
  "src/app/business-card/page.tsx",
  "src/app/cdl-jobs",
  "src/app/contact/page.tsx",
  "src/app/drivers",
  "src/app/fleet/page.tsx",
  "src/app/fuel-program",
  "src/app/loadoff",
  "src/app/not-found.tsx",
  "src/app/owner-operators",
  "src/app/pay-breakdown",
  "src/app/pay-rates",
  "src/app/pre-qualify/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/quote",
  "src/app/resources",
  "src/app/routes",
  "src/app/schedule-meeting/page.tsx",
  "src/app/shippers",
  "src/app/tools/freight-class-calculator",
  "src/app/trust",
  "src/app/veterans",
]

const HUB_SCOPE = [
  "src/app/hub/(office)",
  "src/app/hub/driver",
  "src/app/hub/portal",
  "src/components/hub",
]
const HUB_STRICT = process.env.TOKEN_LINT_HUB_STRICT === "1"
const isHubExcluded = (file) =>
  file === "src/app/hub/hub-theme.css" || /(^|\/)__tests__\//.test(file) || /\.test\.tsx?$/.test(file)

// 0px included: IntersectionObserver rootMargin strings require units even
// for zero — that's a browser API contract, not a design value.
const ALLOWED_PX = new Set(["0px", "1px", "24px", "44px", "48px"])

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const OPACITY_TRAP =
  /\b(bg|text|border|ring|divide|from|to|via)-(surface|surface-2|bg|fg|fg-2|fg-3|border|border-strong|hover|accent|accent-soft|accent-text|ok|warn|bad|info)(-\w+)?\/\d+/g
/** A colour-ish property name, then `:` or `=`, with no statement boundary
 *  before the match — `border:2px solid #fff` and `color: "#666"` both count. */
const COLOR_PROP_BEFORE =
  /(?:fill|stroke|color|background|border|outline|shadow|accent|strokeStyle|fillStyle|stopColor|theme-color)[\w-]*\s*[:=][^;{}]*$/i

function* files(path) {
  const st = statSync(path)
  if (st.isFile()) {
    yield path
    return
  }
  for (const entry of readdirSync(path)) {
    yield* files(join(path, entry))
  }
}

/**
 * Blank out every comment in a file, keeping the line count intact so the
 * reported line numbers stay true.
 *
 * Line-at-a-time stripping only ever caught JSDoc (`*`-prefixed) continuation
 * lines, so the middle of a JSX block comment — `{/* the table is wider than
 * the island at 390px *␘/}` — read as code and the linter flagged prose that
 * explains a value as if it painted one. Prose is not code, however it is
 * indented.
 */
function stripComments(text) {
  let out = ""
  let i = 0
  // "code" | "line" | "block" | "s" | "d" | "t"  (the last three are strings)
  let state = "code"
  while (i < text.length) {
    const c = text[i]
    const next = text[i + 1]
    if (state === "code") {
      if (c === "/" && next === "/") { state = "line"; out += "  "; i += 2; continue }
      if (c === "/" && next === "*") { state = "block"; out += "  "; i += 2; continue }
      if (c === '"') state = "d"
      else if (c === "'") state = "s"
      else if (c === "`") state = "t"
      out += c; i++; continue
    }
    if (state === "line") {
      if (c === "\n") { state = "code"; out += c } else out += " "
      i++; continue
    }
    if (state === "block") {
      if (c === "*" && next === "/") { state = "code"; out += "  "; i += 2; continue }
      out += c === "\n" ? c : " "
      i++; continue
    }
    // inside a string literal: copy through, honouring escapes
    if (c === "\\") { out += text.slice(i, i + 2); i += 2; continue }
    if ((state === "d" && c === '"') || (state === "s" && c === "'") || (state === "t" && c === "`")) state = "code"
    out += c; i++
  }
  return out
}

/** A next/image `sizes="(max-width: 768px) 100vw, 45vw"` hint is a browser
 *  media-query string, not a design value — it is not a violation either. */
function codeOf(line) {
  return line.replace(/\bsizes=(["'`])[^"'`]*\1/g, "sizes=…")
}

/**
 * Is this hex match a colour in class/style code, rather than a truck number,
 * a load reference in placeholder prose, or a URL fragment?
 */
function isColorContext(code, index, hex) {
  const before = code.slice(0, index)
  const after = code.slice(index + hex.length)
  // URL fragment or anchor: `/hub/loads#abc`, `href="#faq"`.
  if (before.endsWith("/") || /href\s*=\s*["'{`]*$/.test(before)) return false
  // Tailwind arbitrary value: an unclosed `[` earlier on the line.
  const open = before.lastIndexOf("[")
  if (open >= 0 && before.indexOf("]", open) === -1) return true
  // Colour property value: fill="#fff", color: "#666", strokeStyle = "#…".
  if (COLOR_PROP_BEFORE.test(before.slice(-64))) return true
  // A standalone hex string literal ("#d97706"). Three/four digits need a
  // letter to count — "#202" is a truck, "#4411" a load; #000/#fff-style
  // greys are caught by the property rule above when they are painted.
  const digits = hex.slice(1)
  const standalone = /["'`]$/.test(before) && /^["'`]/.test(after)
  if (standalone && (digits.length >= 6 || /[a-f]/i.test(digits))) return true
  return false
}

/** file → ["  :line  message", …] */
const marketing = new Map()
const hub = new Map()
const add = (bucket, file, line, msg) => {
  if (!bucket.has(file)) bucket.set(file, [])
  bucket.get(file).push(`:${line}  ${msg}`)
}

for (const root of SCOPE) {
  for (const file of files(root)) {
    if (!/\.(tsx|ts|css)$/.test(file)) continue
    const lines = stripComments(readFileSync(file, "utf8")).split("\n")
    lines.forEach((line, i) => {
      const code = codeOf(line)
      if (code === null) return
      // Raw hex color anywhere in class/style code.
      const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g)
      if (hex) add(marketing, file, i + 1, `raw hex ${hex.join(", ")}`)
      // Raw px outside the allowed accessibility constants.
      for (const m of code.matchAll(/\b(\d+(?:\.\d+)?px)\b/g)) {
        if (!ALLOWED_PX.has(m[1])) add(marketing, file, i + 1, `raw ${m[1]}`)
      }
    })
  }
}

for (const root of HUB_SCOPE) {
  for (const file of files(root)) {
    if (!/\.(tsx|ts|css)$/.test(file) || isHubExcluded(file)) continue
    const lines = stripComments(readFileSync(file, "utf8")).split("\n")
    lines.forEach((line, i) => {
      const code = codeOf(line)
      if (code === null) return
      for (const m of code.matchAll(HEX)) {
        if (isColorContext(code, m.index, m[0])) add(hub, file, i + 1, `raw hex ${m[0]} — use a hub-theme.css token`)
      }
      for (const m of code.matchAll(OPACITY_TRAP)) {
        add(
          hub, file, i + 1,
          `${m[0]} — opacity modifier on a var() token; Tailwind drops the class silently. Use a *-soft token or an rgba token`
        )
      }
    })
  }
}

const count = (bucket) => [...bucket.values()].reduce((n, v) => n + v.length, 0)
const printGrouped = (bucket, out) => {
  for (const [file, items] of [...bucket.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out(`  ${file}`)
    for (const item of items) out(`    ${item}`)
  }
  out("")
}

const marketingCount = count(marketing)
if (marketingCount) {
  console.error(`❌ token-lint: ${marketingCount} violation(s) in the redesigned marketing scope — use m-* tokens, not raw values:\n`)
  printGrouped(marketing, console.error)
} else {
  console.log("✅ token-lint: redesigned marketing scope is raw-hex/px free")
}

const hubCount = count(hub)
if (hubCount) {
  const out = HUB_STRICT ? console.error : console.log
  out(
    `${HUB_STRICT ? "❌" : "⚠️ "} token-lint (hub): ${hubCount} violation(s) in ${hub.size} file(s)` +
      `${HUB_STRICT ? "" : " — report mode; TOKEN_LINT_HUB_STRICT=1 makes these fail"}:\n`
  )
  printGrouped(hub, out)
} else {
  console.log("✅ token-lint (hub): no raw hex in class/style code, no opacity modifiers on var() tokens")
}

process.exit(marketingCount > 0 || (HUB_STRICT && hubCount > 0) ? 1 : 0)
