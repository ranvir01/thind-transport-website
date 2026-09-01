"use client"

/**
 * Seat-specific demo scenes — driver, owner, broker. The driver track renders
 * inside the driver app's forced-dark navy chrome (navy/steel/white, exactly
 * like /hub/driver) so the phone experience reads as the real thing; owner
 * and broker tracks stay on office tokens.
 */
import {
  Banknote, Camera, CheckCircle2, CircleDollarSign, FileText, Fuel, Landmark,
  Link2, Lock, MapPin, Navigation, ShieldCheck, Star, Timer, TrendingUp, Truck,
} from "lucide-react"
import { fmtCents } from "@/lib/hub/types"
import { DEMO_DATA } from "@/lib/hub/demo-script"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { DemoLiveMap } from "@/components/hub/demo/DemoLiveMap"
import { CountUp, TickingClock, TypingDots } from "@/components/hub/demo/motion"
import { cn } from "@/lib/utils"

const card = "rounded-card border border-border bg-surface shadow-card"
/* Forced-dark driver chrome (mirrors /hub/driver styling rules). */
const dcard = "rounded-card border border-white/10 bg-navy-500 shadow-raised"

function Step({ on, children, className }: { on: boolean; children: React.ReactNode; className?: string }) {
  if (!on) return null
  return <div className={cn("hub-pop-enter", className)}>{children}</div>
}

/* ============================== DRIVER ============================== */

export function DriverOfferScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fg-3">
          {DEMO_DATA.driver.split(" ")[0]}&apos;s phone · 6:12 PM Thursday
        </p>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(dcard, "p-4")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-steel-300">
            New load offer
          </p>
          <p className="mt-1.5 text-[17px] font-semibold text-white">
            Seattle, WA → Boise, ID
          </p>
          <p className="mt-0.5 text-[13px] text-steel-300">
            Fri 08:00 pickup · {DEMO_DATA.lane.miles} loaded miles · reefer
          </p>
          <div className="mt-3 flex items-center justify-between rounded-control bg-white/5 px-3 py-2">
            <span className="text-[12px] text-steel-300">Your pay · 494 mi × $0.63</span>
            <span className="font-mono text-[16px] font-semibold tabular-nums text-white">
              {fmtCents(311_00)}
            </span>
          </div>
        </div>
      </Step>
      <Step on={stage >= 3} className="mt-3">
        <div className="flex min-h-[46px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-fg shadow-raised">
          Accept load
        </div>
      </Step>
      <Step on={stage >= 4} className="mt-3">
        <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> Accepted — dispatch saw it instantly
        </p>
      </Step>
    </div>
  )
}

export function DriverRunScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(dcard, "p-4")}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-white">Friday&apos;s run</p>
            <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent-text">
              dispatched
            </span>
          </div>
          {stage >= 2 ? (
            <div className="mt-3 flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-steel-300" />
              <div>
                <p className="text-[13.5px] font-semibold text-white">Kent Distribution · dock 14</p>
                <p className="text-[12px] text-steel-300">08:00 appt · gate code 4471 · scale on site</p>
              </div>
            </div>
          ) : null}
          {stage >= 3 ? (
            <div className="mt-2.5 flex items-start gap-2.5">
              <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-steel-300" />
              <div className="flex items-center gap-2">
                <p className="text-[13.5px] text-steel-200">494 mi · I-90 E → I-84 E</p>
                <span className="rounded-pill bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                  Open in Maps
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </Step>
      <Step on={stage >= 4}>
        <div className={cn(dcard, "flex items-center gap-3 p-3.5")}>
          <Timer className="h-4 w-4 shrink-0 text-ok" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white">9h 40m driving available</p>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-pill bg-white/10">
              <div className="h-full w-[88%] rounded-pill bg-ok" />
            </div>
          </div>
        </div>
      </Step>
      <Step on={stage >= 5}>
        <p className="text-center text-[12.5px] text-fg-3">
          HOS from the connected ELD — legal without a reset, and dispatch knows it too.
        </p>
      </Step>
    </div>
  )
}

export function DriverArriveScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(dcard, "flex items-center gap-3 p-4")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ok-soft text-ok">
            <MapPin className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-white">Arrived · Kent Distribution</p>
            <p className="text-[12px] text-steel-300">07:52 — stamped by geofence, no tap needed</p>
          </div>
        </div>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(dcard, "flex items-center gap-3 p-4")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-warn-soft text-warn">
            <Timer className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-white">Detention clock armed</p>
            <p className="text-[12px] text-steel-300">2 free hours, then $60/hr bills itself</p>
          </div>
          <TickingClock from="1:34:12" className="font-mono text-[15px] font-semibold tabular-nums text-white" />
        </div>
      </Step>
      <Step on={stage >= 3}>
        <div className={cn(dcard, "p-4")}>
          <p className="text-[13px] text-steel-200">
            Dock ran long. The extra 1.5 hours became{" "}
            <span className="font-semibold text-white">{fmtCents(DEMO_DATA.detentionCents)} of detention</span>{" "}
            on the invoice — from these timestamps, not an argument.
          </p>
        </div>
      </Step>
      <Step on={stage >= 4}>
        <p className="text-center text-[12.5px] text-fg-3">Loaded and rolling by 09:30.</p>
      </Step>
    </div>
  )
}

