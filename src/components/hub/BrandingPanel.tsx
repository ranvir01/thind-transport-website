"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"
import { setBrandAccentAction } from "@/app/hub/_actions/onboarding"
import { Panel } from "@/components/hub/ui"

// Same six the signup wizard offers (SignupForm.tsx) so post-signup edits
// present the identical menu a new tenant chose from.
const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: "Amber", value: "#d97706" },
  { name: "Blue", value: "#2563eb" },
  { name: "Teal", value: "#0891b2" },
  { name: "Green", value: "#059669" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Red", value: "#dc2626" },
]

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function BrandingPanel({ currentAccent }: { currentAccent: string | null }) {
  const router = useRouter()
  const [accent, setAccent] = useState(currentAccent)
  const [pending, startTransition] = useTransition()

  const saved = (accent ?? "").toLowerCase() === (currentAccent ?? "").toLowerCase()
  const valid = accent !== null && HEX_RE.test(accent)

  const save = () => {
    if (!valid || accent === null) return
    startTransition(async () => {
      const result = await setBrandAccentAction(accent)
      if (result.ok) {
        toast.success("Accent color saved")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save")
      }
    })
  }

  return (
    <Panel className="max-w-3xl p-4 md:p-5 space-y-4">
      <p className="text-body-sm text-fg-2">
        The accent color shows on your invoices, settlement PDFs, customer statements, and the
        driver app icon. Pick a preset or use the swatch for an exact brand color.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Accent color">
        {ACCENT_PRESETS.map((preset) => {
          const selected = accent?.toLowerCase() === preset.value
          return (
            <button
              key={preset.value} type="button" role="radio" aria-checked={selected}
              onClick={() => setAccent(preset.value)}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-control border text-xs font-medium text-fg-2 ${selected ? "border-accent bg-surface-2" : "border-border hover:border-fg-3"}`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/10" style={{ backgroundColor: preset.value }}>
                {selected && <Check className="h-4 w-4 p-0.5 text-white" />}
              </span>
              {preset.name}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="brand_accent_custom" className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-border px-3 text-xs font-medium text-fg-2 hover:border-fg-3">
          <input
            id="brand_accent_custom"
            type="color"
            value={valid && accent !== null ? accent : "#d97706"}
            onChange={(e) => setAccent(e.target.value)}
            className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
          />
          Custom color
        </label>
        {accent && valid ? (
          <p className="text-body-xs text-fg-3">
            Documents will use <span className="font-semibold" style={{ color: accent }}>this color</span>
            <span className="ml-1 font-mono">{accent.toLowerCase()}</span>
          </p>
        ) : (
          <p className="text-body-xs text-fg-3">Using the standard look — nothing saved yet.</p>
        )}
      </div>

      <button
        onClick={save}
        disabled={pending || !valid || saved}
        className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saved ? "Saved" : "Save accent color"}
      </button>
    </Panel>
  )
}
