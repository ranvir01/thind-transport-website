import Link from "next/link"
import { Gauge } from "lucide-react"
import { Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"
import {
  SAFETY_BAND_LABELS,
  SAFETY_EVENT_LABELS,
  SAFETY_WINDOW_WEEKS,
  safetyBand,
  type SafetyBand,
  type SafetyEventKind,
  type SafetyWeekScore,
} from "@/lib/hub/safety-score"
import type { DriverSafetyRow } from "@/lib/hub/safety-events-db"

const BAND_TONES: Record<SafetyBand, string> = {
  excellent: "text-ok",
  good: "text-ok",
  watch: "text-warn",
  at_risk: "text-bad",
}
const BAND_CHIPS: Record<SafetyBand, string> = {
  excellent: "border-ok-soft bg-ok-soft text-ok",
  good: "border-ok-soft bg-ok-soft text-ok",
  watch: "border-warn-soft bg-warn-soft text-warn",
  at_risk: "border-bad-soft bg-bad-soft text-bad",
}

/** 12-week score trend as a compositor-cheap inline SVG sparkline. */
function TrendLine({ series }: { series: SafetyWeekScore[] }) {
  const points = series.map((s) => s.score)
  const known = points.filter((p): p is number => p !== null)
  if (known.length < 2) return null
  const w = 220
  const h = 48
  const min = Math.min(...known, 80)
  const max = 100
  const step = w / (points.length - 1)
  const y = (score: number) => h - 4 - ((score - min) / (max - min)) * (h - 8)
  let d = ""
  points.forEach((score, i) => {
    if (score === null) return
    const cmd = d === "" ? "M" : "L"
    d += `${cmd}${(i * step).toFixed(1)} ${y(score).toFixed(1)} `
  })
  const last = [...series].reverse().find((s) => s.score !== null)
  const lastIdx = last ? series.indexOf(last) : -1
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full max-w-[220px]" aria-hidden>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && last.score !== null ? (
        <circle cx={lastIdx * step} cy={y(last.score)} r="3" fill="var(--accent)" />
      ) : null}
    </svg>
  )
}

export function SafetyScorePanel({
  series,
  current,
  kindMix,
  drivers,
}: {
  series: SafetyWeekScore[]
  current: SafetyWeekScore | null
  kindMix: Partial<Record<SafetyEventKind, number>>
  drivers: DriverSafetyRow[]
}) {
  const mix = (Object.entries(kindMix) as [SafetyEventKind, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <Panel className="mb-4 p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-accent-text" />
        <h2 className="text-[13.5px] font-semibold text-fg">Fleet safety score</h2>
        <span className="text-[11px] text-fg-3">trailing {SAFETY_WINDOW_WEEKS} weeks · updates weekly</span>
      </div>
      {current === null || current.score === null ? (
        <p className="text-body-sm text-fg-3">
          Not enough recent miles to score the fleet yet. Scores appear once delivered loads and
          safety events start flowing — log coaching events from any incident, or connect a camera/ELD.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("font-mono text-4xl font-semibold tabular-nums tracking-tight", BAND_TONES[safetyBand(current.score)])}>
                {current.score}
              </span>
              <span className="text-body-sm text-fg-3">/ 100</span>
              <span className={cn("rounded-pill border px-2 py-0.5 text-[11px] font-bold", BAND_CHIPS[safetyBand(current.score)])}>
                {SAFETY_BAND_LABELS[safetyBand(current.score)]}
              </span>
            </div>
            <p className="mt-1 text-body-xs text-fg-3">
              {current.windowEvents} event{current.windowEvents === 1 ? "" : "s"} over{" "}
              {current.windowMiles.toLocaleString()} mi
              {current.weightedPer1000 !== null ? ` · ${current.weightedPer1000.toFixed(1)} weighted / 1,000 mi` : ""}
            </p>
          </div>
          <div className="min-w-[180px] flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-3">12-week trend</p>
            <TrendLine series={series} />
          </div>
          {mix.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Event mix</p>
              <ul className="space-y-0.5 text-body-xs text-fg-2">
                {mix.map(([kind, n]) => (
                  <li key={kind} className="flex items-center justify-between gap-4">
                    <span>{SAFETY_EVENT_LABELS[kind]}</span>
                    <span className="font-mono tabular-nums text-fg">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {drivers.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Coach first</p>
          <ul className="divide-y divide-border">
            {drivers.map((d) => (
              <li key={d.driverId}>
                <Link
                  href={`/hub/drivers/${d.driverId}`}
                  className="-mx-2 flex min-h-[40px] items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-hover"
                >
                  <span className="truncate text-sm font-semibold text-fg">{d.name}</span>
                  <span className="flex shrink-0 items-center gap-3 text-body-xs text-fg-3">
                    <span>
                      {d.events} event{d.events === 1 ? "" : "s"} · {d.miles.toLocaleString()} mi
                    </span>
                    {d.score !== null ? (
                      <span className={cn("font-mono text-sm font-semibold tabular-nums", BAND_TONES[safetyBand(d.score)])}>
                        {d.score}
                      </span>
                    ) : (
                      <span className="text-fg-3">—</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  )
}
