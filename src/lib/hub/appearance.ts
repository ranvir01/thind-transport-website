export type HubColorMode = "light" | "dark"
export type HubAccentTheme = "indigo" | "teal" | "ink"

const MODE_KEY = "hauldesk-mode"
const THEME_KEY = "hauldesk-theme"

const COLOR_MODES: readonly HubColorMode[] = ["light", "dark"]
const ACCENT_THEMES: readonly HubAccentTheme[] = ["indigo", "teal", "ink"]

export function isColorMode(value: unknown): value is HubColorMode {
  return typeof value === "string" && (COLOR_MODES as readonly string[]).includes(value)
}

export function isAccentTheme(value: unknown): value is HubAccentTheme {
  return typeof value === "string" && (ACCENT_THEMES as readonly string[]).includes(value)
}

export function readAppearance(): { mode: HubColorMode; theme: HubAccentTheme } {
  if (typeof window === "undefined") return { mode: "light", theme: "indigo" }
  // localStorage access throws under "block all cookies"/private-mode
  // policies — a blocked preference must never crash the shell.
  try {
    // Allowlist, never cast: a stale or garbage value would stamp an unmatched
    // data-theme/data-mode and the page would silently fall back to indigo/light
    // while the menu claimed otherwise.
    const mode = localStorage.getItem(MODE_KEY)
    const theme = localStorage.getItem(THEME_KEY)
    return {
      mode: isColorMode(mode) ? mode : "light",
      theme: isAccentTheme(theme) ? theme : "indigo",
    }
  } catch {
    return { mode: "light", theme: "indigo" }
  }
}

/** Page background per surface — must track hub-theme.css and the navy scale. */
const BAR_COLOR: Record<HubColorMode, string> = { light: "#fbfbfd", dark: "#08090d" }
const FORCED_DARK_BAR = "#121316"

/**
 * iOS tints the address bar from `theme-color`. The office mode lives in
 * localStorage, not the OS, so a static prefers-color-scheme pair puts a dark
 * bar over a light page on any phone set to dark — half-dark chrome that reads
 * as a bug. Keep the tag in step with the mode we actually applied. The boot
 * script in app/hub/layout.tsx does the same on first paint; this handles the
 * live toggle so the bar changes with the page, not on the next reload.
 */
export function themeColorFor(mode: HubColorMode, pathname: string): string {
  // Driver and portal are navy by class, not by data-mode, so a stored "light"
  // must never put a white bar over the driver app. The trailing boundary
  // matters: /hub/drivers is the OFFICE roster and takes office chrome.
  const forcedDark = /^\/hub\/(driver|portal)(\/|$)/.test(pathname)
  return forcedDark ? FORCED_DARK_BAR : BAR_COLOR[mode]
}

export function syncThemeColor(mode: HubColorMode) {
  if (typeof document === "undefined") return
  // Never let the address-bar tint break the actual mode switch: this is
  // cosmetic chrome, and applyAppearance's job is the page. Same posture as the
  // localStorage guards above.
  try {
    const color = themeColorFor(mode, window.location?.pathname ?? "")
    let tags = [...document.head.querySelectorAll('meta[name="theme-color"]')]
    if (tags.length === 0) {
      const meta = document.createElement("meta")
      meta.setAttribute("name", "theme-color")
      document.head.appendChild(meta)
      tags = [meta]
    }
    // Rewrite EVERY tag rather than deduping to one. The root layout emits its
    // own, React re-hoists metadata after hydration, and the browser honours
    // whichever comes first — so making them all agree is the only version of
    // this that cannot be raced.
    for (const tag of tags) {
      tag.removeAttribute("media")
      tag.setAttribute("content", color)
    }
  } catch {
    /* no head, or a locked-down document — the page is still themed */
  }
}

export function applyAppearance(mode: HubColorMode, theme: HubAccentTheme) {
  const root = document.documentElement
  root.setAttribute("data-app", "hauldesk")
  root.setAttribute("data-mode", mode)
  root.setAttribute("data-theme", theme)
  syncThemeColor(mode)
  try {
    localStorage.setItem(MODE_KEY, mode)
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* preference won't persist — the attributes above still apply */
  }
}

export const APPEARANCE_LABELS: Record<HubAccentTheme, string> = {
  indigo: "Indigo",
  teal: "Teal",
  ink: "Ink",
}
