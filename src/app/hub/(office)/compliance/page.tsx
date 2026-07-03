import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { complianceEntries, summarize } from "@/lib/hub/compliance"
import { requirePermissionPage } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill } from "@/components/hub/ui"
import { AddComplianceItemForm, ResolveItemButton } from "@/components/hub/ComplianceForms"
import { cn } from "@/lib/utils"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const COLOR_DOT: Record<string, string> = {
  red: "bg-red-400",
  amber: "bg-warn",
  green: "bg-emerald-400",
}

export default async function CompliancePage() {
  const user = await requirePermissionPage("compliance:read")
  const entries = await complianceEntries(user.carrierId)
  const summary = summarize(entries)

  return (
    <div>
      <PageHeader
        title="Compliance"
        titleExtra={
          <HelpTip title="What this wall tracks">
            Driver files (CDL, medical card — 49 CFR 391), truck files (registration,
            annual inspection — 396.17, insurance), and company items (2290, UCR, IFTA
            decals). Red is expired, amber is inside 30 days. The daily scan emails the
            office at 60/30/7 days.
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

      {/* Red / amber / green summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Panel className="p-4 border-red-400/30">
          <span className="text-label text-red-300 uppercase">Expired / overdue</span>
          <p className="mt-2 font-display text-3xl font-extrabold text-red-300">{summary.red}</p>
        </Panel>
        <Panel className="p-4 border-warn/30">
          <span className="text-label text-warn uppercase">Due in 30 days</span>
          <p className="mt-2 font-display text-3xl font-extrabold text-warn">{summary.amber}</p>
        </Panel>
        <Panel className="p-4 border-emerald-400/30">
          <span className="text-label text-emerald-300 uppercase">Clean</span>
          <p className="mt-2 font-display text-3xl font-extrabold text-emerald-300">{summary.green}</p>
        </Panel>
      </div>

      {/* Add company item */}
      <Panel className="p-4 mb-4">
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">
          Track a company item (2290 per truck, UCR, IFTA license/decals, BOC-3, consortium…)
        </h2>
        <AddComplianceItemForm />
      </Panel>

      {/* The wall */}
      <Panel className="divide-y divide-border">
        {entries.map((entry, i) => (
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
