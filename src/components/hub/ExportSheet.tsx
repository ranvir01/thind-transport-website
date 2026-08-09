"use client"

/**
 * The one Export button on Money — replaces the nine-chip wall. Opens a
 * grouped bottom sheet: Reports (CSV) · Tax · QuickBooks. QuickBooks leads
 * with Connect QBO (auto-sync); .IIF downloads are demoted under a
 * "Using QuickBooks Desktop?" disclosure because QBO cannot import .IIF at
 * all — Intuit keeps IIF Desktop-only.
 */
import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Download, FileSpreadsheet, FileText, Link2 } from "lucide-react"
import { BottomSheet } from "@/components/hub/BottomSheet"
import { cn } from "@/lib/utils"

// API download endpoints (not pages) — held in consts so the page-link lint
// rule doesn't misfire (same convention as the old chip wall).
const CSV_EXPORTS = [
  { kind: "invoices", label: "Invoices" },
  { kind: "payments", label: "Payments" },
  { kind: "expenses", label: "Expenses" },
  { kind: "settlements", label: "Settlements" },
] as const

const TAX_EXPORTS = [{ kind: "1099", label: "1099-NEC (contractor totals)" }] as const

const QBO_IIF_EXPORTS = [
  { kind: "qbo-iif-invoices", label: "Invoices (.IIF)" },
  { kind: "qbo-iif-payments", label: "Payments (.IIF)" },
  { kind: "qbo-iif", label: "Expenses (.IIF)" },
  { kind: "qbo-iif-settlements", label: "Settlements (.IIF)" },
] as const

function ExportRow({ kind, label, icon }: { kind: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={`/api/hub/exports/${kind}`}
      className="flex min-h-[48px] items-center gap-3 rounded-control px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-2 text-fg-3">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Download className="h-4 w-4 shrink-0 text-fg-3" />
    </a>
  )
}

export function ExportSheet() {
  const [open, setOpen] = useState(false)
  const [showIif, setShowIif] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-hover"
      >
        <Download className="h-4 w-4" /> Export
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Export"
        description="Reports download as CSV; books sync through QuickBooks."
      >
        <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
          Reports (CSV)
        </p>
        <div className="mb-4">
          {CSV_EXPORTS.map((row) => (
            <ExportRow key={row.kind} kind={row.kind} label={row.label} icon={<FileSpreadsheet className="h-4 w-4" />} />
          ))}
        </div>

        <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-3">Tax</p>
        <div className="mb-4">
          {TAX_EXPORTS.map((row) => (
            <ExportRow key={row.kind} kind={row.kind} label={row.label} icon={<FileText className="h-4 w-4" />} />
          ))}
        </div>

        <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-3">QuickBooks</p>
        <Link
          href="/hub/settings/integrations"
          onClick={() => setOpen(false)}
          className="flex min-h-[56px] items-center gap-3 rounded-card border border-border bg-surface px-3 shadow-card hover:bg-hover"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
            <Link2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-fg">Connect QuickBooks Online</span>
            <span className="block text-[12px] text-fg-3">
              Invoices and payments sync automatically — no files.
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setShowIif((v) => !v)}
          aria-expanded={showIif}
          className="mt-2 flex min-h-[40px] w-full items-center justify-between rounded-control px-2.5 text-[13px] font-medium text-fg-3 hover:bg-hover hover:text-fg-2"
        >
          Using QuickBooks Desktop?
          <ChevronDown className={cn("h-4 w-4 transition-transform", showIif && "rotate-180")} />
        </button>
        {showIif ? (
          <div className="pb-1">
            <p className="px-2.5 pb-1 text-[12px] text-fg-3">
              Desktop imports .IIF files (QuickBooks Online can&apos;t):
            </p>
            {QBO_IIF_EXPORTS.map((row) => (
              <ExportRow key={row.kind} kind={row.kind} label={row.label} icon={<FileText className="h-4 w-4" />} />
            ))}
          </div>
        ) : null}
      </BottomSheet>
    </>
  )
}
