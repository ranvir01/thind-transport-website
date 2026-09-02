/**
 * hub-theme.css two-axis contract: MODE owns the neutrals, THEME owns the hue.
 *
 * The bug this gate exists to stop shipped once already: the teal/ink LIGHT
 * blocks declared --border/--hover, sat after the dark block at equal
 * specificity, and so in dark mode + teal/ink every card carried a near-white
 * hairline and hovered rows went white-on-white. Every QA script only ever
 * seeded `hauldesk-mode`, never `hauldesk-theme`, so every dark screenshot was
 * indigo and nobody saw it. The scripts now loop themes; this test makes the
 * stylesheet itself unable to express the bug:
 *
 *   MODE tokens (neutrals) may ONLY be declared in the two bare mode blocks
 *     `[data-app="hauldesk"] {` and `[data-app="hauldesk"][data-mode="dark"] {`
 *     (or inside @supports/@media bodies, which this parser skips on purpose).
 *   THEME tokens (hue) may ONLY be declared in blocks whose whole selector
 *     list is wrapped in :where(...) — specificity 0, so a theme can never
 *     out-specify a neutral even if one is re-added by mistake.
 *   The dark MODE block comes AFTER the last block that mentions [data-theme=.
 *
 * Then, rather than trusting the shape, it resolves all six (mode, theme)
 * combinations by simulating the cascade and checks that dark is dark: border,
 * hover, surface and page are all darker than the text, and the reverse in
 * light. No jsdom here, so the cascade is a small model of the real one —
 * attribute requirements, specificity outside :where(), source order.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const css = readFileSync(new URL("../../../app/hub/hub-theme.css", import.meta.url), "utf-8")

const MODE_TOKENS = [
  "--bg", "--surface", "--surface-2", "--surface-3",
  "--border", "--border-strong", "--border-control",
  "--hover", "--selected", "--overlay",
  "--text", "--text-2", "--text-3",
  "--shadow", "--shadow-raised", "--shadow-overlay", "--skeleton-sheen",
  "--green", "--green-soft", "--amber", "--amber-soft",
  "--red", "--red-soft", "--blue", "--blue-soft", "--bad-fg",
]
const THEME_TOKENS = ["--accent", "--accent-hover", "--accent-fg", "--accent-soft", "--accent-text", "--ring"]

const MODES = ["light", "dark"] as const
const THEMES = ["indigo", "teal", "ink"] as const
type Mode = (typeof MODES)[number]
type Theme = (typeof THEMES)[number]

const LIGHT_MODE_SELECTOR = '[data-app="hauldesk"]'
const DARK_MODE_SELECTOR = '[data-app="hauldesk"][data-mode="dark"]'

/* ------------------------------------------------------------------------ */
/* Parser: top-level rule blocks only, at-rule bodies skipped                 */
/* ------------------------------------------------------------------------ */

type Block = {
  /** Position among top-level rule blocks (at-rules do not count). */
  index: number
  /** 1-based line of the opening brace, for error messages. */
  line: number
  selectorText: string
  /** The comma-separated selector list, split at paren depth 0. */
  selectors: string[]
  declarations: Map<string, string>
}

/** Blank out comments but keep newlines so line numbers still line up. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
}

function lineOf(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) if (text.charAt(i) === "\n") line++
  return line
}

/** Split on `sep` at paren depth 0 — `:is(h1, h2)` and `rgba(1, 2, 3)` stay whole. */
function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    if (ch === "(") depth++
    else if (ch === ")") depth--
    if (ch === sep && depth === 0) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

function parseDeclarations(body: string): Map<string, string> {
  const decls = new Map<string, string>()
  for (const part of splitTopLevel(body, ";")) {
    const colon = part.indexOf(":")
    if (colon < 0) continue
    const name = part.slice(0, colon).trim()
    const value = part.slice(colon + 1).trim()
    if (name) decls.set(name, value)
  }
  return decls
}

function parseTopLevelBlocks(src: string): Block[] {
  const text = stripComments(src)
  const blocks: Block[] = []
  let prelude = ""
  let i = 0
  while (i < text.length) {
    const ch = text.charAt(i)
    if (ch === ";") {
      // A bodiless at-rule such as `@import …;` — nothing to keep.
      prelude = ""
      i++
      continue
    }
    if (ch !== "{") {
      prelude += ch
      i++
      continue
    }
    // Find the matching close brace, tracking nesting so an at-rule body
    // (with its own rule blocks inside) is consumed whole.
    let depth = 1
    let j = i + 1
    while (j < text.length && depth > 0) {
      const c = text.charAt(j)
      if (c === "{") depth++
      else if (c === "}") depth--
      j++
    }
    if (depth !== 0) throw new Error(`hub-theme.css: unbalanced braces after line ${lineOf(text, i)}`)
    const selectorText = prelude.replace(/\s+/g, " ").trim()
    if (!selectorText.startsWith("@")) {
      blocks.push({
        index: blocks.length,
        line: lineOf(text, i),
        selectorText,
        selectors: splitTopLevel(selectorText, ","),
        declarations: parseDeclarations(text.slice(i + 1, j - 1)),
      })
    }
    prelude = ""
    i = j
  }
  return blocks
}

