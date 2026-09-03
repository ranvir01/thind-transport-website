import Link from "next/link"
import { ChevronRight, Clock, Download, FileWarning, Plus, ShieldAlert, Wrench } from "lucide-react"
import { listIncidents } from "@/lib/hub/incidents"
import { listClaims, daysToDeadline } from "@/lib/hub/claims"
import { trucksAwaitingRepair } from "@/lib/hub/dvir"
import { fleetHosStatus, type HosLevel } from "@/lib/hub/telematics"
import { driverSafetyBoard, fleetSafetySnapshot } from "@/lib/hub/safety-events-db"
import { requirePermissionPage } from "@/lib/hub/session"
import { SafetyScorePanel } from "@/components/hub/SafetyScorePanel"
import { PageHeader, Panel, EmptyState, Pill, btnPrimaryCls } from "@/components/hub/ui"
import type { PillTone } from "@/components/hub/ui"

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
  const [incidents, openClaims, hosStatus, safety, safetyDrivers, grounded] = await Promise.all([
    listIncidents(user.carrierId),
    listClaims(user.carrierId, { openOnly: true }),
    fleetHosStatus(user.carrierId),
    fleetSafetySnapshot(user.carrierId),
    driverSafetyBoard(user.carrierId),
    trucksAwaitingRepair(user.carrierId),
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

      {/* Grounded — a truck on an unsafe DVIR earns nothing until somebody
          certifies the repair. This used to be discoverable only by opening
          trucks one at a time. */}
      {grounded.length > 0 ? (
        <Panel className="mb-4 p-4 md:p-5 border-bad-soft">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-bad" />
            <h2 className="text-[13.5px] font-semibold text-fg">Grounded — repair awaiting certification</h2>
            <Pill tone="bad" size="xs">{grounded.length}</Pill>
          </div>
          <ul className="divide-y divide-border">
            {grounded.map((g) => (
              <li key={g.dvir_id}>
                <Link
                  href={`/hub/fleet/trucks/${g.truck_id}`}
                  className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-control hover:bg-hover"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-fg truncate">Unit {g.truck_unit}</p>
                    <p className="text-body-xs text-fg-3 truncate">
                      {g.defects[0]?.label ?? "Defect"}{g.defects[0]?.note ? ` — ${g.defects[0].note}` : ""} · reported by {g.driver_name}{" "}
                      {new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent-text">
                    Certify repair <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Hours of service */}
      <Panel className="mb-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-text" />
            <h2 className="text-[13.5px] font-semibold text-fg">Hours of service</h2>
            {hosAtRisk.length > 0 ? (
              <Pill tone="bad" size="xs">{hosAtRisk.length} to watch</Pill>
            ) : null}
          </div>
        </div>
        {hosStatus.length === 0 ? (
          <p className="text-body-sm text-fg-3">
            No ELD data yet.{" "}
            <Link href="/hub/settings/integrations" className="font-semibold text-accent-text underline underline-offset-2">
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
                  className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-control hover:bg-hover"
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
                    tone={s.level === "violation" ? "red" : s.level === "critical" ? "severe" : "warn"}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* DOT accident register */}
      <Panel className="mb-4 p-4 md:p-5 border-warn-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warn" />
            <h2 className="text-[13.5px] font-semibold text-fg">
              DOT accident register
            </h2>
            <Pill tone="neutral" size="xs">{register.length}</Pill>
          </div>
          <a
            href="/api/hub/exports/accident-register"
            download
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control border border-border-strong px-3 text-body-xs font-semibold text-fg-2 hover:bg-hover"
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
                <Link href={`/hub/safety/${i.id}`} className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-control hover:bg-hover">
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
                    {i.injury_treated_away ? <Flag label="Injury" tone="severe" /> : null}
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
            <Pill tone="neutral" size="xs">{openClaims.length} open</Pill>
            {urgentClaims.length > 0 ? (
              <Pill tone="warn" size="xs" className="truncate">
                {urgentClaims.length} inside 30 days of the filing deadline
              </Pill>
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
            <Link href="/hub/safety/new" className={btnPrimaryCls}>
              <Plus className="h-4 w-4" /> Log an incident
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
                {i.dot_recordable ? <Flag label="DOT" tone="regulatory" /> : null}
                <Pill
                  tone={i.status === "closed" ? "neutral" : "warn"}
                  size="xs"
                  className="uppercase tracking-wider"
                >
                  {STATUS_LABEL[i.status]}
                </Pill>
              </div>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  )
}

/**
 * Flag tones are named for what the flag MEANS, not for a colour — the one
 * alias ("orange") that served both jobs inverted the ladder: it painted the
 * DOT marker and genuine severity the same, so `critical` HOS ("<1h left")
 * came out calmer than `warning` ("<2h left"), and "Injury" calmer than
 * "Tow-away". Tone is data, not decoration (DESIGN.md).
 *
 * The ladder: `red` (bad) tops it — a fatality, a blown HOS clock. `severe`
 * sits one rung under it and `warn` one under that; both currently resolve to
 * the same amber because the token set has exactly two hot rungs, so the
 * ordering is monotonic rather than inverted, and the call sites still declare
 * which rung they meant. `regulatory` is not a severity at all — it is the
 * "this one is DOT-recordable" marker, and info blue is the only tone that
 * says so without shouting.
 */
type FlagTone = "red" | "severe" | "warn" | "regulatory"

const FLAG_TONE: Record<FlagTone, PillTone> = {
  red: "bad",
  severe: "warn",
  warn: "warn",
  regulatory: "info",
}

function Flag({ label, tone }: { label: string; tone: FlagTone }) {
  return (
    <Pill tone={FLAG_TONE[tone]} size="xs" className="uppercase tracking-wider">
      {label}
    </Pill>
  )
}