export function DriverPodScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Step on={stage >= 1}>
        <p className="text-center text-[15px] font-semibold text-fg">Boise Receiving · 6:12 PM</p>
      </Step>
      <Step on={stage >= 2} className="mt-3 w-full">
        <div className={cn(dcard, "mx-auto w-[80%] p-4")}>
          <div className="relative flex aspect-[16/10] flex-col items-center justify-center gap-2 overflow-hidden rounded-control bg-white/5">
            {stage >= 3 ? (
              <>
                {/* The "photo": a captured delivery receipt, lines and a signature. */}
                <div className="absolute inset-3 rounded-[6px] bg-[#e9e5dc] p-2.5 shadow-raised">
                  <div className="h-1.5 w-2/3 rounded-pill bg-navy-500/70" />
                  <div className="mt-1.5 h-1 w-1/2 rounded-pill bg-navy-500/40" />
                  <div className="mt-1 h-1 w-3/5 rounded-pill bg-navy-500/40" />
                  <div className="mt-1 h-1 w-2/5 rounded-pill bg-navy-500/40" />
                  <svg viewBox="0 0 120 28" className="absolute bottom-2 right-2.5 h-6 w-24" aria-hidden>
                    <path
                      d="M4 20 C 16 6, 26 24, 38 14 S 60 8, 70 16 S 96 24, 116 10"
                      fill="none" stroke="#1f2a44" strokeWidth="2" strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span aria-hidden className="demo-flash" />
              </>
            ) : (
              <>
                <Camera className="h-7 w-7 text-steel-300" />
                <p className="text-[13px] font-semibold text-white">Photograph the POD</p>
              </>
            )}
          </div>
          {stage >= 3 ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12.5px] text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded · attached to {DEMO_DATA.reference}
            </p>
          ) : null}
        </div>
      </Step>
      <Step on={stage >= 4} className="mt-3">
        <p className="max-w-[280px] text-center text-[12.5px] text-fg-3">
          No signal at the dock? It queues and sends itself when coverage returns.
        </p>
      </Step>
    </div>
  )
}

export function DriverPayScene({ stage }: { stage: number }) {
  const rows = [
    { label: "494 loaded miles × $0.63", value: 311_00 },
    { label: "Detention · 1.5h", value: 90_00 },
    { label: "Fuel advance (Tues)", value: -75_00 },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <div className={cn(dcard, "p-4")}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-white">{DEMO_DATA.reference} · your pay</p>
            <Banknote className="h-4 w-4 text-steel-300" />
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            {rows.map((r, i) => (
              <div key={r.label} className={cn("flex justify-between", stage < i + 2 && "hidden")}>
                <span className="text-steel-200">{r.label}</span>
                <span className={cn("font-mono font-medium tabular-nums", r.value < 0 ? "text-warn" : "text-white")}>
                  {r.value < 0 ? "−" : ""}{fmtCents(Math.abs(r.value))}
                </span>
              </div>
            ))}
            {stage >= 5 ? (
              <div className="flex justify-between border-t border-white/10 pt-1.5">
                <span className="font-semibold text-white">Net for this load · lands Friday</span>
                <span className="font-mono text-[16px] font-semibold tabular-nums text-ok">
                  <CountUp value={fmtCents(326_00)} />
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Step>
      <Step on={stage >= 5} className="mt-3">
        <p className="text-center text-[12.5px] text-fg-3">
          Every line traceable to a load — the Friday phone calls stop.
        </p>
      </Step>
    </div>
  )
}

/* ============================== OWNER ============================== */

export function OwnerPulseScene({ stage }: { stage: number }) {
  const tiles = [
    { label: "Booked this week", value: "$21,340" },
    { label: "Margin per mile", value: "$1.04" },
    { label: "Not invoiced", value: "$3,000" },
    { label: "Owed to you", value: "$12,420" },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="mb-3 text-center text-[15px] font-semibold text-fg">Friday, 7:05 AM · coffee</p>
      </Step>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => (
          <Step key={t.label} on={stage >= Math.min(i + 2, 5)}>
            <div className={cn(card, "p-3.5")}>
              <p className="text-[12px] font-medium text-fg-3">{t.label}</p>
              <p className="mt-0.5 font-mono text-[24px] font-semibold tracking-tight tabular-nums text-fg">
                <CountUp value={t.value} />
              </p>
            </div>
          </Step>
        ))}
      </div>
      <Step on={stage >= 5} className="mt-3">
        <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-fg-3">
          <TrendingUp className="h-3.5 w-3.5 text-ok" /> Priced against your own cost per mile — not a guess
        </p>
      </Step>
    </div>
  )
}