/* ------------------------------------------------------------------------ */
/* Selector model: does this selector target the <html> root, and how hard?   */
/* ------------------------------------------------------------------------ */

type RootSelector = {
  /** attribute → required value (undefined = presence only) */
  requires: Map<string, string | undefined>
  /** attribute selectors OUTSIDE :where(); :where() contributes 0 */
  specificity: number
  whereWrapped: boolean
}

const ATTR_RE = /\[\s*([\w-]+)\s*(?:(=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g

/**
 * null when the selector is not a pure attribute selector on the root (a
 * descendant like `[data-app] body`, a class, `:is(...)`) — those never
 * declare root tokens and take no part in the six-way resolution.
 */
function analyzeRootSelector(selector: string): RootSelector | null {
  const sel = selector.trim()
  const whereWrapped = /^:where\(/.test(sel) && sel.endsWith(")")
  const outside = sel.replace(/:where\(([^()]*)\)/g, "")
  const remainder = outside.replace(ATTR_RE, "").replace(/\s+/g, "")
  if (remainder !== "") return null
  const requires = new Map<string, string | undefined>()
  for (const m of sel.matchAll(ATTR_RE)) {
    const attr = m[1] ?? ""
    const value = m[2] ? (m[3] ?? m[4] ?? m[5] ?? "") : undefined
    requires.set(attr, value)
  }
  if (requires.size === 0) return null
  const specificity = (outside.match(/\[/g) ?? []).length
  return { requires, specificity, whereWrapped }
}

function matches(sel: RootSelector, mode: Mode, theme: Theme): boolean {
  const env: Record<string, string> = { "data-app": "hauldesk", "data-mode": mode, "data-theme": theme }
  for (const [attr, value] of sel.requires) {
    if (!(attr in env)) return false // e.g. data-surface: never on an office root
    if (value !== undefined && env[attr] !== value) return false
  }
  return true
}

/* ------------------------------------------------------------------------ */
/* Cascade model                                                              */
/* ------------------------------------------------------------------------ */

type Resolved = { value: string; block: Block }

function resolve(blocks: Block[], mode: Mode, theme: Theme): Map<string, Resolved> {
  const winners = new Map<string, Resolved & { specificity: number }>()
  for (const block of blocks) {
    let best = -1
    for (const s of block.selectors) {
      const info = analyzeRootSelector(s)
      if (info && matches(info, mode, theme)) best = Math.max(best, info.specificity)
    }
    if (best < 0) continue
    for (const [name, value] of block.declarations) {
      if (!name.startsWith("--")) continue
      const cur = winners.get(name)
      // Higher specificity wins; equal specificity → later source order wins.
      if (!cur || best >= cur.specificity) winners.set(name, { value, block, specificity: best })
    }
  }
  return winners
}

/** Follow `var(--x)` (with optional fallback) to a literal. */
function literalOf(resolved: Map<string, Resolved>, name: string, combo: string, seen: string[] = []): string {
  const hit = resolved.get(name)
  if (!hit) {
    throw new Error(`[${combo}] ${name} is not declared for this combination${seen.length ? ` (via ${seen.join(" → ")})` : ""}`)
  }
  const m = hit.value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/)
  if (!m) return hit.value
  const ref = m[1] ?? ""
  if (seen.includes(ref)) throw new Error(`[${combo}] ${name}: var() cycle ${[...seen, ref].join(" → ")}`)
  if (resolved.has(ref)) return literalOf(resolved, ref, combo, [...seen, name])
  if (m[2] !== undefined) return m[2].trim()
  throw new Error(`[${combo}] ${name} references undeclared ${ref}`)
}

/* ------------------------------------------------------------------------ */
/* Colour math                                                               */
/* ------------------------------------------------------------------------ */

type RGBA = [number, number, number, number]

function parseColor(value: string, ctx: string): RGBA {
  const v = value.trim()
  if (v === "transparent") return [0, 0, 0, 0]
  const hex = v.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hex) {
    let h = hex[1] ?? ""
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("")
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  const fn = v.match(/^rgba?\(\s*([^)]*?)\s*\)$/i)
  if (fn) {
    const parts = (fn[1] ?? "").split(/[\s,/]+/).filter(Boolean)
    if (parts.length === 3 || parts.length === 4) {
      const num = (s: string, scale: number) => (s.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s))
      const [r, g, b] = [num(parts[0] ?? "", 255), num(parts[1] ?? "", 255), num(parts[2] ?? "", 255)]
      const a = parts.length === 4 ? num(parts[3] ?? "", 1) : 1
      if ([r, g, b, a].every((x) => Number.isFinite(x))) return [r, g, b, a]
    }
  }
  throw new Error(
    `${ctx}: cannot parse "${v}" as a colour. Top-level token values must be #hex or rgb()/rgba() so ` +
      `this gate can composite them — keep color-mix() and friends inside an @supports block.`
  )
}

/** `fg` composited over an opaque `bg`. */
function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3] + bg[3] * (1 - fg[3])
  if (a === 0) return [0, 0, 0, 0]
  const ch = (i: 0 | 1 | 2) => (fg[i] * fg[3] + bg[i] * bg[3] * (1 - fg[3])) / a
  return [ch(0), ch(1), ch(2), a]
}

