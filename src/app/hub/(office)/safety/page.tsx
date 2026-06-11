import Link from "next/link"
import { Download, Plus, ShieldAlert } from "lucide-react"
import { listIncidents } from "@/lib/hub/incidents"
import { requirePermissionPage } from "@/lib/hub/session"
import { PageHeader, Panel, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  under_review: "Under review",
  closed: "Closed",
}

export default async function SafetyPage() {
  const user = await requirePermissionPage("compliance:read")
  const incidents = await listIncidents(user.carrierId)
  const register = incidents.filter((i) => i.dot_recordable)

  return (
    <div>
      <PageHeader
        title="Safety"
        subtitle="Every incident on file — DOT-recordable accidents flow to the register automatically."
        action={
          <Link
            href="/hub/safety/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" /> Log incident
          </Link>
        }
      />

      {/* DOT accident register */}
      <Panel className="mb-4 p-4 md:p-5 border-orange/20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange" />
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
              DOT accident register
            </h2>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-steel-200">
              {register.length}
            </span>
          </div>
          <a
            href="/api/hub/exports/accident-register"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-body-xs font-semibold text-steel-100 hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" /> Download (auditor-ready CSV)
          </a>
        </div>
        <p className="text-body-xs text-steel-300 mb-3">
          An accident goes on the register when someone died, someone was treated away from the
          scene, or a vehicle was towed disabled (49 CFR 390.5). Keep it three years.
        </p>
        {register.length === 0 ? (
          <p className="text-body-sm text-steel-300">Nothing on the register. Keep it that way.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {register.slice(0, 10).map((i) => (
              <li key={i.id}>
                <Link href={`/hub/safety/${i.id}`} className="flex items-center justify-between gap-2 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {i.location ? ` — ${i.location}` : ""}
                    </p>
                    <p className="text-body-xs text-steel-300 truncate">
                      {[i.driver_name, i.truck_unit ? `#${i.truck_unit}` : null, i.load_reference]
                        .filter(Boolean)
                        .join(" · ") || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {i.fatality ? <Flag label="Fatality" tone="red" /> : null}
                    {i.injury_treated_away ? <Flag label="Injury" tone="orange" /> : null}
                    {i.tow_away_disabling ? <Flag label="Tow-away" tone="gold" /> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* All incidents */}
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white mb-3">All incidents</h2>
      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents on file"
          hint="Log fender-benders, cargo damage, and roadside events here — drivers can file first reports from their phones."
          action={
            <Link href="/hub/safety/new" className="inline-flex min-h-[44px] items-center rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400">
              Log an incident
            </Link>
          }
        />
      ) : (
        <Panel className="divide-y divide-white/5">
          {incidents.map((i) => (
            <Link key={i.id} href={`/hub/safety/${i.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-white/5">
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">
                  {new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {i.location ? ` — ${i.location}` : ""}
                </p>
                <p className="text-body-xs text-steel-300 truncate">
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
                      ? "border-white/15 bg-white/5 text-steel-300"
                      : "border-gold/40 bg-gold/10 text-gold"
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

function Flag({ label, tone }: { label: string; tone: "red" | "orange" | "gold" }) {
  const tones = {
    red: "border-red-500/40 bg-red-500/10 text-red-400",
    orange: "border-orange/40 bg-orange/10 text-orange",
    gold: "border-gold/40 bg-gold/10 text-gold",
  }
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tones[tone])}>
      {label}
    </span>
  )
}
