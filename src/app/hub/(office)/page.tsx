import Link from "next/link"
import {
  AlertTriangle, ArrowRight, BellOff, CalendarOff, CheckSquare, DollarSign,
  MapPin, Receipt, TruckIcon,
} from "lucide-react"
import { getDashboardStats } from "@/lib/hub/loads"
import { todayData } from "@/lib/hub/today"
import { countNewWebsiteLeads } from "@/lib/hub/website-leads"
import { fmtCents } from "@/lib/hub/types"
import { Panel } from "@/components/hub/ui"
import { SetupGuide } from "@/components/hub/SetupGuide"
import { SetupProgressCard } from "@/components/hub/SetupProgressCard"
import { StatTile } from "@/components/hub/StatTile"
import { TimeOffDecisionPanel } from "@/components/hub/DriverOfficePanels"
import { requireOfficeUser } from "@/lib/hub/session"
import { gettingStartedState } from "@/app/hub/_actions/onboarding"
import { cn } from "@/lib/utils"
import { countdown } from "./countdown"

export const dynamic = "force-dynamic"

export default async function TodayPage() {
  const user = await requireOfficeUser()
  const [stats, today, started, newLeads] = await Promise.all([
    getDashboardStats(user.carrierId),
    todayData(user.carrierId),
    gettingStartedState(),
    countNewWebsiteLeads(user.carrierId),
  ])

  const allQuiet =
    today.stopsToday.length === 0 && today.unacked.length === 0 &&
    today.redCompliance.length === 0 && today.tasksDue.length === 0 &&
    today.unbilled.length === 0 && today.pendingTimeOff.length === 0 &&
    stats.awaiting_pod === 0 && today.arOverdue.count === 0

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  const unbilledCents = today.unbilled.reduce((sum, load) => sum + Number(load.total_cents), 0)
  const coreDone = started
    ? started.trucks && started.drivers && started.customers && started.loads
    : true

  return (
    <div>
      {/* Quiet greeting: date caption above, state below — no marketing copy. */}
      <header className="mb-5">
        <p className="text-[13px] text-fg-3">{dateLabel}</p>
        <h1 className="mt-0.5 text-[23px] font-semibold tracking-tight text-fg">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
      </header>

      {started && !coreDone ? (
        <SetupProgressCard progress={started} />
      ) : null}

      {/* Data above the fold: the four numbers that run the day. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-tour="today-kpis">
        <StatTile
          label="Loads today"
          value={stats.active_loads}
          href="/hub/dispatch"
          zeroHint="Paste a rate con to book one"
        />
        <StatTile
          label="Unconfirmed drivers"
          value={today.unacked.length}
          href="/hub/dispatch"
          tone="warn"
          toneLabel="Needs a call"
          zeroHint="Everyone has tapped in"
        />
        <StatTile
          label="Not invoiced"
          value={unbilledCents}
          money
          href="/hub/loads?status=pod_received"
          tone="accent"
          toneLabel="One click to bill"
          zeroHint="Nothing waiting"
        />
        <StatTile
          label="Missing PODs"
          value={stats.awaiting_pod}
          href="/hub/loads?status=delivered"
          tone="warn"
          toneLabel="Blocks invoicing"
          zeroHint="All paperwork in"
        />
      </div>

      {newLeads > 0 ? (
        <Link
          href="/hub/leads"
          className="mb-4 flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card hover:bg-hover"
        >
          <div className="min-w-0">
            <p className="font-semibold text-fg">
              {newLeads} driver{newLeads === 1 ? "" : "s"} reached out on the website
            </p>
            <p className="text-body-xs text-fg-3">
              Speed to lead wins drivers — the first carrier to call usually gets them.
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent-text">
            Call them →
          </span>
        </Link>
      ) : null}

      {today.arOverdue.count > 0 ? (
        <Link
          href="/hub/money/invoices"
          className="mb-4 flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card hover:bg-hover"
        >
          <div className="min-w-0">
            <p className="font-semibold text-fg">
              {today.arOverdue.count} invoice{today.arOverdue.count === 1 ? "" : "s"} past due 30+ days ·{" "}
              <span className="font-mono tabular-nums text-bad">{fmtCents(today.arOverdue.cents)}</span>
            </p>
            <p className="text-body-xs text-fg-3">Follow up before the receivable ages further.</p>
          </div>
          <span className="shrink-0 rounded-pill bg-bad-soft px-2.5 py-1 text-[11.5px] font-semibold text-bad">
            Chase it →
          </span>
        </Link>
      ) : null}

      {allQuiet ? (
        <Panel className="p-8 text-center mb-4">
          <p className="font-semibold text-xl text-fg">All quiet. Suspiciously quiet.</p>
          <p className="mt-1 text-body-sm text-fg-3">
            Nothing due, nothing unconfirmed, nothing unbilled, nothing on fire.
          </p>
          <Link
            href="/hub/loads/paste"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Paste a rate con <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 hub-stagger">
        {/* Appointments today */}
        {today.stopsToday.length > 0 ? (
          <Panel className="p-4" data-tour="today-due">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <MapPin className="h-4 w-4 text-accent-text" /> Due today ({today.stopsToday.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.stopsToday.map((stop) => {
                const cd = countdown(stop.appt_start)
                return (
                  <li key={stop.stop_id}>
                    <Link href={`/hub/loads/${stop.load_id}`} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                      <div className="min-w-0">
                        <p className="font-semibold text-fg truncate">
                          {stop.type === "pickup" ? "PU" : "DEL"} · {stop.facility || `${stop.city}, ${stop.state}`}
                        </p>
                        <p className="text-body-xs text-fg-3 truncate">
                          {stop.reference} · {stop.driver_name ?? "no driver"}{stop.truck_unit ? ` · #${stop.truck_unit}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold",
                          stop.arrived_at
                            ? "bg-ok-soft text-ok"
                            : cd.urgent
                              ? "bg-bad-soft text-bad"
                              : "bg-surface-2 text-fg-2"
                        )}
                      >
                        {stop.arrived_at ? "arrived" : stop.fcfs ? "FCFS" : cd.label}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ) : null}

        {/* Unacknowledged dispatches */}
        {today.unacked.length > 0 ? (
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <BellOff className="h-4 w-4 text-warn" /> Driver hasn&apos;t confirmed ({today.unacked.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.unacked.map((load) => (
                <li key={load.id}>
                  <Link href={`/hub/loads/${load.id}`} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg truncate">
                        {load.reference} · {load.origin_city} → {load.dest_city}
                      </p>
                      <p className="text-body-xs text-fg-3">
                        {load.driver_name ?? "No driver"} — dispatched{" "}
                        {new Date(load.dispatched_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-fg-3" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-body-xs text-fg-3">Silence is how loads get missed — call if they don&apos;t tap soon.</p>
          </Panel>
        ) : null}

        {/* Trucks needing freight */}
        {today.emptyTrucks.length > 0 ? (
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <TruckIcon className="h-4 w-4 text-accent-text" /> Trucks needing freight ({today.emptyTrucks.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.emptyTrucks.map((truck) => (
                <li key={`${truck.id}-${truck.when}`} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-semibold text-fg">
                      #{truck.unit_number}
                      <span className="text-fg-3 font-normal"> · {truck.driver_name ?? "no driver"}</span>
                    </p>
                    <p className="text-body-xs text-fg-3">
                      {truck.where_city ? `${truck.where_city}, ${truck.where_state}` : "Location unknown"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold",
                      truck.when === "now" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"
                    )}
                  >
                    empty {truck.when}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/hub/planner" className="mt-2 inline-flex items-center gap-1 text-body-xs font-semibold text-accent-text hover:underline">
              Open the planner for backhaul ideas <ArrowRight className="h-3 w-3" />
            </Link>
          </Panel>
        ) : null}

        {/* Money you haven't invoiced */}
        {today.unbilled.length > 0 ? (
          <Panel className="p-4" data-tour="today-unbilled">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <Receipt className="h-4 w-4 text-accent-text" /> Money you haven&apos;t invoiced yet
            </h2>
            <ul className="divide-y divide-border">
              {today.unbilled.map((load) => (
                <li key={load.id}>
                  <Link href={`/hub/loads/${load.id}`} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg truncate">{load.reference} · {load.customer_name}</p>
                      <p className="text-body-xs text-fg-3">
                        POD in hand{load.delivered_days_ago > 0 ? ` for ${load.delivered_days_ago} day${load.delivered_days_ago > 1 ? "s" : ""}` : ""} — one click to bill
                      </p>
                    </div>
                    <span className="shrink-0 font-mono font-medium text-accent-text tabular-nums">{fmtCents(Number(load.total_cents))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {/* Red compliance */}
        {today.redCompliance.length > 0 ? (
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <AlertTriangle className="h-4 w-4 text-bad" /> Red flags ({today.redCompliance.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.redCompliance.slice(0, 8).map((entry, i) => (
                <li key={i}>
                  <Link href={entry.href ?? "/hub/compliance"} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <p className="min-w-0 truncate text-sm">
                      <span className="font-semibold text-fg">{entry.name}</span>
                      <span className="text-fg-3"> — {entry.kind}</span>
                    </p>
                    <span className="shrink-0 rounded-pill bg-bad-soft px-2.5 py-0.5 text-[11px] font-semibold text-bad">
                      {entry.due ? new Date(entry.due).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {/* Tasks due */}
        {today.tasksDue.length > 0 ? (
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <CheckSquare className="h-4 w-4 text-accent-text" /> Tasks due ({today.tasksDue.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.tasksDue.map((task) => (
                <li key={task.id}>
                  <Link href="/hub/tasks" className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <p className="min-w-0 truncate text-sm font-semibold text-fg">{task.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold",
                        task.priority === "urgent" ? "bg-bad-soft text-bad" : "bg-surface-2 text-fg-3"
                      )}
                    >
                      {task.priority}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {/* Time-off requests */}
        {today.pendingTimeOff.length > 0 ? (
          <div className="xl:col-span-2">
            <TimeOffDecisionPanel requests={today.pendingTimeOff} />
          </div>
        ) : null}
      </div>

      {started && coreDone ? (
        <div className="mt-5">
          <SetupGuide compact />
        </div>
      ) : null}

      {/* Footer quick facts */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-body-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <TruckIcon className="h-3.5 w-3.5" /> {stats.trucks_active}/{stats.trucks_total} trucks active
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" /> {fmtCents(Number(stats.revenue_week_cents))} booked this week
        </span>
        <Link href="/hub/money" className="inline-flex items-center gap-1.5 text-fg-3 hover:text-fg-2 hover:underline">
          <Receipt className="h-3.5 w-3.5" /> {fmtCents(Number(stats.ar_open_cents))} owed to you
        </Link>
        {today.openIncidents > 0 ? (
          <Link href="/hub/safety" className="inline-flex items-center gap-1.5 text-warn hover:underline">
            <AlertTriangle className="h-3.5 w-3.5" /> {today.openIncidents} open incident{today.openIncidents > 1 ? "s" : ""}
          </Link>
        ) : null}
        {today.pendingTimeOff.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarOff className="h-3.5 w-3.5" /> {today.pendingTimeOff.length} time-off request{today.pendingTimeOff.length > 1 ? "s" : ""} waiting
          </span>
        ) : null}
      </div>
    </div>
  )
}