function luminance([r, g, b]: RGBA): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const WHITE: RGBA = [255, 255, 255, 1]
const fmt = ([r, g, b]: RGBA) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
const describeBlock = (b: Block) => `line ${b.line} \`${b.selectorText}\``
const normalize = (s: string) => s.replace(/\s+/g, "")

/* ------------------------------------------------------------------------ */
/* Tests                                                                     */
/* ------------------------------------------------------------------------ */

const blocks = parseTopLevelBlocks(css)
const themeBlocks = blocks.filter((b) => b.selectorText.includes("[data-theme="))
const declares = (b: Block, names: string[]) => names.filter((n) => b.declarations.has(n))

describe("hub-theme.css parser", () => {
  it("sees the top-level rule blocks and skips at-rule bodies", () => {
    expect(blocks.length).toBeGreaterThan(10)
    expect(themeBlocks.length).toBeGreaterThan(0)
    // Nothing that lives inside @keyframes / @media / @supports leaks out.
    for (const b of blocks) {
      expect(b.selectorText, `block at line ${b.line}`).not.toMatch(/^(from|to|\d+%)$/)
    }
    // The body-pinning selectors stay parseable and present (see theme-color-sync.test.ts).
    expect(blocks.some((b) => b.selectorText === '[data-app="hauldesk"] body')).toBe(true)
    expect(blocks.some((b) => b.selectorText === '[data-app="hauldesk"][data-surface="dark"] body')).toBe(true)
  })
})

