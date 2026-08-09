"use client"

/**
 * The LoadOff demo player — multi-seat: Dispatcher, Driver, Owner, Broker
 * view. Story-style segmented rail, tap right/left to advance/rewind, pause,
 * auto-advance per scene. Runs entirely client-side on fabricated data so it
 * works signed-out, offline, and on a phone the moment the page loads.
 * Scenes live in DemoScenes.tsx / DemoSeatScenes.tsx; the script (tracks,
 * timings, captions, cast) in lib/hub/demo-script.ts. Deep-link a seat with
 * /hub/demo?seat=driver.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Banknote, ChevronLeft, ChevronRight, Eye, Pause, Play, Send, Truck, X,
  type LucideIcon,
} from "lucide-react"
import { DEMO_TRACKS, demoTrack, type DemoTrackId } from "@/lib/hub/demo-script"
import { LoadOffMark } from "@/components/hub/LoadOffMark"
import { cn } from "@/lib/utils"
import {
  AutopilotScene, DispatchScene, InvoiceScene, OpenScene, PaidScene,
  PodScene, RateConScene, TodayScene, TrackScene, WrapScene, useStage,
} from "./DemoScenes"
import {
  BrokerDocsScene, BrokerScoreScene, BrokerTrackScene,
  DriverArriveScene, DriverOfferScene, DriverPayScene, DriverPodScene, DriverRunScene,
  OwnerBooksScene, OwnerComplyScene, OwnerFraudScene, OwnerPulseScene, OwnerSettleScene,
  SeatWrapScene,
} from "./DemoSeatScenes"

const TRACK_ICONS: Record<DemoTrackId, LucideIcon> = {
  office: Send,
  driver: Truck,
  owner: Banknote,
  broker: Eye,
}

const WRAP_HEADLINES: Record<DemoTrackId, string> = {
  office: "Take a load off.",
  driver: "Drive. Everything else files itself.",
  owner: "The back office runs itself.",
  broker: "Be the carrier they call back.",
}

function Scene({
  trackId,
  id,
  onSwitchSeat,
  onReplay,
}: {
  trackId: DemoTrackId
  id: string
  onSwitchSeat: () => void
  onReplay: () => void
}) {
  const scene = demoTrack(trackId)!.scenes.find((s) => s.id === id)!
  const stage = useStage(scene.stepsMs)
  switch (id) {
    // Dispatcher (original arc)
    case "open": return <OpenScene stage={stage} />
    case "today": return <TodayScene stage={stage} />
    case "ratecon": return <RateConScene stage={stage} />
    case "dispatch": return <DispatchScene stage={stage} />
    case "track": return <TrackScene stage={stage} />
    case "pod": return <PodScene stage={stage} />
    case "invoice": return <InvoiceScene stage={stage} />
    case "paid": return <PaidScene stage={stage} />
    case "autopilot": return <AutopilotScene stage={stage} />
    case "wrap": return <WrapScene stage={stage} onReplay={onReplay} onSwitchSeat={onSwitchSeat} />
    // Driver
    case "d-offer": return <DriverOfferScene stage={stage} />
    case "d-run": return <DriverRunScene stage={stage} />
    case "d-arrive": return <DriverArriveScene stage={stage} />
    case "d-pod": return <DriverPodScene stage={stage} />
    case "d-pay": return <DriverPayScene stage={stage} />
    // Owner
    case "o-pulse": return <OwnerPulseScene stage={stage} />
    case "o-fraud": return <OwnerFraudScene stage={stage} />
    case "o-settle": return <OwnerSettleScene stage={stage} />
    case "o-books": return <OwnerBooksScene stage={stage} />
    case "o-comply": return <OwnerComplyScene stage={stage} />
    // Broker
    case "b-track": return <BrokerTrackScene stage={stage} />
    case "b-docs": return <BrokerDocsScene stage={stage} />
    case "b-score": return <BrokerScoreScene stage={stage} />
    // Shared seat wraps
    case "d-wrap":
    case "o-wrap":
    case "b-wrap":
      return (
        <SeatWrapScene
          stage={stage}
          headline={WRAP_HEADLINES[trackId]}
          onSwitchSeat={onSwitchSeat}
          onReplay={onReplay}
        />
      )
    default: return null
  }
}

function SeatChooser({ onPick }: { onPick: (t: DemoTrackId) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center px-4 py-8">
      <div className="text-center">
        <LoadOffMark size={52} className="mx-auto" />
        <h1 className="mt-4 text-[24px] font-semibold tracking-tight text-fg">
          Run the whole company.
        </h1>
        <p className="mt-1 text-[14px] text-fg-2">
          Ninety seconds a seat. Fabricated data, real product.
        </p>
      </div>
      <div className="mt-6 space-y-2.5 hub-stagger">
        {DEMO_TRACKS.map((t) => {
          const Icon = TRACK_ICONS[t.id]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className="flex w-full items-center gap-3.5 rounded-card border border-border bg-surface p-4 text-left shadow-card hover:bg-hover"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold text-fg">{t.label}</span>
                  <span className="text-[11.5px] font-medium text-fg-3">{t.role}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-3">{t.blurb}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-3" />
            </button>
          )
        })}
      </div>
      <p className="mt-5 text-center text-[12px] text-fg-3">
        Already convinced?{" "}
        <Link href="/hub/login" className="font-semibold text-accent-text hover:underline">
          Open the real app
        </Link>
      </p>
    </div>
  )
}

export function DemoSimulation() {
  const [trackId, setTrackId] = useState<DemoTrackId | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  // Remount key so "watch again" fully resets scene timelines.
  const [runId, setRunId] = useState(0)
  const elapsedRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)

  // Deep link: /hub/demo?seat=driver
  useEffect(() => {
    try {
      const seat = new URLSearchParams(window.location.search).get("seat")
      if (seat && demoTrack(seat)) setTrackId(seat as DemoTrackId)
    } catch {
      /* no deep link */
    }
  }, [])

  const track = trackId ? demoTrack(trackId) : null
  const scenes = track?.scenes ?? []
  const scene = scenes[index]
  const last = index === scenes.length - 1

  const go = useCallback(
    (next: number) => {
      elapsedRef.current = 0
      startedAtRef.current = null
      setIndex((i) => {
        const max = (trackId ? demoTrack(trackId)!.scenes.length : 1) - 1
        void i
        return Math.max(0, Math.min(max, next))
      })
    },
    [trackId]
  )

  const pickTrack = useCallback((t: DemoTrackId) => {
    elapsedRef.current = 0
    startedAtRef.current = null
    setRunId((r) => r + 1)
    setTrackId(t)
    setIndex(0)
    setPlaying(true)
  }, [])

  const backToChooser = useCallback(() => {
    elapsedRef.current = 0
    startedAtRef.current = null
    setTrackId(null)
    setIndex(0)
    setPlaying(true)
  }, [])

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
    if (!track || !playing || !scene || scene.durationMs === 0) return
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
  }, [track, playing, index, scene, go])

  // Keyboard: arrows navigate, space pauses (desktop testing nicety).
  useEffect(() => {
    if (!track) return
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
  }, [track, index, go])

  if (!track || !scene) {
    return (
      <div className="hauldesk-shell flex min-h-[100dvh] flex-col bg-bg text-fg pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <SeatChooser onPick={pickTrack} />
      </div>
    )
  }

  return (
    <div className="hauldesk-shell flex min-h-[100dvh] flex-col bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        {/* Progress rail */}
        <div className="flex items-center gap-1" aria-hidden>
          {scenes.map((s, i) => (
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
          <button
            type="button"
            onClick={backToChooser}
            className="flex min-h-[36px] items-center gap-1 rounded-control pr-2 text-[12px] font-semibold text-fg-3 hover:bg-hover hover:text-fg-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {track.label} <span className="font-normal">· {scene.title}</span>
          </button>
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
          <div key={`${runId}-${trackId}-${scene.id}`} className="h-full">
            <Scene trackId={trackId!} id={scene.id} onSwitchSeat={backToChooser} onReplay={replay} />
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
              {playing ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px]" />}
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
