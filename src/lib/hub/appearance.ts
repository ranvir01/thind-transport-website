export type HubColorMode = "light" | "dark"
export type HubAccentTheme = "indigo" | "teal" | "ink"

const MODE_KEY = "hauldesk-mode"
const THEME_KEY = "hauldesk-theme"

export function readAppearance(): { mode: HubColorMode; theme: HubAccentTheme } {
  if (typeof window === "undefined") return { mode: "light", theme: "indigo" }
  const mode = (localStorage.getItem(MODE_KEY) as HubColorMode | null) ?? "light"
  const theme = (localStorage.getItem(THEME_KEY) as HubAccentTheme | null) ?? "indigo"
  return { mode, theme }
}

export function applyAppearance(mode: HubColorMode, theme: HubAccentTheme) {
  const root = document.documentElement
  root.setAttribute("data-app", "hauldesk")
  root.setAttribute("data-mode", mode)
  root.setAttribute("data-theme", theme)
  localStorage.setItem(MODE_KEY, mode)
  localStorage.setItem(THEME_KEY, theme)
}

export const APPEARANCE_LABELS: Record<HubAccentTheme, string> = {
  indigo: "Indigo",
  teal: "Teal",
  ink: "Ink",
}