describe("hub-theme.css token contract", () => {
  it("(a) a [data-theme=] block declares no MODE token and is wrapped in :where()", () => {
    const problems: string[] = []
    for (const b of themeBlocks) {
      const leaked = declares(b, MODE_TOKENS)
      if (leaked.length) {
        problems.push(
          `${describeBlock(b)} declares MODE token(s) ${leaked.join(", ")} — neutrals belong to the ` +
            `mode blocks only; a theme block that sets them will leak light values into dark`
        )
      }
      const bare = b.selectors.filter((s) => !(analyzeRootSelector(s)?.whereWrapped ?? false))
      if (bare.length) {
        problems.push(`${describeBlock(b)} has selector(s) not wrapped in :where(): ${bare.join(" , ")}`)
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("(b) every block declaring a THEME token has a :where() selector list", () => {
    const problems: string[] = []
    for (const b of blocks) {
      const hue = declares(b, THEME_TOKENS)
      if (!hue.length) continue
      const bare = b.selectors.filter((s) => !(analyzeRootSelector(s)?.whereWrapped ?? false))
      if (bare.length) {
        problems.push(
          `${describeBlock(b)} declares ${hue.join(", ")} but selector(s) ${bare.join(" , ")} ` +
            `are not wrapped in :where() — hue must carry zero specificity`
        )
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("MODE tokens are declared only in the two bare mode blocks", () => {
    const allowed = new Set([normalize(LIGHT_MODE_SELECTOR), normalize(DARK_MODE_SELECTOR)])
    const problems: string[] = []
    for (const b of blocks) {
      const neutrals = declares(b, MODE_TOKENS)
      if (!neutrals.length) continue
      if (!allowed.has(normalize(b.selectorText))) {
        problems.push(
          `${describeBlock(b)} declares ${neutrals.join(", ")} — MODE tokens may only appear in ` +
            `\`${LIGHT_MODE_SELECTOR} {\` and \`${DARK_MODE_SELECTOR} {\` (or inside @supports/@media)`
        )
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
    const light = blocks.filter((b) => normalize(b.selectorText) === normalize(LIGHT_MODE_SELECTOR) && declares(b, MODE_TOKENS).length)
    const dark = blocks.filter((b) => normalize(b.selectorText) === normalize(DARK_MODE_SELECTOR) && declares(b, MODE_TOKENS).length)
    expect(light.length, `no bare \`${LIGHT_MODE_SELECTOR} {\` block declares any MODE token`).toBeGreaterThan(0)
    expect(dark.length, `no bare \`${DARK_MODE_SELECTOR} {\` block declares any MODE token`).toBeGreaterThan(0)
  })

  it("(c) the dark MODE block comes after the last [data-theme=] block", () => {
    // Any block whose selector LIST includes the bare dark selector counts —
    // `[data-mode="dark"], [data-mode="dark"][data-theme="indigo"] {` was the
    // old shape, and it sat above the teal/ink blocks.
    const darkBlocks = blocks.filter(
      (b) => b.selectors.some((s) => normalize(s) === normalize(DARK_MODE_SELECTOR)) && declares(b, MODE_TOKENS).length
    )
    expect(darkBlocks.length, `no block with \`${DARK_MODE_SELECTOR}\` declares MODE tokens`).toBeGreaterThan(0)
    const lastTheme = themeBlocks.reduce<Block | null>((acc, b) => (!acc || b.index > acc.index ? b : acc), null)
    if (!lastTheme) return
    for (const d of darkBlocks) {
      expect(
        d.index,
        `dark MODE block at ${describeBlock(d)} precedes theme block at ${describeBlock(lastTheme)} — ` +
          `dark neutrals must be declared after every [data-theme=] block`
      ).toBeGreaterThan(lastTheme.index)
    }
  })

  describe("(d) resolved cascade: dark is dark, light is light", () => {
    for (const mode of MODES) {
      for (const theme of THEMES) {
        it(`${mode}/${theme}`, () => {
          const combo = `${mode}/${theme}`
          const resolved = resolve(blocks, mode, theme)
          const lit = (name: string) => literalOf(resolved, name, combo)
          const color = (name: string) => parseColor(lit(name), `[${combo}] ${name}`)
          const from = (name: string) => {
            const r = resolved.get(name)
            return r ? `${name}=${r.value} (from ${describeBlock(r.block)})` : `${name}=<undeclared>`
          }

          const page = over(color("--bg"), WHITE)
          const surface = over(color("--surface"), page)
          const border = over(color("--border"), surface)
          const hover = over(color("--hover"), surface)
          const text = over(color("--text"), surface)
          const lText = luminance(text)

          // Side alone is not enough: the shipped bug put a #eceeee border
          // under #ecefee text — "darker" by one green unit, still white on
          // white. So each neutral must also keep clear of the text: WCAG
          // body-text contrast for the surfaces text is drawn on, 3:1 for the
          // hairline (a border on the text's side of mid-grey is the leak).
          const checks: Array<[string, RGBA, number, string]> = [
            ["--border (over --surface)", border, 3, from("--border")],
            ["--hover (over --surface)", hover, 4.5, from("--hover")],
            ["--surface", surface, 4.5, from("--surface")],
            ["--bg", page, 4.5, from("--bg")],
          ]
          for (const [label, rgba, floor, origin] of checks) {
            const l = luminance(rgba)
            const ratio = (Math.max(l, lText) + 0.05) / (Math.min(l, lText) + 0.05)
            const msg =
              `[${combo}] ${label} resolves to ${fmt(rgba)} (L=${l.toFixed(3)}) against --text ${fmt(text)} ` +
              `(L=${lText.toFixed(3)}), contrast ${ratio.toFixed(2)}:1 — in ${mode} mode it must be ` +
              `${mode === "dark" ? "DARKER" : "LIGHTER"} than the text by at least ${floor}:1.\n` +
              `  ${origin}\n  ${from("--text")}`
            if (mode === "dark") expect(l, msg).toBeLessThan(lText)
            else expect(l, msg).toBeGreaterThan(lText)
            expect(ratio, msg).toBeGreaterThanOrEqual(floor)
          }
        })
      }
    }
  })

  it("(e) --accent-fg resolves in all six combinations", () => {
    for (const mode of MODES) {
      for (const theme of THEMES) {
        const resolved = resolve(blocks, mode, theme)
        expect(resolved.get("--accent-fg"), `[${mode}/${theme}] --accent-fg is not declared`).toBeDefined()
      }
    }
  })

  it("(f) --bad-fg resolves in both modes", () => {
    for (const mode of MODES) {
      for (const theme of THEMES) {
        const resolved = resolve(blocks, mode, theme)
        expect(resolved.get("--bad-fg"), `[${mode}/${theme}] --bad-fg is not declared`).toBeDefined()
      }
    }
  })
})
