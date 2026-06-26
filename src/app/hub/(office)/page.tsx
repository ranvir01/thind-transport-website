import Link from "next/link"
import {
  AlertTriangle, ArrowRight, BellOff, CalendarOff, CheckSquare, DollarSign,
  MapPin, Receipt, TruckIcon,
} from "lucide-react"
import { getDashboardStats } from "@/lib/hub/loads"
import { todayData } from "@/lib/hub/today"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader } from "@/components/hub/ui"
import { TimeOffDecisionPanel } from "@/components/hub/DriverOfficePanels"
import { requireOfficeUser } from "@/lib/hub/session"
import { gettingStartedState } from "@/app/hub/_actions/onboarding"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function countdown(iso: string | null): { label: string; urgent: boolean } {
  if (!iso) return { label: "no appt", urgent: false }
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (minutes < 0) return { label: `${Math.abs(Math.round(minutes / 60))}h late`, urgent: true }
  if (minutes < 60) return { label: `in ${minutes}m`, urgent: minutes < 30 }
  if (minutes < 60 * 12) return { label: `in ${Math.round(minutes / 60)}h`, urgent: false }
  return {
    label: new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    urgent: false,
  }
}

export default async function TodayPage() {
  const user = await requireOfficeUser()
  const [stats, today, started] = await Promise.all([
    getDashboardStats(user.carrierId),
    todayData(user.carrierId),
    gettingStartedState(),
  ])

  const allQuiet =
    today.stopsToday.length === 0 && today.unacked.length === 0 &&
    today.redCompliance.length === 0 && today.tasksDue.length === 0 &&
    today.unbilled.length === 0 && today.pendingTimeOff.length === 0

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`}
        subtitle="Today's huddle — everything that needs a human, one tap from its fix."
      />

      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Link href="/hub/dispatch">
          <Panel className="p-3.5 hover:border-border-strong h-full">
            <span className="text-label text-fg-3 uppercase">Active loads</span>
            <p className="mt-1 font-mono text-2xl font-medium text-fg tabular-nums">{stats.active_loads}</p>
          </Panel>
        </Link>
        <Panel className="p-3.5">
          <span className="text-label text-fg-3 uppercase">Booked this week</span>
          <p className="mt-1 font-mono text-2xl font-medium text-fg tabular-nums">{fmtCents(Number(stats.revenue_week_cents))}</p>
        </Panel>
        <Link href="/hub/money">
          <Panel className="p-3.5 hover:border-border-strong h-full">
            <span className="text-label text-fg-3 uppercase">Owed to you</span>
            <p className="mt-1 font-mono text-2xl font-medium text-fg tabular-nums">{fmtCents(Number(stats.ar_open_cents))}</p>
          </Panel>
        </Link>
        <Link href="/hub/money/settlements">
          <Panel className="p-3.5 hover:border-border-strong h-full">
            <span className="text-label text-fg-3 uppercase">Driver pay queued</span>
            <p className="mt-1 font-mono text-2xl font-medium text-fg tabular-nums">{fmtCents(Number(stats.settlement_due_cents))}</p>
          </Panel>
        </Link>
      </div>

      {/* New-carrier getting-started checklist (Phase 7 onboarding) */}
      {started && Object.values(started).some((done) => !done) ? (
        <Panel className="p-4 md:p-5 mb-4 border-gold/40">
          <h2 className="text-[13.5px] font-semibold text-fg mb-1">
            Set up your workspace
          </h2>
          <p className="text-body-xs text-fg-3 mb-3">
            Five steps and you&apos;re fully live — most carriers finish in an afternoon.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              { done: false, label: "Start Smart Setup — drop all your paperwork at once", href: "/hub/setup", highlight: true },
              { done: started.trucks, label: "Trucks on file", href: "/hub/setup" },
              { done: started.drivers, label: "Drivers on file", href: "/hub/setup" },
              { done: started.customers, label: "Brokers on file (MC/DOT → FMCSA lookup)", href: "/hub/setup" },
              { done: started.loads, label: "Load history imported", href: "/hub/import" },
              { done: started.packet, label: "Carrier packet filed (W-9, COI)", href: "/hub/setup" },
            ].map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-hover min-h-[40px]",
                    step.done ? "text-fg-3 line-through" : "text-fg-2 font-semibold",
                    "highlight" in step && step.highlight && !step.done ? "border border-gold/40 bg-gold/5" : ""
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                      step.done ? "border-green-500/50 bg-green-500/15 text-green-400" : "border-border-strong text-fg-3"
                    )}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {allQuiet ? (
        <Panel className="p-8 text-center mb-4">
          <p className="font-semibold text-xl text-fg">All quiet. Suspiciously quiet.</p>
          <p className="mt-1 text-body-sm text-fg-3">
            Nothing due, nothing unconfirmed, nothing unbilled, nothing on fire. Go book some freight.
          </p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Appointments today */}
        {today.stopsToday.length > 0 ? (
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <MapPin className="h-4 w-4 text-gold" /> Due today ({today.stopsToday.length})
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
                          "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          stop.arrived_at
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : cd.urgent
                              ? "border-red-500/40 bg-red-500/10 text-red-400"
                              : "border-border-strong bg-surface-2 text-fg-2"
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
          <Panel className="p-4 border-accent/30">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <BellOff className="h-4 w-4 text-orange" /> Driver hasn&apos;t confirmed ({today.unacked.length})
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
              <TruckIcon className="h-4 w-4 text-gold" /> Trucks needing freight ({today.emptyTrucks.length})
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
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase",
                      truck.when === "now"
                        ? "border-accent/40 bg-accent/10 text-orange"
                        : "border-gold/40 bg-gold/10 text-gold"
                    )}
                  >
                    empty {truck.when}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/hub/planner" className="mt-2 inline-flex items-center gap-1 text-body-xs font-semibold text-gold hover:text-gold/80">
              Open the planner for backhaul ideas <ArrowRight className="h-3 w-3" />
            </Link>
          </Panel>
        ) : null}

        {/* Money you haven't invoiced */}
        {today.unbilled.length > 0 ? (
          <Panel className="p-4 border-gold/30">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <Receipt className="h-4 w-4 text-gold" /> Money you haven&apos;t invoiced yet
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
          <Panel className="p-4 border-red-500/30">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Red flags ({today.redCompliance.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.redCompliance.slice(0, 8).map((entry, i) => (
                <li key={i}>
                  <Link href={entry.href ?? "/hub/compliance"} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <p className="min-w-0 truncate text-sm">
                      <span className="font-semibold text-fg">{entry.name}</span>
                      <span className="text-fg-3"> — {entry.kind}</span>
                    </p>
                    <span className="shrink-0 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
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
              <CheckSquare className="h-4 w-4 text-gold" /> Tasks due ({today.tasksDue.length})
            </h2>
            <ul className="divide-y divide-border">
              {today.tasksDue.map((task) => (
                <li key={task.id}>
                  <Link href="/hub/tasks" className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                    <p className="min-w-0 truncate text-sm font-semibold text-fg">{task.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                        task.priority === "urgent"
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-border-strong bg-surface-2 text-fg-3"
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

      {/* Footer quick facts */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-body-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <TruckIcon className="h-3.5 w-3.5" /> {stats.trucks_active}/{stats.trucks_total} trucks active
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" /> {fmtCents(Number(stats.revenue_month_cents))} booked this month
        </span>
        {today.openIncidents > 0 ? (
          <Link href="/hub/safety" className="inline-flex items-center gap-1.5 text-gold hover:text-gold/80">
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
