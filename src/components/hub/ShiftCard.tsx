"use client"

/**
 * Shift Mode's cockpit, mounted with the sandbox banner for the three core
 * seats (dispatcher · company driver · accountant). Clock in snapshots a
 * baseline into THIS browser (no tables — recap-only scoring by design),
 * live objectives diff against it while the sim runs, and End shift deals
 * the recap — a BottomSheet (touch-first, centered card on desktop) with a
 * checkmark-draw, skeleton loading while the final snapshot lands, and a
 * one-tap "Copy recap" (the GTM asset). A sandbox reset mints a new sim
 * epoch, which voids any shift started before it — the card says so instead
 * of scoring stale math. Reduced motion: CheckDraw collapses to a static
 * check via the global reduce block; everything else is plain layout.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Circle, Clock3, Copy, Loader2, Play, Square, X } from "lucide-react"
import { toast } from "sonner"
import { endShiftAction, shiftStatusAction, startShiftAction } from "@/app/hub/_actions/sandbox-shift"
import { BottomSheet } from "@/components/hub/BottomSheet"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { SANDBOX_CARRIER_NAME } from "@/lib/hub/sandbox"
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
  | { kind: "ending"; stored: StoredShift }
  | { kind: "recap"; evaluation: ShiftEvaluation }
  | { kind: "voided" }

const seatPitch: Record<string, string> = {
  dispatcher: "Brokers keep calling while you're on. Book, assign, keep the board tight.",
  driver: "Your truck is rolling. Arrive, load, deliver, shoot the POD.",
  accountant: "PODs keep landing. Bill them out and watch the money come back.",
}

function recapText(ev: ShiftEvaluation): string {
  const done = ev.objectives.filter((o) => o.done)
  const parts = [
    `My shift at ${SANDBOX_CARRIER_NAME.replace(" (Sandbox)", "")}: ${done.length}/${ev.objectives.length} objectives in ${ev.minutes} min`,
  ]
  if (ev.onTimePct !== null) parts.push(`${ev.onTimePct}% on-time`)
  parts.push(`score ${ev.score}%`)
  return `${parts.join(" · ")} — LoadOff Shift Mode`
}

export function ShiftCard({ seat, dark = false }: { seat: string; dark?: boolean }) {
  const storageKey = `sandbox-shift-${seat}`
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [busy, setBusy] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const forget = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {}
  }, [storageKey])

  const refresh = useCallback(async () => {
    const current = phaseRef.current
    if (current.kind !== "on") return
    const res = await shiftStatusAction()
    if (res.off) {
      // Shift Mode was switched off under a tab that was already open.
      forget()
      setPhase({ kind: "idle" })
      return
    }
    if (!res.ok || !res.metrics || !res.epoch) return // transient — keep the shift
    if (res.epoch !== current.stored.epoch) {
      forget()
      setPhase({ kind: "voided" })
      return
    }
    if (isShiftSeat(seat)) {
      setPhase({ kind: "on", stored: current.stored, live: evaluateShift(seat, current.stored.baseline, res.metrics) })
    }
  }, [seat, forget])

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
      } else {
        toast.error(res.error ?? "Couldn't start the shift — try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  /**
   * End the shift. The baseline lives ONLY in this browser, so it is cleared
   * exactly twice: on a real recap, and on a real epoch mismatch (the world
   * it happened in is gone). A transient failure — DB hiccup, dropped
   * connection, a request that never came back — keeps the shift on and
   * offers a retry; losing someone's shift to a blip and blaming a reset
   * that never happened is the worse outcome by far.
   */
  const endShift = async () => {
    const current = phaseRef.current
    if (current.kind !== "on" || !isShiftSeat(seat)) return
    setPhase({ kind: "ending", stored: current.stored }) // sheet opens on skeleton
    try {
      const res = await Promise.race([
        endShiftAction(current.stored.epoch),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000)),
      ])
      // The user may have dismissed the sheet while this was in flight —
      // don't yank it back open on top of them.
      if (phaseRef.current.kind !== "ending") return
      if (res.ok && res.metrics && res.epoch === current.stored.epoch) {
        forget()
        setPhase({ kind: "recap", evaluation: evaluateShift(seat, current.stored.baseline, res.metrics) })
      } else if (res.off) {
        forget()
        setPhase({ kind: "idle" })
      } else if (res.ok && res.epoch && res.epoch !== current.stored.epoch) {
        forget()
        setPhase({ kind: "voided" })
      } else {
        setPhase({ kind: "on", stored: current.stored, live: null })
        toast.error(res.error ?? "Couldn't close out the shift — try again.")
      }
    } catch {
      if (phaseRef.current.kind !== "ending") return
      setPhase({ kind: "on", stored: current.stored, live: null })
      toast.error("Couldn't reach the shift board — you're still on shift.")
    }
  }

  const copyRecap = async (ev: ShiftEvaluation) => {
    try {
      await navigator.clipboard.writeText(recapText(ev))
      toast.success("Recap copied")
    } catch {
      toast.error("Couldn't reach the clipboard")
    }
  }

  const card = cn(
    "mt-2 rounded-card border p-3.5 shadow-card",
    dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-surface"
  )
  const strong = dark ? "text-white" : "text-fg"
  const soft = dark ? "text-steel-300" : "text-fg-2"
  const press = "touch-manipulation transition-transform duration-fast active:scale-[0.98]"

  const objectiveRows = (objectives: ShiftEvaluation["objectives"], onSheet = false) => (
    <ul className="space-y-1" aria-live={onSheet ? undefined : "polite"}>
      {objectives.map((o) => (
        <li
          key={o.key}
          className={cn("flex items-center gap-2 text-[12.5px]", onSheet ? "text-fg-2" : soft)}
        >
          {o.done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden />
          ) : (
            <Circle
              className={cn("h-4 w-4 shrink-0", onSheet ? "text-fg-3" : dark ? "text-steel-500" : "text-fg-3")}
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1">{o.label}</span>
          <span className="tabular-nums">
            {o.progress}/{o.target}
            <span className="sr-only">{o.done ? " — done" : ""}</span>
          </span>
        </li>
      ))}
    </ul>
  )

  const sheetOpen = phase.kind === "ending" || phase.kind === "recap"
  const sheet = (
    <BottomSheet
      open={sheetOpen}
      onOpenChange={(open) => {
        if (open) return
        if (phase.kind === "recap") setPhase({ kind: "idle" })
        // Closing mid-"ending" returns you to the shift rather than trapping
        // you in a focus-locked skeleton if the snapshot is slow; the
        // in-flight request resolves harmlessly against the phase check.
        else if (phase.kind === "ending") setPhase({ kind: "on", stored: phase.stored, live: null })
      }}
      title="Shift recap"
      description="How the board looks after your shift."
    >
      {phase.kind === "recap" ? (
        <div>
          <div className="flex items-start gap-3">
            <CheckDraw size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-fg">
                {phase.evaluation.score}% · {phase.evaluation.minutes} min
              </p>
              <p className="mt-0.5 text-[13px] text-fg-2">{phase.evaluation.headline}</p>
            </div>
          </div>
          <div className="mt-3">{objectiveRows(phase.evaluation.objectives, true)}</div>
          {phase.evaluation.onTimePct !== null ? (
            <p className="mt-2 text-[12.5px] text-fg-2">On-time deliveries: {phase.evaluation.onTimePct}%</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void copyRecap(phase.evaluation)}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border px-3.5 text-[13px] font-semibold text-fg hover:bg-hover",
                press
              )}
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy recap
            </button>
            <button
              onClick={() => setPhase({ kind: "idle" })}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-control bg-accent px-3.5 text-[13px] font-semibold text-white hover:bg-accent-hover",
                press
              )}
            >
              <Play className="h-4 w-4" aria-hidden />
              Start another shift
            </button>
          </div>
        </div>
      ) : (
        // Skeleton while the final snapshot lands.
        <div aria-busy="true" className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-hover" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-pill bg-hover" />
              <div className="h-3 w-44 animate-pulse rounded-pill bg-hover" />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded-pill bg-hover" style={{ width: `${86 - i * 9}%` }} />
          ))}
        </div>
      )}
    </BottomSheet>
  )

  if (phase.kind === "idle" || phase.kind === "ending" || phase.kind === "recap") {
    return (
      <>
        <div className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13px] font-semibold", strong)}>Work a live shift</p>
              <p className={cn("mt-0.5 text-[12.5px]", soft)}>
                {seatPitch[seat] ?? "The company runs in real time while you play."}
              </p>
            </div>
            <button
              onClick={clockIn}
              disabled={busy || sheetOpen}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-control bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50",
                press
              )}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" aria-hidden />}
              Clock in
            </button>
          </div>
        </div>
        {sheet}
      </>
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
              "-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control",
              press,
              dark ? "text-steel-400 hover:bg-white/10 hover:text-white" : "text-fg-3 hover:bg-hover hover:text-fg"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
          onClick={endShift}
          className={cn(
            "ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-control border px-3.5 py-1.5 text-[13px] font-semibold",
            press,
            dark ? "border-white/20 text-white hover:bg-white/10" : "border-border text-fg hover:bg-hover"
          )}
        >
          <Square className="h-3.5 w-3.5" aria-hidden />
          End shift
        </button>
      </div>
      {live ? (
        <div className="mt-2">{objectiveRows(live.objectives)}</div>
      ) : (
        <p className={cn("mt-2 text-[12.5px]", soft)} aria-live="polite">
          Reading the board…
        </p>
      )}
    </div>
  )
}
