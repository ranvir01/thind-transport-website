import type { ShowcasePersonaId } from "@/lib/hub/showcase"

export type HubDensity = "comfortable" | "compact"

export interface HubPreferences {
  density: HubDensity
  captionsEnabled: boolean
  voiceoverEnabled: boolean
  defaultPersona: ShowcasePersonaId
}

const KEYS = {
  density: "loadoff-density",
  captions: "loadoff-captions",
  voiceover: "loadoff-voiceover",
  persona: "loadoff-default-persona",
} as const

export const PREFERENCE_DEFAULTS: HubPreferences = {
  density: "comfortable",
  captionsEnabled: true,
  voiceoverEnabled: false,
  defaultPersona: "dispatcher",
}

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  return raw === "1" || raw === "true"
}

export function readPreferences(): HubPreferences {
  if (typeof window === "undefined") return { ...PREFERENCE_DEFAULTS }
  const density = (localStorage.getItem(KEYS.density) as HubDensity | null) ?? PREFERENCE_DEFAULTS.density
  const persona =
    (localStorage.getItem(KEYS.persona) as ShowcasePersonaId | null) ?? PREFERENCE_DEFAULTS.defaultPersona
  return {
    density: density === "compact" ? "compact" : "comfortable",
    captionsEnabled: readBool(KEYS.captions, PREFERENCE_DEFAULTS.captionsEnabled),
    voiceoverEnabled: readBool(KEYS.voiceover, PREFERENCE_DEFAULTS.voiceoverEnabled),
    defaultPersona: persona,
  }
}

export function writePreferences(next: Partial<HubPreferences>): HubPreferences {
  const current = readPreferences()
  const merged: HubPreferences = { ...current, ...next }
  if (typeof window === "undefined") return merged
  localStorage.setItem(KEYS.density, merged.density)
  localStorage.setItem(KEYS.captions, merged.captionsEnabled ? "1" : "0")
  localStorage.setItem(KEYS.voiceover, merged.voiceoverEnabled ? "1" : "0")
  localStorage.setItem(KEYS.persona, merged.defaultPersona)
  return merged
}
