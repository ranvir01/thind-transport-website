"use client"

/**
 * Shift Mode's cockpit, mounted with the sandbox banner for the three core
 * seats (dispatcher · company driver · accountant). Clock in snapshots a
 * baseline into THIS browser (no tables — recap-only scoring by design),
 * live objectives diff against it while the sim runs, and clock out deals
 * the recap card. A sandbox reset mints a new sim epoch, which voids any
 * shift started before it — the card says so instead of scoring stale math.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Circle, Clock3, Loader2, Play, Square, X } from "lucide-react"
import { shiftStatusAction, startShiftAction } from "@/app/hub/_actions/sandbox-shift"
import {
  evaluateShift,
  isShiftSeat,
  type ShiftEvaluation,
  type ShiftMetrics,
} from "@/lib/hub/sandbox-objectives"
import { cn } from "@/lib/utils"

interface StoredShift {
  epoch: string
  baseline: ShiftMetrics
}

type Phase =
  | { kind: "idle" }
  | { kind: "on"; stored: StoredShift; live: ShiftEvaluation | null }
  | { kind: "recap"; evaluation: ShiftEvaluation }
  | { kind: "voided" }

const seatPitch: Record<string, string> = {
  dispatcher: "Brokers keep calling while you're on. Book, assign, keep the board tight.",
  driver: "Your truck is rolling. Arrive, load, deliver, shoot the POD.",
  accountant: "PODs keep landing. Bill them out and watch the money come back.",
}

export function ShiftCard({ seat, dark = false }: { seat: string; dark?: boolean }) {
  const storageKey = `sandbox-shift-${seat}`
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [busy, setBusy] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const refresh = useCallback(async () => {
    const current = phaseRef.current
    if (current.kind !== "on") return
    const res = await shiftStatusAction()
    if (!res.ok || !res.metrics || !res.epoch) return
    if (res.epoch !== current.stored.epoch) {
      try {
        localStorage.removeItem(storageKey)
      } catch {}
      setPhase({ kind: "voided" })
      return
    }
    if (isShiftSeat(seat)) {
      setPhase({ kind: "on", stored: current.stored, live: evaluateShift(seat, current.stored.baseline, res.metrics) })
    }
  }, [seat, storageKey])

  // Resume an in-flight shift after a reload; poll live objectives while on.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const stored = JSON.parse(raw) as StoredShift
        if (stored?.epoch && stored?.baseline) setPhase({ kind: "on", stored, live: null })
      }
    } catch {}
  }, [storageKey])
  useEffect(() => {
    if (phase.kind !== "on") return
    void refresh()
    const interval = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, refresh])

  const clockIn = async () => {
    setBusy(true)
    try {
      const res = await startShiftAction()
      if (res.ok && res.metrics && res.epoch) {
        const stored: StoredShift = { epoch: res.epoch, baseline: res.metrics }
        try {
          localStorage.setItem(storageKey, JSON.stringify(stored))
        } catch {}
        setPhase({ kind: "on", stored, live: null })
      }
    } finally {
      setBusy(false)
    }
  }

  const clockOut = async () => {
    if (phase.kind !== "on" || !isShiftSeat(seat)) return
    setBusy(true)
    try {
      const res = await shiftStatusAction()
      try {
        localStorage.removeItem(storageKey)
      } catch {}
      if (res.ok && res.metrics && res.epoch === phase.stored.epoch) {
        setPhase({ kind: "recap", evaluation: evaluateShift(seat, phase.stored.baseline, res.metrics) })
      } else {
        setPhase({ kind: "voided" })
      }
    } finally {
      setBusy(false)
    }
  }

  const card = cn(
    "mt-2 rounded-card border p-3.5 shadow-card",
    dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-surface"
  )
  const strong = dark ? "text-white" : "text-fg"
  const soft = dark ? "text-steel-300" : "text-fg-2"

  if (phase.kind === "idle") {
    return (
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("text-[13px] font-semibold", strong)}>Work a live shift</p>
            <p className={cn("mt-0.5 text-[12.5px]", soft)}>{seatPitch[seat] ?? "The company runs in real time while you play."}</p>
          </div>
          <button
            onClick={clockIn}
            disabled={busy}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-control bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Clock in
          </button>
        </div>
      </div>
    )
  }

  if (phase.kind === "voided") {
    return (
      <div className={card}>
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[13px]", soft)}>
            The sandbox was reset mid-shift, so that one's void — the world it happened in is gone.
          </p>
          <button
            onClick={() => setPhase({ kind: "idle" })}
            aria-label="Dismiss"
            className={cn(
              "-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
              dark ? "text-steel-400 hover:bg-white/10 hover:text-white" : "text-fg-3 hover:bg-hover hover:text-fg"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (phase.kind === "recap") {
    const ev = phase.evaluation
    return (
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={cn("text-[13px] font-semibold", strong)}>Shift recap · {ev.minutes} min</p>
            <p className={cn("mt-0.5 text-[12.5px]", soft)}>{ev.headline}</p>
          </div>
          <span className={cn("text-[22px] font-bold tabular-nums", strong)}>{ev.score}%</span>
        </div>
        <ul className="mt-2 space-y-1">
          {ev.objectives.map((o) => (
            <li key={o.key} className={cn("flex items-center gap-2 text-[12.5px]", soft)}>
              {o.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden />
              ) : (
                <Circle className={cn("h-4 w-4 shrink-0", dark ? "text-steel-500" : "text-fg-3")} aria-hidden />
              )}
              <span className="min-w-0 flex-1">{o.label}</span>
              <span className="tabular-nums">{o.progress}/{o.target}</span>
            </li>
          ))}
        </ul>
        {ev.onTimePct !== null ? (
          <p className={cn("mt-2 text-[12.5px]", soft)}>On-time deliveries: {ev.onTimePct}%</p>
        ) : null}
        <button
          onClick={() => setPhase({ kind: "idle" })}
          className={cn(
            "mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-control px-3 py-1.5 text-[13px] font-semibold",
            dark ? "text-white hover:bg-white/10" : "text-accent-text hover:bg-accent-soft"
          )}
        >
          <Play className="h-3.5 w-3.5" />
          Start another shift
        </button>
      </div>
    )
  }

  const live = phase.live
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", strong)}>
          <Clock3 className="h-4 w-4 text-ok" aria-hidden />
          On shift{live ? ` · ${live.minutes} min` : ""}
        </p>
        <button
          onClick={clockOut}
          disabled={busy}
          className={cn(
            "ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-control border px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50",
            dark ? "border-white/20 text-white hover:bg-white/10" : "border-border text-fg hover:bg-hover"
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
          Clock out
        </button>
      </div>
      {live ? (
        <ul className="mt-2 space-y-1">
          {live.objectives.map((o) => (
            <li key={o.key} className={cn("flex items-center gap-2 text-[12.5px]", soft)}>
              {o.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden />
              ) : (
                <Circle className={cn("h-4 w-4 shrink-0", dark ? "text-steel-500" : "text-fg-3")} aria-hidden />
              )}
              <span className="min-w-0 flex-1">{o.label}</span>
              <span className="tabular-nums">{o.progress}/{o.target}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("mt-2 text-[12.5px]", soft)}>Reading the board…</p>
      )}
    </div>
  )
}
