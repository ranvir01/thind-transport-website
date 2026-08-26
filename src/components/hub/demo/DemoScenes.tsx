"use client"

/**
 * Demo scene visuals — fabricated, self-contained replicas of the product's
 * moments, staged off each scene's stepsMs timeline. No network, no tenant
 * data; where a live integration would answer (ELD stream, QuickBooks, bank
 * feed) the scene simulates the answer. Tokens only, so the demo follows the
 * viewer's light/dark mode like the real app.
 */
import { useEffect, useState } from "react"
import {
  Bell, Building2, CalendarClock, Camera, CheckCircle2, CircleDollarSign,
  FileText, Fuel, Link2, MapPin, Route, Send, ShieldCheck, Sparkles, Truck,
  Wallet, Zap,
} from "lucide-react"
import { fmtCents } from "@/lib/hub/types"
import { DEMO_DATA } from "@/lib/hub/demo-script"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { LoadOffMark } from "@/components/hub/LoadOffMark"
import { DemoLiveMap } from "@/components/hub/demo/DemoLiveMap"
import { CountUp } from "@/components/hub/demo/motion"
import { cn } from "@/lib/utils"

/** How many timeline steps are visible; reduced-motion shows everything. */
export function useStage(stepsMs: number[]): number {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      queueMicrotask(() => setStage(stepsMs.length))
      return
    }
    const timers = stepsMs.map((ms, i) => window.setTimeout(() => setStage(i + 1), ms))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [stepsMs])
  return stage
}

function Step({ on, children, className }: { on: boolean; children: React.ReactNode; className?: string }) {
  if (!on) return null
  return <div className={cn("hub-pop-enter", className)}>{children}</div>
}

const card = "rounded-card border border-border bg-surface shadow-card"

/* ---------- 1 · Cold open ---------- */
export function OpenScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Step on={stage >= 1}>
        <LoadOffMark size={72} />
      </Step>
      <Step on={stage >= 2}>
        <p className="text-[28px] font-semibold tracking-tight text-fg">This is LoadOff.</p>
      </Step>
      <Step on={stage >= 3}>
        <p className="max-w-[260px] text-[15px] text-fg-2">
          Book it. Haul it. Bill it. Get paid.
          <span className="block text-fg-3">Without the office drowning.</span>
        </p>
      </Step>
    </div>
  )
}

/* ---------- 2 · Today ---------- */
export function TodayScene({ stage }: { stage: number }) {
  const tiles = [
    { label: "Loads today", value: "7", tone: null },
    { label: "Unconfirmed drivers", value: "1", tone: "Needs a call" },
    { label: "Not invoiced", value: "$18,420", tone: "One click to bill" },
    { label: "Missing PODs", value: "2", tone: "Blocks invoicing" },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="text-[13px] text-fg-3">Tuesday, October 6</p>
        <p className="text-[22px] font-semibold tracking-tight text-fg">Good morning, {DEMO_DATA.dispatcher}</p>
      </Step>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => (
          <Step key={t.label} on={stage >= Math.min(i + 2, 5)}>
            <div className={cn(card, "p-3.5")}>
              <p className="text-[12px] font-medium text-fg-3">{t.label}</p>
              <p className={cn("mt-0.5 text-[26px] font-semibold tracking-tight tabular-nums text-fg", t.label === "Not invoiced" && "font-mono")}>
                <CountUp value={t.value} />
              </p>
              {t.tone ? (
                <span className={cn(
                  "mt-1 inline-flex rounded-pill px-2 py-0.5 text-[10.5px] font-semibold",
                  t.label === "Not invoiced" ? "bg-accent-soft text-accent-text" : "bg-warn-soft text-warn"
                )}>
                  {t.tone}
                </span>
              ) : null}
            </div>
          </Step>
        ))}
      </div>
      <Step on={stage >= 5} className="mt-3">
        <div className={cn(card, "flex items-center gap-2.5 p-3")}>
          <Bell className="h-4 w-4 shrink-0 text-accent-text" />
          <p className="text-[13px] text-fg-2">
            New rate confirmation from <span className="font-semibold text-fg">{DEMO_DATA.broker}</span>
          </p>
        </div>
      </Step>
    </div>
  )
}

