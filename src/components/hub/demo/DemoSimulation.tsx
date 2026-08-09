"use client"

/**
 * The LoadOff demo player — story-style: segmented progress rail, tap right
 * to advance / left to go back, pause, auto-advance per scene. Runs entirely
 * client-side on fabricated data so it works signed-out, offline, and on a
 * phone the moment the page loads. Scenes live in DemoScenes.tsx; the script
 * (timings, captions, cast) in lib/hub/demo-script.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react"
import { DEMO_SCENES } from "@/lib/hub/demo-script"
import { cn } from "@/lib/utils"
import {
  AutopilotScene, DispatchScene, InvoiceScene, OpenScene, PaidScene,
  PodScene, RateConScene, TodayScene, TrackScene, WrapScene, useStage,
} from "./DemoScenes"

function Scene({ id, onReplay }: { id: string; onReplay: () => void }) {
  const scene = DEMO_SCENES.find((s) => s.id === id)!
  const stage = useStage(scene.stepsMs)
  switch (id) {
    case "open": return <OpenScene stage={stage} />
    case "today": return <TodayScene stage={stage} />
    case "ratecon": return <RateConScene stage={stage} />
    case "dispatch": return <DispatchScene stage={stage} />
    case "track": return <TrackScene stage={stage} />
    case "pod": return <PodScene stage={stage} />
    case "invoice": return <InvoiceScene stage={stage} />
    case "paid": return <PaidScene stage={stage} />
    case "autopilot": return <AutopilotScene stage={stage} />
    case "wrap": return <WrapScene stage={stage} onReplay={onReplay} />
    default: return null
  }
}

export function DemoSimulation() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  // Remount key so "watch again" fully resets scene timelines.
  const [runId, setRunId] = useState(0)
  const elapsedRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)

  const scene = DEMO_SCENES[index]!
  const last = index === DEMO_SCENES.length - 1

  const go = useCallback(
    (next: number) => {
      elapsedRef.current = 0
      startedAtRef.current = null
      setIndex(Math.max(0, Math.min(DEMO_SCENES.length - 1, next)))
    },
    []
  )

  const replay = useCallback(() => {
    elapsedRef.current = 0
    startedAtRef.current = null
    setRunId((r) => r + 1)
    setIndex(0)
    setPlaying(true)
  }, [])

  // Pause-aware auto-advance. Runs under prefers-reduced-motion too — scene
  // visuals render fully drawn there, but the slideshow itself isn't motion;
  // without this the demo stalled with a Play button that did nothing.
  useEffect(() => {
    if (!playing || scene.durationMs === 0) return
    startedAtRef.current = performance.now()
    const remaining = Math.max(250, scene.durationMs - elapsedRef.current)
    const t = window.setTimeout(() => go(index + 1), remaining)
    return () => {
      window.clearTimeout(t)
      if (startedAtRef.current != null) {
        elapsedRef.current += performance.now() - startedAtRef.current
        startedAtRef.current = null
      }
    }
  }, [playing, index, scene.durationMs, go])

  // Keyboard: arrows navigate, space pauses (desktop testing nicety).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
      if (e.key === " ") {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, go])

  return (
    <div className="hauldesk-shell flex min-h-[100dvh] flex-col bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        {/* Progress rail */}
        <div className="flex items-center gap-1" aria-hidden>
          {DEMO_SCENES.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-2">
              <span
                key={`${runId}-${index}`}
                className={cn("block h-full origin-left rounded-pill bg-accent")}
                style={
                  i < index
                    ? { transform: "scaleX(1)" }
                    : i === index && scene.durationMs > 0
                      ? {
                          animation: `hub-progress ${scene.durationMs}ms linear forwards`,
                          animationPlayState: playing ? "running" : "paused",
                        }
                      : i === index
                        ? { transform: "scaleX(1)" }
                        : { transform: "scaleX(0)" }
                }
              />
            </span>
          ))}
        </div>

        {/* Top bar */}
        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-fg-3">
            LoadOff demo <span className="font-normal">· {scene.title}</span>
          </p>
          <Link
            href="/hub/login"
            aria-label="Exit demo"
            className="flex h-9 w-9 items-center justify-center rounded-control text-fg-3 hover:bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        {/* Stage — tap left third to go back, right two-thirds to advance */}
        <div className="relative min-h-0 flex-1 py-3">
          <div key={`${runId}-${scene.id}`} className="h-full">
            <Scene id={scene.id} onReplay={replay} />
          </div>
          {!last ? (
            <>
              <button
                type="button"
                aria-label="Previous scene"
                onClick={() => go(index - 1)}
                className="no-press touch-manipulation absolute inset-y-0 left-0 w-1/3 cursor-default"
                tabIndex={-1}
              />
              <button
                type="button"
                aria-label="Next scene"
                onClick={() => go(index + 1)}
                className="no-press touch-manipulation absolute inset-y-0 right-0 w-2/3 cursor-default"
                tabIndex={-1}
              />
            </>
          ) : null}
        </div>

        {/* Caption + controls */}
        <div className="pb-[calc(env(safe-area-inset-bottom,0px)+14px)]">
          <p className="min-h-[40px] text-center text-[13.5px] leading-snug text-fg-2">{scene.caption}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Previous scene"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="flex h-11 w-11 items-center justify-center rounded-control text-fg-2 hover:bg-hover disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((p) => !p)}
              disabled={last}
              className="flex h-11 w-11 items-center justify-center rounded-control border border-border-strong text-fg hover:bg-hover disabled:opacity-40"
            >
              {playing ? <Pause className="h-4.5 w-4.5 h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px]" />}
            </button>
            <button
              type="button"
              aria-label="Next scene"
              onClick={() => go(index + 1)}
              disabled={last}
              className="flex h-11 w-11 items-center justify-center rounded-control text-fg-2 hover:bg-hover disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