export function OwnerFraudScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(card, "flex items-center gap-3 p-4")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-warn-soft text-warn">
            <Fuel className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">Overnight fuel audit flagged card •••7 214</p>
            <p className="text-[12px] text-fg-3">
              {DEMO_DATA.fuelGallonsFlagged} gal purchase · truck tank holds {DEMO_DATA.tankCapacity} gal
            </p>
          </div>
        </div>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(card, "p-4")}>
          <p className="text-[13px] text-fg-2">
            Someone topped a personal truck on the company card. Caught the same night —
            not at quarter close.
          </p>
        </div>
      </Step>
      <Step on={stage >= 3}>
        <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-fg shadow-raised">
          <Lock className="h-4 w-4" /> Lock card · dispute transaction
        </div>
      </Step>
      <Step on={stage >= 4}>
        <p className="text-center text-[12.5px] text-fg-3">$389 saved before breakfast.</p>
      </Step>
    </div>
  )
}

export function OwnerSettleScene({ stage }: { stage: number }) {
  const rows = [
    { name: "Harpreet S.", net: 132600 },
    { name: "Davinder G.", net: 118400 },
    { name: "Gurjit S.", net: 141900 },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="mb-2 text-[15px] font-semibold text-fg">Settlements · drafted overnight</p>
      </Step>
      <div className={cn(card, "divide-y divide-border")}>
        {rows.map((r, i) => (
          <div key={r.name} className={cn("flex items-center gap-3 p-3", stage < i + 2 && "hidden")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold text-fg">
              {r.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-fg">{r.name}</p>
              <p className="text-[11.5px] text-fg-3">miles + detention − advances · penny-exact</p>
            </div>
            <span className="font-mono text-[14px] font-semibold tabular-nums text-fg">{fmtCents(r.net)}</span>
          </div>
        ))}
      </div>
      <Step on={stage >= 5} className="mt-3">
        <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-fg shadow-raised">
          <CheckCircle2 className="h-4 w-4" /> Approve all three
        </div>
      </Step>
    </div>
  )
}

export function OwnerBooksScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(card, "flex items-center gap-3 p-3.5")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
            <Link2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">QuickBooks synced overnight</p>
            <p className="text-[12px] text-fg-3">6 invoices · 4 payments · 31 fuel transactions</p>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
        </div>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(card, "flex items-center gap-3 p-3.5")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ok-soft text-ok">
            <Landmark className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">Aging drained itself</p>
            <p className="text-[12px] text-fg-3">Reminders chased 3 slow payers — 2 paid this week</p>
          </div>
        </div>
      </Step>
      <Step on={stage >= 3}>
        <p className="text-center text-[12.5px] text-fg-3">
          Your accountant gets clean books, not a shoebox of rate cons.
        </p>
      </Step>
      <Step on={stage >= 4}>
        <div className={cn(card, "p-3.5 text-center")}>
          <p className="font-mono text-[22px] font-semibold tabular-nums text-fg">19 days</p>
          <p className="text-[11.5px] text-fg-3">delivered → cash, fleet median (was 34 before LoadOff)</p>
        </div>
      </Step>
    </div>
  )
}