/* ---------- 3 · Rate con AI parse ---------- */
export function RateConScene({ stage }: { stage: number }) {
  const fields = [
    { label: "Broker", value: DEMO_DATA.broker },
    { label: "Reference", value: DEMO_DATA.reference },
    { label: "Lane", value: `${DEMO_DATA.lane.origin} → ${DEMO_DATA.lane.dest}` },
    { label: "Rate", value: fmtCents(DEMO_DATA.linehaulCents) },
    { label: "Pickup", value: "Fri 08:00 · Kent, WA dock 14" },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <div className={cn(card, "p-3.5")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">Pasted from email</p>
          <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-fg-2">
            RATE CONFIRMATION {DEMO_DATA.reference}
            <br />Origin: SEATTLE WA Dest: BOISE ID
            <br />Total rate: $2,850.00 · FCFS 0800…
          </p>
        </div>
      </Step>
      <Step on={stage >= 2} className="mt-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-text">
          <Sparkles className="h-4 w-4" /> Reading it for you…
        </p>
      </Step>
      <div className="mt-2 space-y-1.5">
        {fields.map((f, i) => (
          <Step key={f.label} on={stage >= i + 3}>
            <div className={cn(card, "flex items-center justify-between gap-2 px-3 py-2")}>
              <span className="text-[12px] text-fg-3">{f.label}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-fg">
                <span className="truncate">{f.value}</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" />
              </span>
            </div>
          </Step>
        ))}
      </div>
      <Step on={stage >= 7} className="mt-3">
        <div className="flex items-center justify-between rounded-card bg-accent px-4 py-3 text-accent-fg shadow-raised">
          <span className="text-sm font-semibold">Load booked · {DEMO_DATA.reference}</span>
          <span className="font-mono text-sm font-semibold tabular-nums">{fmtCents(DEMO_DATA.linehaulCents)}</span>
        </div>
      </Step>
    </div>
  )
}

/* ---------- 4 · Dispatch ---------- */
export function DispatchScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="text-[15px] font-semibold text-fg">Who&apos;s hauling it?</p>
        <div className={cn(card, "mt-2 divide-y divide-border")}>
          {[
            { name: DEMO_DATA.driver, truck: DEMO_DATA.truck, state: "Empty in Kent · 9h 40m HOS", pick: true },
            { name: "Davinder Grewal", truck: "#202", state: "Delivering in Spokane", pick: false },
          ].map((d) => (
            <div key={d.name} className={cn("flex items-center gap-3 p-3", d.pick && stage >= 2 && "bg-accent-soft")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold text-fg">
                {d.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-fg">{d.name} <span className="font-normal text-fg-3">· {d.truck}</span></p>
                <p className="text-[12px] text-fg-3">{d.state}</p>
              </div>
              {d.pick && stage >= 2 ? <CheckCircle2 className="h-4.5 w-4.5 h-[18px] w-[18px] text-accent-text" /> : null}
            </div>
          ))}
        </div>
      </Step>
      <Step on={stage >= 3} className="mt-3">
        <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-fg shadow-raised">
          <Send className="h-4 w-4" /> Dispatched to {DEMO_DATA.driver.split(" ")[0]}
        </div>
      </Step>
      <Step on={stage >= 4} className="mt-3">
        {/* The driver's phone, in miniature */}
        <div className="ml-auto w-[85%] rounded-card border border-border bg-surface-2 p-3 shadow-raised">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-fg-3">Driver app · {DEMO_DATA.driver.split(" ")[0]}&apos;s phone</p>
          <p className="mt-1 text-[13px] font-semibold text-fg">
            New load: Seattle → Boise · Fri 08:00
          </p>
          <div className="mt-2 inline-flex min-h-[36px] items-center rounded-control bg-accent px-3 text-[12.5px] font-semibold text-accent-fg">
            Accept load
          </div>
        </div>
      </Step>
      <Step on={stage >= 5} className="mt-3">
        <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> {DEMO_DATA.driver.split(" ")[0]} confirmed — 22 seconds later
        </p>
      </Step>
    </div>
  )
}

/* ---------- 5 · Live map ---------- */

export function TrackScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <div className={cn(card, "overflow-hidden")}>
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <p className="text-[13.5px] font-semibold text-fg">Truck {DEMO_DATA.truck} · {DEMO_DATA.driver.split(" ")[0]}</p>
            <span className="rounded-pill bg-info-soft px-2 py-0.5 text-[10.5px] font-semibold text-info">In transit</span>
          </div>
          {/* The real thing: Leaflet + OSM tiles, truck rolling the actual
              I-90/I-84 corridor, destination geofence pulsing. */}
          <DemoLiveMap play={stage >= 2} />
        </div>
      </Step>
      <div className="mt-3 space-y-1.5">
        <Step on={stage >= 3}>
          <div className={cn(card, "flex items-center gap-2.5 px-3 py-2")}>
            <MapPin className="h-4 w-4 shrink-0 text-ok" />
            <p className="text-[12.5px] text-fg-2">
              <span className="font-semibold text-fg">Arrived at pickup 07:52</span> — geofence stamped it, nobody called
            </p>
          </div>
        </Step>
        <Step on={stage >= 4}>
          <div className={cn(card, "flex items-center gap-2.5 px-3 py-2")}>
            <Route className="h-4 w-4 shrink-0 text-accent-text" />
            <p className="text-[12.5px] text-fg-2">
              <span className="font-semibold text-fg">ETA Boise 6:40 PM</span> · 9h 40m HOS remaining — legal without a reset
            </p>
          </div>
        </Step>
        <Step on={stage >= 5}>
          <div className={cn(card, "flex items-center gap-2.5 px-3 py-2")}>
            <Zap className="h-4 w-4 shrink-0 text-warn" />
            <p className="text-[12.5px] text-fg-2">
              Broker asked &quot;where&apos;s my truck?&quot; — <span className="font-semibold text-fg">sent the live tracking link instead</span>
            </p>
          </div>
        </Step>
      </div>
    </div>
  )
}

