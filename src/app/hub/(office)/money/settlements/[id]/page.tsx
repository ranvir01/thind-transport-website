import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { getSettlement, getSettlementLines } from "@/lib/hub/settlements"
import { getActivePayRules } from "@/lib/hub/pay-rules-db"
import { summarizePayRules } from "@/lib/hub/pay-rules"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink } from "@/components/hub/ui"
import { SettlementActions } from "@/components/hub/MoneyActions"
import { formatHubDateShort } from "@/lib/hub/format-dates"

export const dynamic = "force-dynamic"

export default async function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("money:read")
  const { id } = await params
  const settlement = await getSettlement(user.carrierId, id).catch(() => null)
  if (!settlement) notFound()
  const lines = await getSettlementLines(id)

  // Describe the driver's actual pay program rather than assuming the legacy
  // 90%/100%-FSC split (custom rule sets and other rates exist).
  const ruleSet = await getActivePayRules(user.carrierId, settlement.driver_id).catch(() => null)
  const ruleSummary = ruleSet ? summarizePayRules(ruleSet) : ""
  const payLabel = ruleSet
    ? `${ruleSet.name}${ruleSummary ? ` (${ruleSummary})` : ""}`
    : settlement.pay_type === "percentage" ? "Owner-operator (percentage)" : "Company driver (per mile)"

  return (
    <div>
      <BackLink href="/hub/money/settlements" label="Settlements" />
      <PageHeader
        title={`${settlement.driver_name} — ${formatHubDateShort(settlement.period_start)} → ${formatHubDateShort(settlement.period_end)}`}
        subtitle={`Status: ${settlement.status} · ${payLabel}`}
        action={
          settlement.statement_url ? (
            <a
              href={settlement.statement_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              <FileText className="h-4 w-4" /> Statement PDF
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2 p-4 md:p-5">
          <h2 className="text-[13.5px] font-semibold text-fg mb-3">Lines</h2>
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className={`mr-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                    line.kind === "earning" ? "bg-ok-soft text-ok border-ok-soft"
                    : line.kind === "reimbursement" ? "bg-info-soft text-info border-info-soft"
                    : "bg-bad-soft text-bad border-bad-soft"
                  }`}>
                    {line.kind}
                  </span>
                  <span className="text-fg-2">{line.label}</span>
                  {line.source_type === "load" && line.source_id ? (
                    <Link href={`/hub/loads/${line.source_id}`} className="ml-2 text-body-xs text-accent-text">view load</Link>
                  ) : null}
                </div>
                <span className={`font-semibold shrink-0 ${line.kind === "deduction" ? "text-bad" : "text-fg"}`}>
                  {line.kind === "deduction" ? "−" : ""}{fmtCentsExact(line.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Totals</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-fg-2">Gross</dt><dd className="text-fg font-semibold">{fmtCentsExact(settlement.gross_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Deductions</dt><dd className="text-bad font-semibold">−{fmtCentsExact(settlement.deductions_cents)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-fg font-bold">Net pay</dt>
                <dd className="font-display text-accent-text font-extrabold text-lg">{fmtCentsExact(settlement.net_cents)}</dd>
              </div>
            </dl>
          </Panel>
          {can(user.role, "money:approve") ? (
            <SettlementActions settlementId={id} status={settlement.status} />
          ) : null}
          <p className="text-body-xs text-fg-3">
            Approving applies advances, posts the escrow contribution to the ledger, generates the statement PDF, and emails the driver. Every line links to its source record.
          </p>
        </div>
      </div>
    </div>
  )
}
