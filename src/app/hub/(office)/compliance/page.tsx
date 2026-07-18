import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { complianceEntries, summarize } from "@/lib/hub/compliance"
import {
  WALL_ENTITIES,
  WALL_ENTITY_LABELS,
  entityCounts,
  filterWall,
  parseWallFilter,
  wallHref,
} from "./wall-filter"
import { requirePermissionPage } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill, Pill } from "@/components/hub/ui"
import { AddComplianceItemForm, ResolveItemButton } from "@/components/hub/ComplianceForms"
import { cn } from "@/lib/utils"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const COLOR_DOT: Record<string, string> = {
  red: "bg-bad",
  amber: "bg-warn",
  green: "bg-ok",
}

// Full class strings (never interpolated) so Tailwind sees them.
const SUMMARY_TILES = [
  { color: "red", label: "Expired / overdue", restCls: "border-bad-soft", activeCls: "border-bad", textCls: "text-bad" },
  { color: "amber", label: "Due in 30 days", restCls: "border-warn-soft", activeCls: "border-warn", textCls: "text-warn" },
  { color: "green", label: "Clean", restCls: "border-ok-soft", activeCls: "border-ok", textCls: "text-ok" },
] as const

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; color?: string }>
}) {
  const user = await requirePermissionPage("compliance:read")
  const filter = parseWallFilter(await searchParams)
  // complianceEntries() already merges the auto-generated IFTA filing entries
  // (and sorts the wall) — merging them here again rendered every IFTA filing
  // twice and double-counted it in the summary tiles.
  const entries = await complianceEntries(user.carrierId)
  // Tiles and chips always count the whole wall; only the list below filters.
  const summary = summarize(entries)
  const counts = entityCounts(entries)
  const visible = filterWall(entries, filter)
  const filtered = filter.entity !== null || filter.color !== null

  return (
    <div>
      <PageHeader
        title="Compliance"
        titleExtra={
          <HelpTip title="What this wall tracks">
            Driver files (CDL, medical card — 49 CFR 391), truck files (registration,
            annual inspection — 396.17, insurance), trailer files (registration, annual
            inspection — 396.17), company items (2290, UCR, IFTA decals), and the IFTA
            quarterly filing itself (auto-tracked — clears when marked filed). Red is
            expired, amber is inside 30 days. The daily scan emails the office at
            60/30/7 days.
          </HelpTip>
        }
        subtitle="CDLs, med cards, registrations, inspections, 2290, UCR, IFTA — one wall, color-coded."
        action={
          <Link
            href="/hub/compliance/ifta"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <FileSpreadsheet className="h-4 w-4" /> IFTA
          </Link>
        }
      />

      {/* Red / amber / green summary — each tile toggles the wall to its bucket */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {SUMMARY_TILES.map((tile) => {
          const active = filter.color === tile.color
          return (
            <Link
              key={tile.color}
              href={wallHref({ ...filter, color: active ? null : tile.color })}
              title={active ? "Show all statuses" : `Show only: ${tile.label.toLowerCase()}`}
            >
              <Panel className={cn("h-full p-4 transition-colors hover:bg-hover", active ? tile.activeCls : tile.restCls)}>
                <span className={cn("text-label uppercase", tile.textCls)}>{tile.label}</span>
                <p className={cn("mt-2 font-display text-3xl font-extrabold", tile.textCls)}>{summary[tile.color]}</p>
              </Panel>
            </Link>
          )
        })}
      </div>

      {/* Entity filter */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={wallHref({ ...filter, entity: null })}>
          <Pill tone={filter.entity === null ? "accent" : "neutral"}>All ({entries.length})</Pill>
        </Link>
        {WALL_ENTITIES.map((entity) => (
          <Link key={entity} href={wallHref({ ...filter, entity: filter.entity === entity ? null : entity })}>
            <Pill tone={filter.entity === entity ? "accent" : "neutral"}>
              {WALL_ENTITY_LABELS[entity]} ({counts[entity]})
            </Pill>
          </Link>
        ))}
      </div>

      {/* Add company item */}
      <Panel className="p-4 mb-4">
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">
          Track a company item (2290 per truck, UCR, IFTA license/decals, BOC-3, consortium…)
        </h2>
        <AddComplianceItemForm />
      </Panel>

      {/* The wall */}
      {filtered ? (
        <p className="mb-2 text-body-xs text-fg-3">
          Showing {visible.length} of {entries.length} items ·{" "}
          <Link href="/hub/compliance" className="underline hover:text-accent-text">clear filter</Link>
        </p>
      ) : null}
      <Panel className="divide-y divide-border">
        {filtered && visible.length === 0 ? (
          <p className="p-6 text-center text-body-sm text-fg-2">Nothing matches this filter.</p>
        ) : null}
        {visible.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", COLOR_DOT[entry.color])} />
            <div className="min-w-0 flex-1">
              {entry.manualItemId ? (
                <p className="text-sm font-semibold text-fg truncate">{entry.kind}</p>
              ) : (
                <Link href={entry.href} className="text-sm font-semibold text-fg hover:text-accent-text truncate block">
                  {entry.name} — {entry.kind}
                </Link>
              )}
              <p className="text-body-xs text-fg-3 uppercase">{entry.entity}</p>
            </div>
            <ExpiryPill date={entry.due} />
            {entry.manualItemId ? <ResolveItemButton id={entry.manualItemId} /> : null}
          </div>
        ))}
      </Panel>
      <p className="mt-3 text-body-xs text-fg-3">
        Annual inspections per 49 CFR 396.17 · DQ files per 49 CFR 391.51 · daily scan emails the office at 60/30/7 days.
      </p>
    </div>
  )
}
