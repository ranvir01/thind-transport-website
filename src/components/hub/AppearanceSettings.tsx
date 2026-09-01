"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const ACCENTS = [
  { id: "graphite", label: "Graphite", swatch: "bg-neutral-900" },
  { id: "indigo", label: "Indigo", swatch: "bg-indigo-600" },
  { id: "emerald", label: "Emerald", swatch: "bg-emerald-600" },
  { id: "teal", label: "Teal", swatch: "bg-cyan-600" },
  { id: "amber", label: "Amber", swatch: "bg-amber-500" },
  { id: "violet", label: "Violet", swatch: "bg-violet-600" },
] as const

const MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const

function applyTheme(accent: string, mode: string) {
  document.documentElement.dataset.hauldeskAccent = accent
  document.documentElement.dataset.hauldeskMode = mode
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("hauldesk-dark", dark)
  localStorage.setItem("hauldesk-accent", accent)
  localStorage.setItem("hauldesk-mode", mode)
}

export function AppearanceSettings() {
  const [accent, setAccent] = useState(() =>
    typeof window === "undefined" ? "graphite" : localStorage.getItem("hauldesk-accent") || "graphite"
  )
  const [mode, setMode] = useState(() =>
    typeof window === "undefined" ? "system" : localStorage.getItem("hauldesk-mode") || "system"
  )

  useEffect(() => {
    applyTheme(accent, mode)
  }, [accent, mode])

  const chooseAccent = (value: string) => {
    setAccent(value)
  }
  const chooseMode = (value: string) => {
    setMode(value)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] p-4 md:p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">Accent</h2>
        <p className="mt-1 text-sm text-steel-200">Accent changes action color only. Status colors stay fixed.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseAccent(item.id)}
              className={cn(
                "flex min-h-[56px] items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold text-white",
                accent === item.id ? "border-gold bg-gold/10" : "border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              <span className={cn("h-6 w-6 rounded-full", item.swatch)} />
              <span className="flex-1">{item.label}</span>
              {accent === item.id ? <Check className="h-4 w-4 text-gold" /> : null}
            </button>
          ))}
        </div>

        <h2 className="mt-6 font-display text-lg font-bold uppercase tracking-wide text-white">Mode</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseMode(item.id)}
              className={cn(
                "min-h-[48px] rounded-xl border px-3 text-sm font-semibold",
                mode === item.id ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-steel-100 hover:bg-white/5"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(11,20,34,0.96))] p-4 md:p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">Live preview</h2>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-steel-300">Loads moving today</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-white">18</p>
          </div>
          <button className="min-h-[48px] w-full rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta">
            Primary action
          </button>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-emerald-300">Paid</span>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">Expiring</span>
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-red-300">Overdue</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-steel-200">
          This preference is saved per browser for quick iPhone testing. Carrier-wide persistence is planned with production settings.
        </p>
      </section>
    </div>
  )
}
