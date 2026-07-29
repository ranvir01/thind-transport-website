/**
 * Icon sets for `metadata.icons`, declared once because two different marks
 * ship from the same site.
 *
 * iOS takes the home-screen icon from `<link rel="apple-touch-icon">` before it
 * ever looks at the manifest's icons, so the apple entry — not the manifest —
 * decides what a driver ends up staring at on their phone. Pages that install
 * the app must therefore carry the LoadOff mark, and pages that are the website
 * must carry the carrier's.
 *
 * Next replaces the whole `icons` object per route segment rather than merging
 * it, which is why the favicons are shared here instead of being re-typed at
 * every override.
 */
import type { Metadata } from "next"

type Icons = NonNullable<Metadata["icons"]>

/** Browser-tab favicons. Identical everywhere; only the apple mark differs. */
const FAVICONS = [
  { url: "/favicon.ico", sizes: "32x32" },
  { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
  { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
]

/** The website: Thind Transport's own mark. */
export const SITE_ICONS = {
  icon: FAVICONS,
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
} satisfies Icons

/**
 * Any page Add to Home Screen may be performed on to install LoadOff — the
 * whole of /hub plus the marketing install pages. The home-screen icon is the
 * product's, even where the tab favicon stays the carrier's.
 */
export const APP_ICONS = {
  icon: FAVICONS,
  apple: [{ url: "/hub-icon-180.png", sizes: "180x180" }],
} satisfies Icons