export function OwnerComplyScene({ stage }: { stage: number }) {
  const rows = [
    { icon: ShieldCheck, label: "Compliance wall green", sub: "next expiry in 47 days — watched daily" },
    { icon: Truck, label: "IFTA Q3 building itself", sub: "jurisdiction miles from ELD pings, filing-ready" },
    { icon: FileText, label: "Insurance renewal packet", sub: "loss runs, driver list, IFTA miles — one tap" },
    { icon: CircleDollarSign, label: "2290s tracked per truck", sub: "no August surprise" },
  ]
  return (
    <div className="flex h-full flex-col justify-center">
      <Step on={stage >= 1}>
        <p className="mb-3 text-center text-[15px] font-semibold text-fg">The part that used to keep you up</p>
      </Step>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Step key={r.label} on={stage >= i + 2}>
            <div className={cn(card, "flex items-center gap-3 p-3")}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ok-soft text-ok">
                <r.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{r.label}</p>
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

/* ============================== BROKER ============================== */

export function BrokerTrackScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <div className={cn(card, "p-3.5")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">
            {DEMO_DATA.broker} · 2:14 PM
          </p>
          <p className="mt-1 text-[13.5px] text-fg-2">
            &quot;Any update on {DEMO_DATA.reference}? Receiver is asking.&quot;
          </p>
        </div>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(card, "p-3.5")}>
          {stage >= 3 ? (
            <p className="text-[13.5px] text-fg-2">
              Reply — 20 seconds later:{" "}
              <span className="font-semibold text-accent-text underline underline-offset-2">
                loadoff.app/track/PCL-88214
              </span>
            </p>
          ) : (
            <TypingDots />
          )}
        </div>
      </Step>
      <Step on={stage >= 3}>
        <div className={cn(card, "overflow-hidden")}>
          <div className="flex items-center justify-between px-3.5 py-2">
            <p className="text-[12.5px] font-semibold text-fg">Live · no login needed</p>
            <span className="rounded-pill bg-info-soft px-2 py-0.5 text-[10.5px] font-semibold text-info">
              ETA 6:40 PM
            </span>
          </div>
          {/* The tracking link opens the real map — truck rolling I-84
              near Baker City, destination geofence pulsing. */}
          <DemoLiveMap
            play={stage >= 3}
            progressCap={0.8}
            heightClass="h-[150px]"
            label="Broker tracking view — truck on I-84 near Baker City"
          />
          <p className="border-t border-border px-3.5 py-2 text-[12px] text-fg-2">
            <Truck className="mr-1.5 inline h-3.5 w-3.5 text-accent-text" aria-hidden />
            147 mi out · I-84 E near Baker City
          </p>
        </div>
      </Step>
      <Step on={stage >= 4}>
        <p className="text-center text-[12.5px] text-fg-3">Forwarded to their customer. Nobody calls anybody.</p>
      </Step>
    </div>
  )
}

export function BrokerDocsScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-2.5">
      <Step on={stage >= 1}>
        <p className="text-center text-[15px] font-semibold text-fg">6:31 PM — nineteen minutes after delivery</p>
      </Step>
      <Step on={stage >= 2}>
        <div className={cn(card, "flex items-center gap-3 p-3.5")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
            <FileText className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">{DEMO_DATA.invoiceNumber} · {fmtCents(300000)}</p>
            <p className="text-[12px] text-fg-3">POD attached · detention documented with timestamps</p>
          </div>
        </div>
      </Step>
      <Step on={stage >= 3}>
        <div className={cn(card, "p-3.5")}>
          <p className="text-[13px] text-fg-2">
            AP has everything in one email. No &quot;missing paperwork&quot; excuse, no 45-day stall.
          </p>
        </div>
      </Step>
      <Step on={stage >= 4}>
        <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-fg-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> Paid in 19 days — 11 early
        </p>
      </Step>
    </div>
  )
}

export function BrokerScoreScene({ stage }: { stage: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Step on={stage >= 1}>
        <CheckDraw size={64} />
      </Step>
      <Step on={stage >= 2} className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "98%", l: "on-time, tracked" },
            { v: "100%", l: "PODs same-day" },
            { v: "0", l: "check calls needed" },
          ].map((s) => (
            <div key={s.l} className={cn(card, "px-3 py-2.5 text-center")}>
              <p className="text-[20px] font-semibold tabular-nums text-fg">{s.v}</p>
              <p className="text-[10.5px] leading-tight text-fg-3">{s.l}</p>
            </div>
          ))}
        </div>
      </Step>
      <Step on={stage >= 3} className="mt-4">
        <p className="flex max-w-[280px] items-center gap-2 text-center text-[13px] text-fg-2">
          <Star className="h-4 w-4 shrink-0 text-warn" />
          This is the record that gets you the next load at your rate.
        </p>
      </Step>
    </div>
  )
}

/* ============================== SHARED WRAP ============================== */

export function SeatWrapScene({
  stage,
  headline,
  onSwitchSeat,
  onReplay,
}: {
  stage: number
  headline: string
  onSwitchSeat: () => void
  onReplay: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Step on={stage >= 1}>
        <CheckDraw size={56} />
      </Step>
      <Step on={stage >= 2} className="mt-4">
        <p className="max-w-[280px] text-[18px] font-semibold tracking-tight text-fg">{headline}</p>
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onSwitchSeat}
            className="inline-flex min-h-[46px] w-56 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Try another seat
          </button>
          <a
            href="/hub/login"
            className="inline-flex min-h-[44px] w-56 items-center justify-center rounded-control border border-border-strong px-5 text-sm font-semibold text-fg-2 hover:bg-hover"
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
