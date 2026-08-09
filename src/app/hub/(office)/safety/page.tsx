import Link from "next/link"
import { ChevronRight, Clock, Download, FileWarning, Plus, ShieldAlert } from "lucide-react"
import { listIncidents } from "@/lib/hub/incidents"
import { listClaims, daysToDeadline } from "@/lib/hub/claims"
import { fleetHosStatus, type HosLevel } from "@/lib/hub/telematics"
import { driverSafetyBoard, fleetSafetySnapshot } from "@/lib/hub/safety-events-db"
import { requirePermissionPage } from "@/lib/hub/session"
import { SafetyScorePanel } from "@/components/hub/SafetyScorePanel"
import { PageHeader, Panel, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  under_review: "Under review",
  closed: "Closed",
}

const HOS_LEVEL_LABEL: Record<HosLevel, string> = {
  violation: "Out of hours",
  critical: "<1h left",
  warning: "<2h left",
  ok: "OK",
  stale: "No recent data",
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—"
  const clamped = Math.max(minutes, 0)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function SafetyPage() {
  const user = await requirePermissionPage("compliance:read")
  const [incidents, openClaims, hosStatus, safety, safetyDrivers] = await Promise.all([
    listIncidents(user.carrierId),
    listClaims(user.carrierId, { openOnly: true }),
    fleetHosStatus(user.carrierId),
    fleetSafetySnapshot(user.carrierId),
    driverSafetyBoard(user.carrierId),
  ])
  const register = incidents.filter((i) => i.dot_recordable)
  const urgentClaims = openClaims.filter((c) => {
    const days = daysToDeadline(c.filing_deadline)
    return days !== null && days <= 30
  })
  const hosAtRisk = hosStatus.filter((s) => s.level === "violation" || s.level === "critical" || s.level === "warning")

  return (
    <div>
      <PageHeader
        title="Safety"
        subtitle="Every incident on file — DOT-recordable accidents flow to the register automatically."
        titleExtra={
          <HelpTip title="DOT accident register">
            49 CFR 390.5 defines an &quot;accident&quot;: a fatality, an injury treated away from
            the scene, or a vehicle towed with disabling damage. 390.15(b) says you keep a
            register of those for three years and hand it over on demand. The three yes/no
            questions on every incident keep this register building itself.
          </HelpTip>
        }
        action={
          <Link
            href="/hub/safety/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Log incident
          </Link>
        }
      />

      <SafetyScorePanel
        series={safety.series}
        current={safety.current}
        kindMix={safety.kindMix}
        drivers={safetyDrivers}
      />

      {/* Hours of service */}
      <Panel className="mb-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-text" />
            <h2 className="text-[13.5px] font-semibold text-fg">Hours of service</h2>
            {hosAtRisk.length > 0 ? (
              <span className="rounded-full border border-bad-soft bg-bad-soft px-2 py-0.5 text-[11px] font-bold text-bad">
                {hosAtRisk.length} to watch
              </span>
            ) : null}
          </div>
        </div>
        {hosStatus.length === 0 ? (
          <p className="text-body-sm text-fg-3">
            No ELD data yet.{" "}
            <Link href="/hub/settings/integrations" className="text-accent-text hover:underline">
              Connect Terminal or TruckerCloud
            </Link>{" "}
            to see the fleet&apos;s drive clocks here.
          </p>
        ) : hosAtRisk.length === 0 ? (
          <p className="text-body-sm text-fg-3">
            All {hosStatus.length} active driver{hosStatus.length === 1 ? "" : "s"} within hours-of-service
            limits as of the last sync.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {hosAtRisk.slice(0, 10).map((s) => (
              <li key={s.driverId}>
                <Link
                  href={`/hub/drivers/${s.driverId}`}
                  className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-lg hover:bg-hover"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-fg truncate">{s.driverName}</p>
                    <p className="text-body-xs text-fg-3 truncate">
                      {s.dutyStatus ?? "unknown duty status"} · drive clock {formatMinutes(s.driveRemainingMinutes)}
                      {s.source === "computed" ? " · computed from duty log (ELD feed stale)" : ""}
                    </p>
                  </div>
                  <Flag
                    label={HOS_LEVEL_LABEL[s.level]}
                    tone={s.level === "violation" ? "red" : s.level === "critical" ? "orange" : "warn"}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* DOT accident register */}
      <Panel className="mb-4 p-4 md:p-5 border-orange/20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange" />
            <h2 className="text-[13.5px] font-semibold text-fg">
              DOT accident register
            </h2>
            <span className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-2">
              {register.length}
            </span>
          </div>
          <a
            href="/api/hub/exports/accident-register"
            download
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover"
          >
            <Download className="h-3.5 w-3.5" /> Download (auditor-ready CSV)
          </a>
        </div>
        <p className="text-body-xs text-fg-3 mb-3">
          An accident goes on the register when someone died, someone was treated away from the
          scene, or a vehicle was towed disabled (49 CFR 390.5). Keep it three years.
        </p>
        {register.length === 0 ? (
          <p className="text-body-sm text-fg-3">Nothing on the register. Keep it that way.</p>
        ) : (
          <ul className="divide-y divide-border">
            {register.slice(0, 10).map((i) => (
              <li key={i.id}>
                <Link href={`/hub/safety/${i.id}`} className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-lg hover:bg-hover">
                  <div className="min-w-0">
                    <p className="font-semibold text-fg truncate">
                      {new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {i.location ? ` — ${i.location}` : ""}
                    </p>
                    <p className="text-body-xs text-fg-3 truncate">
                      {[i.driver_name, i.truck_unit ? `#${i.truck_unit}` : null, i.load_reference]
                        .filter(Boolean)
                        .join(" · ") || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {i.fatality ? <Flag label="Fatality" tone="red" /> : null}
                    {i.injury_treated_away ? <Flag label="Injury" tone="orange" /> : null}
                    {i.tow_away_disabling ? <Flag label="Tow-away" tone="warn" /> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Claims */}
      <Panel className="mb-4 p-0">
        <Link href="/hub/safety/claims" className="flex items-center justify-between gap-2 p-4 md:p-5 hover:bg-hover rounded-card">
          <div className="flex items-center gap-2 min-w-0">
            <FileWarning className="h-4 w-4 text-accent-text shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-fg">Claims</h2>
            <span className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-2">
              {openClaims.length} open
            </span>
            {urgentClaims.length > 0 ? (
              <span className="rounded-full border border-warn-soft bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn truncate">
                {urgentClaims.length} inside 30 days of the filing deadline
              </span>
            ) : null}
          </div>
          <ChevronRight className="h-4 w-4 text-fg-3 shrink-0" />
        </Link>
      </Panel>

      {/* All incidents */}
      <h2 className="text-base font-semibold text-fg mb-3">All incidents</h2>
      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents on file"
          hint="Log fender-benders, cargo damage, and roadside events here — drivers can file first reports from their phones."
          action={
            <Link href="/hub/safety/new" className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover">
              Log an incident
            </Link>
          }
        />
      ) : (
        <Panel className="divide-y divide-border">
          {incidents.map((i) => (
            <Link key={i.id} href={`/hub/safety/${i.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-hover">
              <div className="min-w-0">
                <p className="font-semibold text-fg truncate">
                  {new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {i.location ? ` — ${i.location}` : ""}
                </p>
                <p className="text-body-xs text-fg-3 truncate">
                  {[i.driver_name, i.truck_unit ? `#${i.truck_unit}` : null].filter(Boolean).join(" · ") || "Unassigned"}
                  {i.description ? ` · ${i.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.dot_recordable ? <Flag label="DOT" tone="orange" /> : null}
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                    i.status === "closed"
                      ? "border-border-strong bg-surface-2 text-fg-3"
                      : "border-warn-soft bg-warn-soft text-warn"
                  )}
                >
                  {STATUS_LABEL[i.status]}
                </span>
              </div>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  )
}

function Flag({ label, tone }: { label: string; tone: "red" | "orange" | "warn" }) {
  const tones = {
    red: "border-bad-soft bg-bad-soft text-bad",
    // "orange" kept as the tone name callers use; the marketing orange token
    // failed AA (3.8:1) and office screens are semantic-token-only — the DOT
    // regulatory flag reads as info blue, distinct from red/amber severity.
    orange: "border-info-soft bg-info-soft text-info",
    warn: "border-warn-soft bg-warn-soft text-warn",
  }
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tones[tone])}>
      {label}
    </span>
  )
}
