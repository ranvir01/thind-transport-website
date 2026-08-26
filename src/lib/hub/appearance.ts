export type HubColorMode = "light" | "dark"
export type HubAccentTheme = "indigo" | "teal" | "ink"

const MODE_KEY = "hauldesk-mode"
const THEME_KEY = "hauldesk-theme"

export function readAppearance(): { mode: HubColorMode; theme: HubAccentTheme } {
  if (typeof window === "undefined") return { mode: "light", theme: "indigo" }
  // localStorage access throws under "block all cookies"/private-mode
  // policies — a blocked preference must never crash the shell.
  try {
    const mode = (localStorage.getItem(MODE_KEY) as HubColorMode | null) ?? "light"
    const theme = (localStorage.getItem(THEME_KEY) as HubAccentTheme | null) ?? "indigo"
    return { mode, theme }
  } catch {
    return { mode: "light", theme: "indigo" }
  }
}

export function applyAppearance(mode: HubColorMode, theme: HubAccentTheme) {
  const root = document.documentElement
  root.setAttribute("data-app", "hauldesk")
  root.setAttribute("data-mode", mode)
  root.setAttribute("data-theme", theme)
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
