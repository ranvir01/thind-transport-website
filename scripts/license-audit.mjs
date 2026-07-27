/**
 * license-audit.mjs — this repo is proprietary, so a production dependency
 * must not carry a license that reaches our own code. AGPL and SSPL reach the
 * whole served service; GPL and LGPL reach the linked artifact. Any of them in
 * the deployed bundle is a legal problem, not a style preference.
 *
 * Weak, file-level copyleft (MPL-2.0, EPL, CDDL) is a different question and
 * gets a different verdict: those licenses explicitly permit combination with
 * proprietary code, so an unmodified dependency is fine and only forking-and-
 * editing the package triggers an obligation. Reported as a standing rule
 * rather than failed, so "don't vendor and modify web-push" is written down
 * somewhere instead of being folklore.
 *
 * Walks the installed tree from package.json's `dependencies` transitively — a
 * GPL package three levels down ships exactly as surely as a direct one — and
 * reads the license each package declares in its own package.json.
 *
 * USAGE
 *   node scripts/license-audit.mjs            # report; exits non-zero on strong copyleft
 *   node scripts/license-audit.mjs --json     # machine-readable
 *   node scripts/license-audit.mjs --notices  # regenerate THIRD_PARTY_NOTICES.md
 *
 * Dev dependencies are audited too but reported separately: a copylefted test
 * runner never reaches production, so it is worth knowing and not a blocker.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

/**
 * The policy itself lives in src/lib/license-policy.ts so it is unit-tested
 * and cannot drift from this script. Read as source rather than imported
 * because this is a plain .mjs with no TypeScript loader.
 */
const POLICY_SRC = readFileSync(path.join(ROOT, "src", "lib", "license-policy.ts"), "utf-8")

function policySet(name) {
  const body = POLICY_SRC.slice(POLICY_SRC.indexOf(`export const ${name} = new Set([`))
  return new Set(
    body
      .slice(body.indexOf("[") + 1, body.indexOf("])"))
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter((s) => s && !s.startsWith("//"))
  )
}

function policyRegex(name) {
  // Tolerates a line break after the `=` — prettier wraps the longer ones.
  const match = POLICY_SRC.match(new RegExp(`export const ${name}\\s*=\\s*(/.+/[a-z]*)`))
  if (!match) throw new Error(`license-policy.ts no longer exports ${name} as a regex literal`)
  const [, body, flags] = match[1].match(/^\/(.*)\/([a-z]*)$/)
  return new RegExp(body, flags)
}

const PERMISSIVE = policySet("PERMISSIVE_LICENSES")
const STRONG_COPYLEFT = policyRegex("STRONG_COPYLEFT")
const WEAK_COPYLEFT = policyRegex("WEAK_COPYLEFT")
const NEEDS_ATTRIBUTION = policyRegex("NEEDS_ATTRIBUTION")

function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf-8")) } catch { return null }
}

/** npm hoists, so resolve a package by walking up node_modules like Node does. */
function resolvePkgDir(name, fromDir) {
  let dir = fromDir
  for (;;) {
    const candidate = path.join(dir, "node_modules", name)
    if (existsSync(path.join(candidate, "package.json"))) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === "string") return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses) && pkg.licenses.length) {
    return pkg.licenses.map((l) => l.type ?? l).join(" OR ")
  }
  return "UNKNOWN"
}

/** Split an SPDX expression into the individual identifiers it mentions. */
function spdxTerms(expr) {
  return expr
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND|WITH)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * An expression is acceptable if ANY of its OR-branches is permissive — dual
 * licensing means we may choose the permissive one. "(MIT OR GPL-2.0)" is fine;
 * "MIT AND GPL-2.0" is not, and is treated conservatively as a flag.
 */
function classify(expr) {
  const terms = spdxTerms(expr)
  // An AND expression imposes every term at once, so a copyleft term in one
  // cannot be escaped by a permissive term in another.
  if (/\bAND\b/i.test(expr) && STRONG_COPYLEFT.test(expr)) return "banned"
  if (terms.some((t) => PERMISSIVE.has(t))) return "ok"
  if (terms.some((t) => STRONG_COPYLEFT.test(t))) return "banned"
  if (terms.some((t) => WEAK_COPYLEFT.test(t))) return "weak"
  return "review"
}