/* ---------- 6 · POD ---------- */
export function PodScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Step on={stage >= 1}>
        <p className="text-center text-[15px] font-semibold text-fg">Delivered · Boise 6:12 PM</p>
      </Step>
      <Step on={stage >= 2} className="mt-3 w-full">
        {/* the POD photo, from the driver's phone */}
        <div className="mx-auto w-[62%] rotate-[-2deg] rounded-card border border-border bg-surface p-2 shadow-raised">
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[10px] bg-surface-2">
            <Camera className="h-6 w-6 text-fg-3" />
            <p className="font-mono text-[11px] text-fg-3">POD_{DEMO_DATA.reference}.jpg</p>
            <p className="text-[10px] text-fg-3">signed · J. Alvarez, receiving</p>
          </div>
        </div>
      </Step>
      <Step on={stage >= 3} className="mt-4">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> POD attached to the load — filed before the truck left the dock
        </p>
      </Step>
      <Step on={stage >= 4} className="mt-2">
        <span className="rounded-pill bg-ok-soft px-3 py-1 text-[11.5px] font-semibold text-ok">
          booked → dispatched → delivered → POD received
        </span>
      </Step>
    </div>
  )
}

/* ---------- 7 · Invoice ---------- */
export function InvoiceScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <div className={cn(card, "p-4")}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-fg">{DEMO_DATA.invoiceNumber}</p>
            <FileText className="h-4 w-4 text-fg-3" />
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            {stage >= 2 ? (
              <div className="flex justify-between">
                <span className="text-fg-2">Linehaul · Seattle → Boise</span>
                <span className="font-mono font-medium tabular-nums text-fg">{fmtCents(DEMO_DATA.linehaulCents)}</span>
              </div>
            ) : null}
            {stage >= 3 ? (
              <div className="flex justify-between">
                <span className="text-fg-2">Detention · 1.5h at receiver</span>
                <span className="font-mono font-medium tabular-nums text-fg">{fmtCents(DEMO_DATA.detentionCents)}</span>
              </div>
            ) : null}
            {stage >= 4 ? (
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-semibold text-fg">Total · net 30</span>
                <span className="font-mono text-[16px] font-semibold tabular-nums text-accent-text">
                  <CountUp value={fmtCents(DEMO_DATA.linehaulCents + DEMO_DATA.detentionCents)} />
                </span>
              </div>
            ) : null}
          </div>
          {stage >= 4 ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-fg-3">
              <Camera className="h-3.5 w-3.5" /> POD attached · detention pulled from geofence timestamps
            </p>
          ) : null}
        </div>
      </Step>
      <Step on={stage >= 5} className="mt-3">
        <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-fg shadow-raised">
          <Send className="h-4 w-4" /> Sent to {DEMO_DATA.broker}
        </div>
      </Step>
      <Step on={stage >= 6} className="mt-4 flex flex-col items-center">
        <CheckDraw size={56} />
        <p className="mt-2 text-[13.5px] font-semibold text-fg">Delivered to invoiced: one tap</p>
      </Step>
    </div>
  )
}

