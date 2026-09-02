"use client"

import { useEffect, useMemo, useState } from "react"
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return reduced
}

function MockFrame({
  persona,
  frameId,
  compact,
}: {
  persona: ShowcasePersona
  frameId: string
  compact: boolean
}) {
  const phone = persona.device === "phone"
  const screen = persona.frames.find((f) => f.id === frameId)?.screenTitle ?? frameId
  const darkPhone = phone && !compact
  const shell = darkPhone
    ? "bg-navy-800 text-white border-white/15"
    : "bg-surface text-fg border-border"
  const muted = darkPhone ? "text-steel-300" : "text-fg-2"
  const accent = darkPhone ? "text-gold" : "text-accent-text"
  const warn = darkPhone ? "text-gold" : "text-warn"
  const tile = darkPhone ? "bg-navy-900 border-white/10" : "bg-surface-2 border-border"

  return (
    <div className={cn("min-h-[300px] rounded-xl border p-5", shell)}>
      <p className={cn("text-xs font-semibold uppercase tracking-wide", muted)}>
        {persona.label} · {screen}
      </p>
      <p className="mt-1 font-display text-2xl leading-tight">{persona.summary}</p>

      {persona.id === "dispatcher" ? (
        <ul className="mt-5 space-y-3 text-base">
          <li className={cn("flex items-center justify-between rounded-control border px-3 py-3", tile)}>
            <span>
              {SHOWCASE_MOCK.due.ref} · {SHOWCASE_MOCK.due.lane} {SHOWCASE_MOCK.due.window}
            </span>
            <span className={accent}>On time</span>
          </li>
          <li className={cn("flex items-center justify-between rounded-control border px-3 py-3", tile)}>
            <span>
              {SHOWCASE_MOCK.active.ref} · {SHOWCASE_MOCK.active.lane}
            </span>
            <span className={warn}>{frameId === "paste" ? "Rate parsed" : "Unconfirmed"}</span>
          </li>
          <li className={cn("flex items-center justify-between rounded-control border px-3 py-3", tile)}>
            <span>{SHOWCASE_MOCK.load.ref} ready to bill</span>
            <span className={accent}>{cents(SHOWCASE_MOCK.money.unbilledCents)}</span>
          </li>
        </ul>
      ) : persona.id === "driver" ? (
        <div className="mt-5 space-y-4">
          <p className="text-xl font-semibold">{SHOWCASE_MOCK.active.lane}</p>
          <p className={cn("text-base", muted)}>
            {SHOWCASE_MOCK.active.ref} · Unit 214 · {SHOWCASE_MOCK.active.status}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <span
              className={cn(
                "rounded-lg border px-3 py-4 text-center text-base font-semibold",
                darkPhone ? "border-white/15 bg-navy-700" : "border-border bg-surface-2"
              )}
            >
              I&apos;m here
            </span>
            <span
              className={cn(
                "rounded-lg border px-3 py-4 text-center text-base font-semibold",
                darkPhone ? "border-gold/40 bg-gold/10 text-gold" : "border-accent bg-accent-soft text-accent-text"
              )}
            >
              Snap POD
            </span>
          </div>
          <p className={cn("text-sm", muted)}>
            {frameId === "status" ? "Detention clock running · Snap & send unlocked" : "Appointment window pinned"}
          </p>
        </div>
      ) : persona.id === "accountant" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>Invoice</p>
            <p className="mt-1 font-mono text-xl">{SHOWCASE_MOCK.load.ref}</p>
          </div>
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>Rate</p>
            <p className={cn("mt-1 font-mono text-xl", accent)}>{cents(SHOWCASE_MOCK.load.rateCents)}</p>
          </div>
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>{frameId === "ifta" ? "Settle net" : "POD"}</p>
            <p className="mt-1 font-mono text-xl">
              {frameId === "ifta" ? cents(SHOWCASE_MOCK.money.settleNetCents) : "Attached"}
            </p>
          </div>
        </div>
      ) : persona.id === "broker" ? (
        <div className="mt-5 space-y-4">
          <p className="text-xl font-semibold">{SHOWCASE_MOCK.active.ref}</p>
          <p className={cn("text-base", muted)}>{SHOWCASE_MOCK.active.lane}</p>
          <p className={cn("text-lg font-semibold", accent)}>{SHOWCASE_MOCK.active.status}</p>
          <p className={cn("text-sm", muted)}>Live position · POD when clear · no check-call</p>
        </div>
      ) : persona.id === "shipper" ? (
        <div className="mt-5 space-y-4">
          <p className="text-xl font-semibold">Quote · {SHOWCASE_MOCK.load.lane}</p>
          <p className={cn("text-lg font-semibold", accent)}>
            {cents(SHOWCASE_MOCK.load.rateCents)} · {frameId === "quote" ? "Request sent" : "Track shipment"}
          </p>
          <p className={cn("text-sm", muted)}>Equipment + window in one form. POD lands in the same portal.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 text-base">
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>Active loads</p>
            <p className="mt-1 font-mono text-2xl">12</p>
          </div>
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>AR</p>
            <p className={cn("mt-1 font-mono text-2xl", accent)}>{cents(412500)}</p>
          </div>
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>Pay queued</p>
            <p className="mt-1 font-mono text-xl">{cents(SHOWCASE_MOCK.money.settleNetCents)}</p>
          </div>
          <div className={cn("rounded-control border p-4", tile)}>
            <p className={cn("text-xs", muted)}>Compliance</p>
            <p className={cn("mt-1 font-mono text-xl", warn)}>2 reds</p>
          </div>
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
  const reduced = usePrefersReducedMotion()
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
    setPlaying(!reduced)
  }, [reduced])

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
        <MockFrame persona={persona} frameId={frame.id} compact={compact} />
      </div>

      {captions ? (
        <p className={cn("text-base leading-relaxed", compact ? "text-fg-2" : "text-white/85")}>
          {frame.voiceover}
        </p>
      ) : null}

      <ul className={cn("flex flex-wrap gap-2 text-sm", compact ? "text-fg-3" : "text-white/70")}>
        {frame.beats.map((beat) => (
          <li key={beat} className={cn("rounded-full border px-3 py-1.5", compact ? "border-border" : "border-white/20")}>
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
        <p className={cn("text-sm", compact ? "text-fg-3" : "text-white/60")}>
          {persona.roleLine} · {frameIndex + 1}/{persona.frames.length}
        </p>
      </div>
    </div>
  )
}
