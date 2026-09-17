"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Moon, Sun } from "lucide-react"
import {
  APPEARANCE_LABELS,
  applyAppearance,
  readAppearance,
  type HubAccentTheme,
  type HubColorMode,
} from "@/lib/hub/appearance"
import { PREFERENCE_DEFAULTS, readPreferences, writePreferences } from "@/lib/hub/preferences"
import { SHOWCASE_PERSONAS, type ShowcasePersonaId } from "@/lib/hub/showcase"
import { Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export function PreferencesPanel() {
  const [mode, setMode] = useState<HubColorMode>(() => readAppearance().mode)
  const [theme, setTheme] = useState<HubAccentTheme>(() => readAppearance().theme)
  const [prefs, setPrefs] = useState(() => readPreferences())

  const pickAppearance = (nextMode: HubColorMode, nextTheme: HubAccentTheme) => {
    setMode(nextMode)
    setTheme(nextTheme)
    applyAppearance(nextMode, nextTheme)
  }

  const patchPrefs = (next: Partial<typeof prefs>) => {
    setPrefs(writePreferences(next))
  }

  return (
    <div className="max-w-xl space-y-4">
      <Panel className="p-4">
        <h2 className="text-[13.5px] font-semibold text-fg">Appearance</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["light", "dark"] as HubColorMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickAppearance(m, theme)}
              className={cn(
                "flex min-h-[44px] items-center justify-center gap-2 rounded-control text-sm font-medium",
                mode === m ? "bg-accent-soft text-accent-text" : "hover:bg-hover text-fg-2"
              )}
            >
              {m === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {m === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          {(["indigo", "teal", "ink"] as HubAccentTheme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pickAppearance(mode, t)}
              className={cn(
                "flex min-h-[44px] w-full items-center justify-between rounded-control px-3 text-sm",
                theme === t ? "bg-accent-soft font-semibold text-accent-text" : "hover:bg-hover text-fg-2"
              )}
            >
              {APPEARANCE_LABELS[t]}
              {theme === t ? <Check className="h-4 w-4" /> : null}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <h2 className="text-[13.5px] font-semibold text-fg">Tours & theater</h2>
        <label className="mt-3 flex min-h-[44px] items-center justify-between gap-3 text-sm text-fg-2">
          Captions on walkthroughs
          <input
            type="checkbox"
            checked={prefs.captionsEnabled}
            onChange={(e) => patchPrefs({ captionsEnabled: e.target.checked })}
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm text-fg-2">
          Spoken voiceover (browser speech)
          <input
            type="checkbox"
            checked={prefs.voiceoverEnabled}
            onChange={(e) => patchPrefs({ voiceoverEnabled: e.target.checked })}
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm text-fg-2">
          Default showcase seat
          <select
            className="rounded-control border border-border-strong bg-surface px-2 py-1 text-fg"
            value={prefs.defaultPersona}
            onChange={(e) => patchPrefs({ defaultPersona: e.target.value as ShowcasePersonaId })}
          >
            {SHOWCASE_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-fg-3">
          Defaults: {PREFERENCE_DEFAULTS.density} density, captions on, voiceover off.
        </p>
      </Panel>

      <p className="text-sm text-fg-3">
        Need a walkthrough?{" "}
        <Link href="/hub/help" className="font-medium text-accent-text hover:underline">
          Open Help
        </Link>{" "}
        or the{" "}
        <Link href="/loadoff#theater" className="font-medium text-accent-text hover:underline">
          public persona theater
        </Link>
        .
      </p>
    </div>
  )
}
