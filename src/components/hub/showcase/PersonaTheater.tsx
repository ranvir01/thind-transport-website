"use client"

import { useEffect, useMemo, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { Pause, Play } from "lucide-react"
import {
  SHOWCASE_MOCK,
  SHOWCASE_PERSONAS,
  type ShowcasePersona,
  type ShowcasePersonaId,
} from "@/lib/hub/showcase"
import { readPreferences } from "@/lib/hub/preferences"
import { cn } from "@/lib/utils"

function cents(n: number) {
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function MockFrame({ persona, frameId }: { persona: ShowcasePersona; frameId: string }) {
  const phone = persona.device === "phone"
  const shell = phone
    ? "bg-navy-800 text-white border-white/15"
    : "bg-surface text-fg border-border"
  const muted = phone ? "text-steel-300" : "text-fg-2"
  const accent = phone ? "text-gold" : "text-accent-text"

  return (
    <div className={cn("rounded-xl border p-4 min-h-[200px]", shell)}>
      <p className={cn("text-[11px] font-semibold uppercase tracking-wide", muted)}>
        {persona.label} · {persona.frames.find((f) => f.id === frameId)?.screenTitle}
      </p>
      {persona.id === "dispatcher" && frameId === "today" ? (
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between">
            <span>THD-1001 pickup 09:00</span>
            <span className={accent}>On time</span>
          </li>
          <li className="flex justify-between">
            <span>{SHOWCASE_MOCK.active.ref} · {SHOWCASE_MOCK.active.lane}</span>
            <span className={phone ? "text-gold" : "text-warn"}>Unconfirmed</span>
          </li>
          <li className="flex justify-between">
            <span>{SHOWCASE_MOCK.load.ref} ready to bill</span>
            <span className={accent}>{cents(SHOWCASE_MOCK.money.unbilledCents)}</span>
          </li>
        </ul>
      ) : persona.id === "driver" ? (
        <div className="mt-3 space-y-3">
          <p className="font-semibold">{SHOWCASE_MOCK.active.lane}</p>
          <p className={cn("text-sm", muted)}>Unit 214 · {SHOWCASE_MOCK.active.status}</p>
          <div className="grid grid-cols-2 gap-2">
            <span className="rounded-lg border border-white/15 bg-navy-700 px-3 py-2 text-center text-sm font-semibold">
              I&apos;m here
            </span>
            <span className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-center text-sm font-semibold text-gold">
              Snap POD
            </span>
          </div>
        </div>
      ) : persona.id === "accountant" ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {SHOWCASE_MOCK.load.ref} · {SHOWCASE_MOCK.load.lane}
          </p>
          <p className={accent}>{cents(SHOWCASE_MOCK.load.rateCents)} · POD attached</p>
          <p className={muted}>Last settlement net {cents(SHOWCASE_MOCK.money.settleNetCents)}</p>
        </div>
      ) : persona.id === "broker" || persona.id === "shipper" ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-semibold">{SHOWCASE_MOCK.active.ref}</p>
          <p className={muted}>{SHOWCASE_MOCK.active.lane}</p>
          <p className={accent}>{SHOWCASE_MOCK.active.status} · POD when clear</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <p>Active loads 12</p>
          <p className={accent}>AR {cents(412500)}</p>
          <p>Pay queued {cents(SHOWCASE_MOCK.money.settleNetCents)}</p>
          <p className={muted}>2 compliance reds</p>
        </div>
      )}
    </div>
  )
}

export function PersonaTheater({
  initialPersona,
  compact = false,
}: {
  initialPersona?: ShowcasePersonaId
  compact?: boolean
}) {
  const reduced = useReducedMotion()
  const prefs = useMemo(() => (typeof window === "undefined" ? null : readPreferences()), [])
  const start = initialPersona ?? prefs?.defaultPersona ?? "dispatcher"
  const [personaId, setPersonaId] = useState<ShowcasePersonaId>(start)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(!reduced)
  const persona = SHOWCASE_PERSONAS.find((p) => p.id === personaId) ?? SHOWCASE_PERSONAS[0]
  const frame = persona.frames[frameIndex] ?? persona.frames[0]
  const captions = prefs?.captionsEnabled !== false
  const voiceover = prefs?.voiceoverEnabled === true

  useEffect(() => {
    setFrameIndex(0)
  }, [personaId])

  useEffect(() => {
    if (!playing || reduced) return
    const t = window.setTimeout(() => {
      setFrameIndex((i) => (i + 1) % persona.frames.length)
    }, frame.durationMs)
    return () => window.clearTimeout(t)
  }, [playing, reduced, frame.durationMs, frame.id, persona.frames.length])

  useEffect(() => {
    if (!voiceover || !playing || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(frame.voiceover)
    utter.rate = 1.05
    window.speechSynthesis.speak(utter)
    return () => window.speechSynthesis.cancel()
  }, [frame.voiceover, voiceover, playing])

  return (
    <div id="theater" className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap gap-2">
        {SHOWCASE_PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPersonaId(p.id)}
            className={cn(
              "min-h-[44px] rounded-full border px-3 py-1.5 text-sm font-semibold",
              p.id === personaId
                ? compact
                  ? "border-accent bg-accent-soft text-accent-text"
                  : "border-orange bg-orange text-white"
                : compact
                  ? "border-border text-fg-2 hover:bg-hover"
                  : "border-white/20 text-white/80 hover:bg-white/10"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={cn(persona.device === "phone" ? "mx-auto max-w-[360px]" : "w-full")}>
        <MockFrame persona={persona} frameId={frame.id} />
      </div>

      {captions ? (
        <p className={cn("text-sm leading-relaxed", compact ? "text-fg-2" : "text-white/85")}>
          {frame.voiceover}
        </p>
      ) : null}

      <ul className={cn("flex flex-wrap gap-2 text-xs", compact ? "text-fg-3" : "text-white/70")}>
        {frame.beats.map((beat) => (
          <li key={beat} className={cn("rounded-full border px-2 py-1", compact ? "border-border" : "border-white/20")}>
            {beat}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-semibold",
            compact ? "bg-accent text-accent-fg" : "bg-white text-slate-900"
          )}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <p className={cn("text-xs", compact ? "text-fg-3" : "text-white/60")}>
          {persona.roleLine} · {frameIndex + 1}/{persona.frames.length}
        </p>
      </div>
    </div>
  )
}
