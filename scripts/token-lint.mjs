/**
 * Token lint (redesign hard rule): no raw hex colors, no raw pixel values in
 * the redesigned marketing components — every color, space, radius, shadow,
 * duration and easing must reference a token (tailwind.config.ts m-* system
 * or a semantic utility).
 *
 * Scope is the REDESIGNED surface only, listed below. Legacy marketing pages
 * and the hub keep their own conventions until their redesign pass touches
 * them — a repo-wide rule today would fail on hundreds of files nobody is
 * editing, and a lint that's always red teaches everyone to ignore it. Add
 * each file/dir here as it is redesigned.
 *
 * Allowed exceptions (each one deliberate):
 *  - 44px / 48px / 24px inside arbitrary values: WCAG tap-target minimums are
 *    defined in CSS pixels by the spec itself — they ARE the token.
 *  - 1px hairlines.
 *  - px inside comments and import paths.
 *
 * Run: node scripts/token-lint.mjs   (exit 1 on any violation)
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const SCOPE = [
  "src/components/home/AudienceSelector.tsx",
  "src/components/ui/Reveal.tsx",
  "src/components/features/GetTheApp.tsx",
  "src/components/features/WhySwitch.tsx",
  "src/app/brokers",
  "src/app/app",
  "src/app/drivers",
]

// 0px included: IntersectionObserver rootMargin strings require units even
// for zero — that's a browser API contract, not a design value.
const ALLOWED_PX = new Set(["0px", "1px", "24px", "44px", "48px"])

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

const violations = []

for (const root of SCOPE) {
  for (const file of files(root)) {
    if (!/\.(tsx|ts|css)$/.test(file)) continue
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, i) => {
      const trimmed = line.trimStart()
      // Block-comment bodies (` * ...`) are prose, not code.
      if (trimmed.startsWith("*") || trimmed.startsWith("/*")) return
      const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "")
      // Raw hex color anywhere in class/style code.
      const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g)
      if (hex) violations.push(`${file}:${i + 1}  raw hex ${hex.join(", ")}`)
      // Raw px outside the allowed accessibility constants.
      for (const m of code.matchAll(/\b(\d+(?:\.\d+)?px)\b/g)) {
        if (!ALLOWED_PX.has(m[1])) violations.push(`${file}:${i + 1}  raw ${m[1]}`)
      }
    })
  }
}

if (violations.length) {
  console.error(`❌ token-lint: ${violations.length} violation(s) — use m-* tokens, not raw values:\n`)
  for (const v of violations) console.error("  " + v)
  process.exit(1)
}
console.log("✅ token-lint: redesigned marketing scope is raw-hex/px free")
