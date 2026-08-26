/**
 * The LoadOff visual identity — one definition, three consumers.
 *
 * The mark and its colours are shared by `scripts/generate-hub-icons.mjs`
 * (which bakes them into the PNGs iOS and Android install), by
 * `components/hub/LoadOffMark.tsx` (the mark rendered in app chrome), and by
 * the PWA manifest's default theme colour. Before this file each of those
 * carried its own hex literals and they had already drifted: the installed app
 * showed a navy-and-orange icon, opened on a navy splash, and then rendered an
 * indigo interface. Anything that draws LoadOff reads from here.
 *
 * This is deliberately NOT themeable. `carrier_settings.branding.accent` is a
 * tenant's own colour and it rightly overrides the manifest theme and the PDF
 * chrome — but the product mark stays the product's, the same way a carrier's
 * logo on an invoice does not repaint the software it was printed from. That
 * is also why the mark carries fixed hexes rather than the `--accent` token:
 * it must render identically in a PNG generated at build time, in light mode,
 * in dark mode, and under every tenant accent.
 */

/**
 * The mark: a solid typographic "L" — sharp inner corner, rounded outer ones.
 *
 * Drawn in a 0–100 box, bounded by x[24,76] y[23,77] so it is centred on
 * (50,50). That centring is load-bearing: the maskable icon and iOS's squircle
 * both clip to a shape centred on the tile, and the mark's half-diagonal
 * (≈37.5) sits inside the 40-unit radius Android's maskable safe zone
 * guarantees. Moving the path without re-checking that will crop the logo on
 * Android home screens.
 *
 * It reads as an L at 22px (nav) and at 40px (home screen), which is the whole
 * reason it is one shape. The mark it replaced layered road chevrons, a box, a
 * descending arrow and a ground line into the same tile; at icon size that is
 * not five ideas, it is noise.
 */
export const LOADOFF_MARK_PATH =
  "M24 30.5 a7.5 7.5 0 0 1 15 0 V62 H68.5 a7.5 7.5 0 0 1 0 15 H31.5 a7.5 7.5 0 0 1 -7.5 -7.5 Z"

/** The viewBox the mark is drawn in. */
export const LOADOFF_MARK_VIEWBOX = "0 0 100 100"

export const LOADOFF_BRAND = {
  /** Icon background, top of the gradient. Indigo, the product's accent hue. */
  indigo: "#6366F1",
  /** Icon background, bottom of the gradient. */
  indigoDeep: "#3730A3",
  /**
   * The launch colour: PWA `theme_color`/`background_color` and the cover the
   * website paints while an installed app redirects into itself. Deep enough
   * that the icon's gradient reads against it on the splash screen, and the
   * same hue family so the splash does not look like a different product from
   * the icon that launched it.
   */
  launch: "#1E1B4B",
  /** The mark itself. */
  glyph: "#FFFFFF",
} as const

/**
 * Corner radius of the standalone icon, as a fraction of its size. Applies to
 * the `purpose: "any"` PNGs and the SVG only — the maskable PNG and the
 * apple-touch icon are full-bleed squares, because Android and iOS each apply
 * their own mask and a pre-rounded tile leaves transparent corners for them to
 * fill with black.
 */
export const LOADOFF_ICON_RADIUS = 0.22

/**
 * How much of the tile the mark occupies per target.
 *
 * `any` and `apple` use the full box — the mark's own bbox already leaves ~24%
 * padding, which is the icon's padding. `maskable` shrinks slightly so the
 * mark clears Android's safe-zone circle with room to spare rather than by the
 * 2.5 units the raw geometry happens to give.
 */
export const LOADOFF_MARK_SCALE = {
  any: 1,
  apple: 1,
  maskable: 0.9,
} as const
