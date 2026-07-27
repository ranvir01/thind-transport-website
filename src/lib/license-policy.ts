/**
 * License policy for a proprietary repository.
 *
 * The rule this encodes: Thind Transport's website and LoadOff are closed
 * source, so a production dependency must not carry a license that reaches our
 * own code. That is a legal constraint, not a preference, and it is easy to
 * violate by accident — a copyleft package three levels down in the tree ships
 * exactly as surely as a direct one.
 *
 * The distinction that matters, and that a blunt "no copyleft" rule gets
 * wrong: strong copyleft (GPL, LGPL, AGPL, SSPL) reaches the linked or served
 * work and is genuinely disqualifying, while weak, file-level copyleft
 * (MPL-2.0, EPL, CDDL) explicitly permits combination with proprietary code
 * and only obligates us if we modify the licensed files themselves. Treating
 * the second as fatal would have us rip out `web-push` for no reason; treating
 * it as permissive would lose the real "never fork and edit this" rule. So it
 * gets its own verdict.
 *
 * Consumed by scripts/license-audit.mjs, which walks the installed tree.
 */

export type LicenseVerdict =
  /** Permissive, or dual-licensed with a permissive option we can take. */
  | "ok"
  /** File-level copyleft: fine unmodified, must never be vendored and edited. */
  | "weak"
  /** Reaches proprietary code. Disqualifying in a production dependency. */
  | "banned"
  /** Unrecognized — a human has to look. */
  | "review"

/** Licenses that impose nothing beyond notice and attribution. */
export const PERMISSIVE_LICENSES = new Set([
  "MIT", "MIT-0", "ISC", "0BSD", "BSD", "BSD-2-Clause", "BSD-3-Clause",
  "Apache-2.0", "Unlicense", "CC0-1.0", "BlueOak-1.0.0", "Python-2.0",
  "WTFPL", "Zlib", "CC-BY-4.0", "CC-BY-3.0", "UNLICENSED",
  // Font and content licenses: redistribution is fine and attribution is owed;
  // the restrictions are on selling the asset alone and on reserved names.
  "OFL-1.1", "SIL OPEN FONT LICENSE", "EUPL-1.1+",
])

export const STRONG_COPYLEFT = /\b(AGPL|SSPL|GPL-\d|LGPL|OSL-|CPAL)/i
export const WEAK_COPYLEFT = /\b(MPL-|EPL-|CDDL)/i

/** Licenses whose text and copyright must travel with a redistribution. */
export const NEEDS_ATTRIBUTION =
  /^(Apache-2\.0|BSD|BSD-2-Clause|BSD-3-Clause|OFL-1\.1|SIL OPEN FONT LICENSE|MPL-2\.0|CC-BY-)/

/**
 * Upstream projects that must never be a source of code here, because their
 * licenses would relicense this repository. Recorded by name so the ban
 * survives the conversation it was set in.
 */
export const BANNED_UPSTREAM_PROJECTS = [
  "fleetbase", "erpnext", "documenso", "opensign", "titastransport", "loadpartner",
]

/** Split an SPDX expression into the identifiers it mentions. */
export function spdxTerms(expression: string): string[] {
  return expression
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND|WITH)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Judge an SPDX expression.
 *
 * OR means we may choose, so one permissive branch makes the whole expression
 * acceptable — "(MIT OR GPL-2.0)" is fine, and taking MIT is the point of
 * dual licensing. AND means every term binds at once, so a copyleft term
 * cannot be excused by a permissive one beside it.
 */
export function classifyLicense(expression: string): LicenseVerdict {
  const terms = spdxTerms(expression)
  if (/\bAND\b/i.test(expression) && STRONG_COPYLEFT.test(expression)) return "banned"
  if (terms.some((term) => PERMISSIVE_LICENSES.has(term))) return "ok"
  if (terms.some((term) => STRONG_COPYLEFT.test(term))) return "banned"
  if (terms.some((term) => WEAK_COPYLEFT.test(term))) return "weak"
  return "review"
}
