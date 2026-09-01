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
import { AlertTriangle, Banknote, CheckCircle2, Circle, Clock3, Copy, Loader2, Play, Square, X } from "lucide-react"
import { toast } from "sonner"
import { endShiftAction, shiftStatusAction, startShiftAction } from "@/app/hub/_actions/sandbox-shift"
import type { FeedItem } from "@/lib/hub/sandbox-feed"
import { BottomSheet } from "@/components/hub/BottomSheet"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { SANDBOX_CARRIER_NAME, SANDBOX_TOURS } from "@/lib/hub/sandbox"
import {
  beatsExisting,
  bestKey,
  betterThan,
  parseBest,
  worthRemembering,
  type PersonalBest,
} from "@/lib/hub/sandbox-best"
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

/** Storage read; the rules themselves live in lib/hub/sandbox-best.ts. */
function readBest(seat: string): PersonalBest | null {
  try {
    return parseBest(localStorage.getItem(bestKey(seat)))
  } catch {
    // Storage blocked entirely (private mode, site data off) — no record,
    // rather than a crash on the way into the banner.
    return null
  }
}

type Phase =
  | { kind: "idle" }
  | { kind: "on"; stored: StoredShift; live: ShiftEvaluation | null }
  | { kind: "ending"; stored: StoredShift }
  | { kind: "recap"; evaluation: ShiftEvaluation }
  | { kind: "voided" }

/** "3m ago" — the rail is about recency, and a clock time makes you do maths. */
function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

const seatPitch: Record<string, string> = {
  dispatcher: "Brokers keep calling while you're on. Book, assign, keep the board tight.",
  driver: "Your truck is rolling. Arrive, load, deliver, shoot the POD.",
  accountant: "PODs keep landing. Bill them out and watch the money come back.",
  owner: "The week's pay run is waiting. Approve it, pay it, move the money.",
  safety: "A truck is grounded and the register is open. Get it road-legal.",
  recruiter: "Seats to fill. Move the pipeline, get an offer signed, hire someone.",
  owner_operator: "Your truck, your money. Run the load, then get paid for it.",
}

