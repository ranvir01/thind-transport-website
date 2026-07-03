"use client"

import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { getTour, type HubTour as HubTourDef } from "@/lib/hub/help"

type Rect = { top: number; left: number; width: number; height: number }

function measureTarget(selector: string | undefined): Rect | null {
  if (!selector || typeof document === "undefined") return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const pad = 6
  return {
    top: Math.max(8, r.top - pad),
    left: Math.max(8, r.left - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

export function HubTourOverlay({
  tour,
  onClose,
  onComplete,
}: {
  tour: HubTourDef
  onClose: () => void
  onComplete: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [spot, setSpot] = useState<Rect | null>(null)
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({})
  const step = tour.steps[stepIndex]
  const isLast = stepIndex >= tour.steps.length - 1

  const reposition = useCallback(() => {
    if (step.target) {
      document.querySelector(step.target)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
    const rect = measureTarget(step.target)
    setSpot(rect)

    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardW = Math.min(360, vw - 32)
    const cardH = 200

    if (!rect) {
      setCardStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: cardW,
        maxWidth: "calc(100vw - 2rem)",
      })
      return
    }

    let top = rect.top + rect.height + 14
    let left = rect.left

    if (top + cardH > vh - 16) top = Math.max(16, rect.top - cardH - 14)
    if (left + cardW > vw - 16) left = vw - cardW - 16
    if (left < 16) left = 16

    setCardStyle({
      position: "fixed",
      top,
      left,
      width: cardW,
      maxWidth: "calc(100vw - 2rem)",
    })
  }, [step.target])

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => reposition())
    return () => cancelAnimationFrame(frame)
  }, [reposition, stepIndex])

  useEffect(() => {
    const onResize = () => reposition()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [reposition])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const next = () => {
    if (isLast) {
      onComplete()
      return
    }
    setStepIndex((i) => i + 1)
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="hub-tour-title">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden
      />
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] motion-reduce:transition-none transition-[top,left,width,height] duration-200"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}

      <div
        className="z-[101] rounded-panel border border-border-strong bg-surface p-4 shadow-lg"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">
            {stepIndex + 1} of {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1 text-fg-3 hover:bg-hover hover:text-fg"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="hub-tour-title" className="text-[15px] font-semibold text-fg">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{step.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-[40px] items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            {isLast ? "Done" : "Next"}
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] items-center rounded-control px-3 text-sm font-medium text-fg-2 hover:bg-hover"
            >
              Skip tour
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const STORAGE_KEY = "hauldesk-tours-completed"

export function tourCompleted(id: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(id)
  } catch {
    return false
  }
}

export function markTourCompleted(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    if (!list.includes(id)) {
      list.push(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    }
  } catch {
    /* ignore */
  }
}

/** Reads ?tour= from URL and runs the matching spotlight tour. */
function HubTourHostInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tourId = searchParams.get("tour")
  const [active, setActive] = useState<HubTourDef | null>(null)

  useEffect(() => {
    if (!tourId) return
    const tour = getTour(tourId)
    if (!tour) return
    if (pathname !== tour.startPath) {
      router.replace(`${tour.startPath}?tour=${tourId}`)
      return
    }
    const t = window.setTimeout(() => setActive(tour), 150)
    return () => window.clearTimeout(t)
  }, [tourId, pathname, router])

  if (!tourId || !active) return null

  const finish = () => {
    markTourCompleted(active.id)
    setActive(null)
    router.replace(active.startPath)
  }

  return <HubTourOverlay tour={active} onClose={finish} onComplete={finish} />
}

export function HubTourHost() {
  return (
    <Suspense fallback={null}>
      <HubTourHostInner />
    </Suspense>
  )
}