/* ---------- 8 · Paid + sync ---------- */
export function PaidScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(card, "flex items-center gap-3 p-3.5")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ok-soft text-ok">
            <Wallet className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">ACH received · {DEMO_DATA.broker}</p>
            <p className="text-[12px] text-fg-3">{DEMO_DATA.invoiceNumber} · 19 days — 11 days early</p>
          </div>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-ok">
            +{fmtCents(DEMO_DATA.linehaulCents + DEMO_DATA.detentionCents)}
          </span>
        </div>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(card, "p-3.5")}>
          <div className="flex items-center justify-between text-[12px] text-fg-3">
            <span>Open receivables</span>
            <span className="font-mono tabular-nums">{fmtCents(1542000)} → {fmtCents(1242000)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full w-[52%] rounded-pill bg-accent transition-all duration-slow" />
          </div>
        </div>
      </Step>
      <Step on={stage >= 3}>
        <div className={cn(card, "flex items-center gap-3 p-3.5")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
            <Link2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">QuickBooks synced</p>
            <p className="text-[12px] text-fg-3">1 invoice · 1 payment · 2 fuel expenses — nothing re-typed</p>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
        </div>
      </Step>
      <Step on={stage >= 4}>
        <p className="text-center text-[12.5px] text-fg-3">
          Reminders chase the slow payers by themselves — factored loads excluded.
        </p>
      </Step>
    </div>
  )
}

/* ---------- 9 · Autopilot ---------- */
export function AutopilotScene({ stage }: { stage: number }) {
  const rows = [
    { icon: Route, tint: "bg-info-soft text-info", title: "IFTA quarter building itself", sub: "494 miles split WA · OR · ID from ELD pings" },
    { icon: Fuel, tint: "bg-warn-soft text-warn", title: "Fuel audit flagged card misuse", sub: `${DEMO_DATA.fuelGallonsFlagged} gal purchase vs ${DEMO_DATA.tankCapacity} gal tank — caught overnight` },
    { icon: CircleDollarSign, tint: "bg-ok-soft text-ok", title: `Settlement drafted · ${DEMO_DATA.driver.split(" ")[0]}`, sub: `${fmtCents(DEMO_DATA.settlementCents)} — miles, detention, advance netted` },
    { icon: ShieldCheck, tint: "bg-ok-soft text-ok", title: "Compliance wall green", sub: "CDLs, med cards, registrations — next expiry in 47 days" },
    { icon: Building2, tint: "bg-accent-soft text-accent-text", title: "Insurance renewal packet ready", sub: "Loss runs, driver list, IFTA miles — exported in one tap" },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="mb-3 text-center text-[15px] font-semibold text-fg">Meanwhile, in the background</p>
      </Step>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Step key={r.title} on={stage >= i + 2}>
            <div className={cn(card, "flex items-center gap-3 p-3")}>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-control", r.tint)}>
                <r.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{r.title}</p>
                <p className="text-[11.5px] text-fg-3">{r.sub}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
            </div>
          </Step>
        ))}
      </div>
    </div>
  )
}

/* ---------- 10 · Wrap ---------- */
export function WrapScene({
  stage,
  onReplay,
  onSwitchSeat,
}: {
  stage: number
  onReplay: () => void
  onSwitchSeat?: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Step on={stage >= 1}>
        <LoadOffMark size={56} />
      </Step>
      <Step on={stage >= 2} className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "1", l: "load, end to end" },
            { v: "0", l: "phone calls" },
            { v: "4 min", l: "of office work" },
          ].map((s) => (
            <div key={s.l} className={cn(card, "px-3 py-2.5")}>
              <p className="text-[22px] font-semibold tabular-nums text-fg">{s.v}</p>
              <p className="text-[11px] leading-tight text-fg-3">{s.l}</p>
            </div>
          ))}
        </div>
      </Step>
      <Step on={stage >= 3} className="mt-5">
        <p className="text-[19px] font-semibold tracking-tight text-fg">Take a load off.</p>
        <div className="mt-4 flex flex-col items-center gap-2">
          {onSwitchSeat ? (
            <button
              type="button"
              onClick={onSwitchSeat}
              className="inline-flex min-h-[46px] w-56 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Try another seat
            </button>
          ) : null}
          <a
            href="/hub/login"
            className={cn(
              "inline-flex min-h-[46px] w-56 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold",
              onSwitchSeat
                ? "border border-border-strong text-fg-2 hover:bg-hover"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
            )}
          >
            Open the real app
          </a>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex min-h-[40px] items-center justify-center rounded-control px-5 text-[13px] font-medium text-fg-3 hover:bg-hover"
          >
            Watch this seat again
          </button>
        </div>
      </Step>
    </div>
  )
}

/* Icons the player chrome uses for the scene rail. */
export const SCENE_ICONS = {
  open: Sparkles,
  today: CalendarClock,
  ratecon: FileText,
  dispatch: Send,
  track: Truck,
  pod: Camera,
  invoice: FileText,
  paid: Wallet,
  autopilot: Zap,
  wrap: CheckCircle2,
} as const