/** Whole dollars — cents on a scoreboard is noise, and these are big numbers. */
const money = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`

function recapText(ev: ShiftEvaluation): string {
  const done = ev.objectives.filter((o) => o.done)
  const parts = [
    `My shift at ${SANDBOX_CARRIER_NAME.replace(" (Sandbox)", "")}: ${done.length}/${ev.objectives.length} objectives in ${ev.minutes} min`,
  ]
  if (ev.money.personalCents > 0) parts.push(`${ev.money.personalLabel.toLowerCase()} ${money(ev.money.personalCents)}`)
  if (ev.money.deliveredCents > 0) parts.push(`${money(ev.money.deliveredCents)} delivered company-wide`)
  if (ev.onTimePct !== null) parts.push(`${ev.onTimePct}% on-time`)
  parts.push(`score ${ev.score}%`)
  return `${parts.join(" · ")} — LoadOff Shift Mode`
}

export function ShiftCard({ seat, dark = false }: { seat: string; dark?: boolean }) {
  const storageKey = `sandbox-shift-${seat}`
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [busy, setBusy] = useState(false)
  // Read after mount, never during render — localStorage does not exist on
  // the server and a mismatch would hydrate-error the whole banner.
  const [best, setBest] = useState<PersonalBest | null>(null)
  /** True only when THIS shift knocked over a record that already existed. */
  const [beatRecord, setBeatRecord] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  // The sheet's trigger ("End shift") unmounts while the sheet is open, so
  // Radix has nowhere to return focus on close and it lands on <body>. Park
  // it on the card's own primary button instead — a keyboard user comes back
  // to where the shift lives, not to the top of the document.
  const clockInRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useCallback(() => {
    requestAnimationFrame(() => clockInRef.current?.focus())
  }, [])

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
    if (res.feed) setFeed(res.feed)
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

  useEffect(() => setBest(readBest(seat)), [seat])

  // The seat's own three moves. SANDBOX_TOURS has carried these since the
  // tours shipped, but SandboxBanner only rendered them for NON-shift seats —
  // so the seven seats that can actually clock in were the seven that were
  // never told what the job was.
  const moves = SANDBOX_TOURS[seat] ?? []

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
  }, [phase.kind, refresh])

  const clockIn = async () => {
    setBusy(true)
    try {
      const res = await startShiftAction()
      if (res.feed) setFeed(res.feed)
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
        const evaluation = evaluateShift(seat, current.stored.baseline, res.metrics)
        recordBest(evaluation)
        setPhase({ kind: "recap", evaluation })
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

  /**
   * Bank the shift if it beat the seat's record. Called once, at the recap —
   * the only moment a shift is finished AND its numbers are final. `beat` is
   * captured before the write so the recap can say so; reading it back from
   * storage afterwards would always report a tie with itself.
   */
  const recordBest = (ev: ShiftEvaluation) => {
    const next: PersonalBest = {
      score: ev.score,
      cents: ev.money.personalCents,
      minutes: ev.minutes,
      at: new Date().toISOString(),
    }
    const prev = readBest(seat)
    // A shift that did nothing is not a record — see worthRemembering.
    if (!worthRemembering(next)) return
    setBeatRecord(beatsExisting(prev, next))
    if (!betterThan(prev, next)) return
    try {
      localStorage.setItem(bestKey(seat), JSON.stringify(next))
    } catch {
      /* storage blocked — the shift still counted, it just is not remembered */
    }
    setBest(next)
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

  /**
   * What the shift was worth — yours on the left, the company's underneath.
   *
   * This is the answer to "why am I clicking these buttons": the freight you
   * booked has a rate on it, the legs you drove pay a wage the settlement
   * engine agrees with, and the company banked money while you did it —
   * including the money your AI teammates brought in. All real rows; nothing
   * here is a points system dressed up as dollars.
   */
  const moneyStrip = (m: ShiftEvaluation["money"], onSheet = false) => {
    const co: [string, number][] = [
      ["delivered", m.deliveredCents],
      ["billed", m.billedCents],
      ["collected", m.collectedCents],
    ]
    const live = co.filter(([, cents]) => cents > 0)
    if (m.personalCents <= 0 && live.length === 0 && m.rollingCents <= 0 && m.dwellingCents <= 0 && m.overdueCents <= 0)
      return null
    return (
      <div
        className={cn(
          "mt-2.5 rounded-control border px-2.5 py-2",
          onSheet
            ? "border-border bg-canvas"
            : dark
              ? "border-white/10 bg-white/[0.03]"
              : "border-border bg-canvas"
        )}
      >
        {m.personalCents > 0 ? (
          <p className="flex items-baseline gap-1.5">
            <Banknote
              className={cn("h-4 w-4 shrink-0 self-center text-ok")}
              aria-hidden
            />
            <span className={cn("text-[12.5px]", onSheet ? "text-fg-2" : soft)}>{m.personalLabel}</span>
            <span
              className={cn(
                "ml-auto text-[15px] font-semibold tabular-nums",
                onSheet ? "text-fg" : strong
              )}
            >
              {money(m.personalCents)}
            </span>
          </p>
        ) : null}
        {live.length > 0 || m.rollingCents > 0 ? (
          <p
            className={cn(
              "text-[11.5px] tabular-nums",
              m.personalCents > 0 && "mt-1.5 border-t pt-1.5",
              m.personalCents > 0 && (onSheet || !dark ? "border-border" : "border-white/10"),
              onSheet ? "text-fg-3" : dark ? "text-steel-400" : "text-fg-3"
            )}
          >
            {live.length > 0
              ? `Blue Ridge this shift: ${live.map(([label, cents]) => `${money(cents)} ${label}`).join(" · ")}`
              : // Nothing has landed yet — an arrival is minutes away, not
                // seconds. Say what IS true: the company's money is out there
                // on the road, which is the reason any of these seats exist.
                `${money(m.rollingCents)} of freight on the road right now`}
          </p>
        ) : null}
        {m.dwellingCents > 0 || m.overdueCents > 0 ? (
          <p
            className={cn(
              "mt-1.5 flex items-start gap-1.5 border-t pt-1.5 text-[11.5px] tabular-nums",
              onSheet || !dark ? "border-border" : "border-white/10",
              "text-warn"
            )}
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Costing you now:{" "}
              {[
                m.dwellingCents > 0 ? `${money(m.dwellingCents)} sitting at docks` : null,
                m.overdueCents > 0 ? `${money(m.overdueCents)} overdue` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </p>
        ) : null}
        {m.standing && m.personalCents > 0 ? (
          <p className={cn("mt-1 text-[11px]", onSheet ? "text-fg-3" : dark ? "text-steel-500" : "text-fg-3")}>
            On the road right now because of your work — not just this shift.
          </p>
        ) : null}
      </div>
    )
  }

  /**
   * The crew rail: proof you have colleagues.
   *
   * The world was always moving — brokers calling, trucks rolling, the back
   * office billing — but you had to go to the right page to catch any of it,
   * so a solo shift felt like working an empty building. Every row here is a
   * committed database row, and anything the simulation did says so.
   */
  const crewRail = () => {
    if (feed.length === 0) return null
    const now = Date.now()
    return (
      <div className={cn("mt-2.5 border-t pt-2", dark ? "border-white/10" : "border-border")}>
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", dark ? "text-steel-400" : "text-fg-3")}>
          Around you
        </p>
        <ul className="mt-1 space-y-1">
          {feed.slice(0, 4).map((f) => (
            <li key={f.id} className={cn("flex items-baseline gap-1.5 text-[12px]", soft)}>
              <span className={cn("font-medium", strong)}>{f.who}</span>
              {f.ai ? (
                <span
                  className={cn(
                    "rounded-pill px-1 text-[9.5px] font-semibold uppercase leading-[1.4]",
                    dark ? "bg-white/10 text-steel-300" : "bg-hover text-fg-3"
                  )}
                  title="Played by the simulation"
                >
                  AI
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">
                {f.text}
                {f.count > 1 ? <span className="sr-only"> ({f.count} events)</span> : null}
              </span>
              {f.cents ? <span className="shrink-0 tabular-nums">{money(f.cents)}</span> : null}
              <span className={cn("shrink-0 text-[10.5px]", dark ? "text-steel-500" : "text-fg-3")}>
                {ago(f.at, now)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const sheetOpen = phase.kind === "ending" || phase.kind === "recap"
  const sheet = (
    <BottomSheet
      open={sheetOpen}
      onOpenChange={(open) => {
        if (open) return
        if (phase.kind === "recap") {
          setPhase({ kind: "idle" })
          returnFocus()
        }
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
            {/* The drawn check is the milestone moment for a clean shift.
                Showing it over a half-finished one would congratulate the
                player for work the recap itself says is still waiting. */}
            {phase.evaluation.score === 100 ? (
              <CheckDraw size={44} />
            ) : (
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-border-strong text-[13px] font-bold tabular-nums text-fg-2"
              >
                {phase.evaluation.objectives.filter((o) => o.done).length}/
                {phase.evaluation.objectives.length}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-fg">
                {phase.evaluation.score}% · {phase.evaluation.minutes} min
              </p>
              <p className="mt-0.5 text-[13px] text-fg-2">{phase.evaluation.headline}</p>
              {/* Only when a record that ALREADY EXISTED fell. A first shift
                  setting the first best is not an achievement, and saying so
                  would make the banner congratulate everybody for showing up. */}
              {beatRecord ? (
                <p className="mt-1 text-[13px] font-semibold text-accent-text">
                  New best for this seat — you beat your last shift.
                </p>
              ) : best ? (
                <p className="mt-1 text-[13px] text-fg-3">
                  Your best here is still {best.score}% · {money(best.cents)}.
                </p>
              ) : null}
            </div>
          </div>
          {moneyStrip(phase.evaluation.money, true)}
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
              onClick={() => {
                setPhase({ kind: "idle" })
                returnFocus()
              }}
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
              ref={clockInRef}
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

          {/* The first sixty seconds. Everything below is what a person needs
              BEFORE they commit — what this seat actually does, the one rule
              about the clock that otherwise reads as a bug, and the number to
              beat. It is gone the moment they clock in; a running shift has
              live objectives and does not need the briefing again. */}
          {moves.length > 0 ? (
            <ol className={cn("mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]", soft)}>
              {moves.map((m, i) => (
                <li key={m.label} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill text-[10.5px] font-bold",
                      dark ? "bg-white/10 text-white" : "bg-hover text-fg-2"
                    )}
                  >
                    {i + 1}
                  </span>
                  {m.label}
                </li>
              ))}
            </ol>
          ) : null}

          <p className={cn("mt-2 flex items-start gap-1.5 text-[12px]", soft)}>
            <Clock3 className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
            {/* Stated in code comments and the owner handbook since Shift Mode
                shipped, and never once on screen — so "I closed the tab and
                came back to nothing" read as a freeze rather than the design. */}
            <span>
              The company only moves while this tab is open. Close it and time stops; come back
              and it catches up.
            </span>
          </p>

          {best ? (
            <p className={cn("mt-2 border-t pt-2 text-[12px]", dark ? "border-white/10" : "border-border", soft)}>
              Your best shift here: <span className={cn("font-bold", strong)}>{best.score}%</span> of the
              job, {money(best.cents)}
              {best.minutes > 0 ? ` in ${best.minutes}m` : ""}.
            </p>
          ) : null}
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
        <div className="mt-2">
          {objectiveRows(live.objectives)}
          {moneyStrip(live.money)}
          {crewRail()}
        </div>
      ) : (
        <p className={cn("mt-2 text-[12.5px]", soft)} aria-live="polite">
          Reading the board…
        </p>
      )}
    </div>
  )
}
