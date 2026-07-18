/**
 * Per-tenant accent for the customer-portal chrome (Phase 7 branding).
 *
 * The portal is a forced-dark surface (bg-navy), so a carrier's accent is
 * honored for TEXT only when it actually reads on that backdrop (WCAG
 * small-text contrast against the navy chrome); otherwise the label keeps
 * the default gold and the accent survives only as the header's low-alpha
 * bottom rule, where a dark tint is harmless. Trust rule matches pdf.ts and
 * the manifest route: only the exact `#RRGGBB` shape `setBrandAccentAction`
 * stores is honored — anything else renders the stock chrome.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const GOLD = "#F2A900"
/** The portal chrome backdrop (tailwind `navy` / `navy-500`). */
const NAVY = "#0E1621"
/** WCAG AA for normal-size text — the label is 10px, so no bold discount. */
const MIN_TEXT_CONTRAST = 4.5
/** Same subtlety as the stock `border-white/10` hairline it replaces. */
const DEFAULT_RULE = "rgba(255, 255, 255, 0.1)"

export interface PortalAccent {
  /** Color safe for small text on the navy chrome; defaults to brand gold. */
  text: string
  /** CSS color for the header's bottom rule. */
  rule: string
}

export const PORTAL_ACCENT_DEFAULT: PortalAccent = { text: GOLD, rule: DEFAULT_RULE }

function channels(hex: string): [number, number, number] {
  return [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((c) => parseInt(c, 16)) as [
    number,
    number,
    number,
  ]
}

/** WCAG 2.x relative luminance of a `#RRGGBB` color. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const srgb = c / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two `#RRGGBB` colors (>= 1). */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Resolve `carrier_settings.branding.accent` into the portal chrome colors.
 * Unset/invalid values return the stock chrome unchanged, so this can run
 * unconditionally (including the sessionless accept/[token] page).
 */
export function resolvePortalAccent(raw: string | null | undefined): PortalAccent {
  if (!raw || !HEX_COLOR.test(raw)) return PORTAL_ACCENT_DEFAULT
  const [r, g, b] = channels(raw)
  return {
    text: contrast(raw, NAVY) >= MIN_TEXT_CONTRAST ? raw : GOLD,
    rule: `rgba(${r}, ${g}, ${b}, 0.4)`,
  }
}
