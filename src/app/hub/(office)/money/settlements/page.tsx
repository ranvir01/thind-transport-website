import Link from "next/link"
import { listSettlements, escrowBalances } from "@/lib/hub/settlements"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, EmptyState, Pill, moneyCls, type PillTone } from "@/components/hub/ui"
import { DraftSettlementsButton } from "@/components/hub/MoneyActions"
import { cn } from "@/lib/utils"
import { formatHubDateShort } from "@/lib/hub/format-dates"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

/** Settlement status → Pill tone. Draft still needs review, paid is done. */
const STATUS_TONE: Record<string, PillTone> = {
  draft: "warn",
  approved: "info",
  paid: "ok",
}

export default async function SettlementsPage() {
  const user = await requirePermissionPage("money:read")
  const [settlements, escrow] = await Promise.all([
    listSettlements(user.carrierId),
    escrowBalances(user.carrierId),
  ])

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader
        title="Settlements"
        titleExtra={
          <HelpTip title="How settlements compute">
            Every driver settles through their pay plan (per-mile, percentage, bonuses,
            deductions) — the engine itemizes each line and the math is unit-tested to the
            penny. Approving generates the PDF statement, emails it, applies advances, and
            posts escrow.
          </HelpTip>
        }
        subtitle="Weekly driver pay: drafts → approval → statement PDF."
        action={can(user.role, "money:write") ? <DraftSettlementsButton /> : undefined}
      />

      {settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          hint="Run the weekly draft — every active driver with delivered, unsettled loads gets one."
          action={
            <Link
              href="/hub/drivers"
              className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Review drivers
            </Link>
          }
        />
      ) : (
        <div className="space-y-2 mb-6">
          {settlements.map((settlement) => (
            <Link key={settlement.id} href={`/hub/money/settlements/${settlement.id}`} className="block">
              <Panel className="p-3.5 hover:border-border-strong transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-fg">{settlement.driver_name}</span>
                      <Pill tone={STATUS_TONE[settlement.status] ?? "neutral"} size="xs" className="uppercase tracking-wide">
                        {settlement.status}
                      </Pill>
                      <span className="text-body-xs text-fg-3 uppercase">
                        {settlement.pay_type === "percentage" ? "Owner-op" : "Company"}
                      </span>
                    </div>
                    <p className="text-body-sm text-fg-2 mt-1">
                      {formatHubDateShort(settlement.period_start)} — {formatHubDateShort(settlement.period_end)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(moneyCls, "text-accent-text")}>{fmtCents(settlement.net_cents)}</p>
                    <p className="text-body-xs text-fg-3">
                      gross {fmtCents(settlement.gross_cents)} − {fmtCents(settlement.deductions_cents)}
                    </p>
                  </div>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}

      {escrow.length > 0 ? (
        <>
          <h2 className="text-base font-semibold text-fg mb-3">Escrow balances</h2>
          <Panel className="divide-y divide-border">
            {escrow.map((entry) => (
              <div key={entry.driver_id} className="flex items-center justify-between p-3.5 text-sm">
                <span className="text-fg-2 font-semibold">{entry.driver_name}</span>
                <span className={cn(moneyCls, "font-semibold")}>{fmtCents(Number(entry.balance_cents))}</span>
              </div>
            ))}
          </Panel>
        </>
      ) : null}
    </div>
  )
}