function walk(roots, fromDir) {
  const seen = new Map()
  const queue = roots.map((name) => ({ name, from: fromDir }))
  while (queue.length) {
    const { name, from } = queue.shift()
    if (seen.has(name)) continue
    const dir = resolvePkgDir(name, from)
    if (!dir) { seen.set(name, { name, license: "NOT INSTALLED", dir: null }); continue }
    const pkg = readJson(path.join(dir, "package.json"))
    if (!pkg) { seen.set(name, { name, license: "UNREADABLE", dir }); continue }
    seen.set(name, {
      name,
      version: pkg.version,
      license: licenseOf(pkg),
      dir,
      author: typeof pkg.author === "string" ? pkg.author : pkg.author?.name ?? null,
      homepage: pkg.homepage ?? pkg.repository?.url ?? null,
    })
    for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push({ dep, name: dep, from: dir })
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const rootPkg = readJson(path.join(ROOT, "package.json"))
const prod = walk(Object.keys(rootPkg.dependencies ?? {}), ROOT)
const dev = walk(Object.keys(rootPkg.devDependencies ?? {}), ROOT).filter(
  (d) => !prod.some((p) => p.name === d.name)
)

const banned = prod.filter((p) => classify(p.license) === "banned")
const weak = prod.filter((p) => classify(p.license) === "weak")
const review = prod.filter((p) => classify(p.license) === "review")
const devBanned = dev.filter((p) => classify(p.license) === "banned")

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ prod, dev, banned, weak, review, devBanned }, null, 2))
} else if (process.argv.includes("--notices")) {
  const attributable = prod
    .filter((p) => spdxTerms(p.license).some((t) => NEEDS_ATTRIBUTION.test(t)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const byLicense = new Map()
  for (const p of prod) {
    const key = p.license
    if (!byLicense.has(key)) byLicense.set(key, [])
    byLicense.get(key).push(p)
  }

  const lines = [
    "# Third-Party Notices",
    "",
    "Thind Transport's website and the LoadOff platform are proprietary. The",
    "software incorporates the third-party open-source packages listed below,",
    "each under its own license. Nothing here grants any right to the",
    "proprietary portions of this repository.",
    "",
    "This file is generated. To refresh it after a dependency change:",
    "",
    "```",
    "node scripts/license-audit.mjs --notices",
    "```",
    "",
    `Generated from ${prod.length} production packages (direct and transitive).`,
    "",
    "## Standing obligations",
    "",
    "Things that constrain what we may do, as opposed to notices we merely owe.",
    "",
    ...(weak.length
      ? [
          ...weak.flatMap((p) => [
            `- **\`${p.name}\` (${p.license})** — file-level copyleft. Combining it with`,
            "  proprietary code is explicitly permitted, so using it as a dependency is fine.",
            "  Forking it and editing its files is not: those files would have to be published",
            "  under the same license. Upgrade it, never vendor-and-modify it.",
          ]),
          "",
        ]
      : ["- None beyond attribution.", ""]),
    "- **`geist` (SIL Open Font License)** — the font may be bundled and served;",
    "  it may not be sold on its own, and the reserved font name must not be used",
    "  for a modified version.",
    "",
    "## Packages requiring attribution",
    "",
    "Apache-2.0, BSD, MPL-2.0, OFL, and CC-BY all require that their copyright",
    "notice and license text accompany redistribution. The full text of each ships",
    "inside the package's own directory under `node_modules/<name>/`.",
    "",
    "| Package | Version | License |",
    "| --- | --- | --- |",
    ...attributable.map((p) => `| \`${p.name}\` | ${p.version ?? "—"} | ${p.license} |`),
    "",
    "## All production dependencies by license",
    "",
    ...[...byLicense.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .flatMap(([license, pkgs]) => [
        `### ${license} — ${pkgs.length} package${pkgs.length === 1 ? "" : "s"}`,
        "",
        pkgs.map((p) => `\`${p.name}\``).join(", "),
        "",
      ]),
  ]
  writeFileSync(path.join(ROOT, "THIRD_PARTY_NOTICES.md"), lines.join("\n"))
  console.log(`Wrote THIRD_PARTY_NOTICES.md — ${prod.length} packages, ${attributable.length} needing attribution.`)
} else {
  console.log(`\n📜 license audit — ${prod.length} production packages, ${dev.length} dev-only\n`)
  const counts = new Map()
  for (const p of prod) counts.set(p.license, (counts.get(p.license) ?? 0) + 1)
  for (const [license, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${license}`)
  }
  if (weak.length) {
    console.log(`\n📎 ${weak.length} production package(s) under file-level (weak) copyleft:`)
    for (const p of weak) console.log(`   ${p.name}@${p.version ?? "?"} — ${p.license}`)
    console.log("   Fine as an unmodified dependency — these licenses explicitly permit")
    console.log("   combining with proprietary code. The obligation only bites if we fork")
    console.log("   the package and edit its files. Do not vendor-and-modify these.")
  }
  if (review.length) {
    console.log(`\n⚠️  ${review.length} package(s) with a license needing a human look:`)
    for (const p of review) console.log(`   ${p.name}@${p.version ?? "?"} — ${p.license}`)
  }
  if (devBanned.length) {
    console.log(`\nℹ️  ${devBanned.length} dev-only package(s) under strong copyleft (does not ship):`)
    for (const p of devBanned) console.log(`   ${p.name}@${p.version ?? "?"} — ${p.license}`)
  }
  if (banned.length) {
    console.log(`\n❌ ${banned.length} PRODUCTION package(s) under strong copyleft:`)
    for (const p of banned) console.log(`   ${p.name}@${p.version ?? "?"} — ${p.license}`)
    console.log("\nThis repo is proprietary and these licenses reach it. Remove or replace.\n")
    process.exit(1)
  }
  console.log("\n✅ No strong copyleft (AGPL/SSPL/GPL/LGPL) in production dependencies.\n")
}
