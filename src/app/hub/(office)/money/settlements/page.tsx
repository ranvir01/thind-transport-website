import Link from "next/link"
import { listSettlements, escrowBalances } from "@/lib/hub/settlements"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink, EmptyState } from "@/components/hub/ui"
import { DraftSettlementsButton } from "@/components/hub/MoneyActions"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  draft: "bg-gold-500/15 text-gold-300 border-gold-400/30",
  approved: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
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
        subtitle="Weekly driver pay: drafts → approval → statement PDF."
        action={can(user.role, "money:write") ? <DraftSettlementsButton /> : undefined}
      />

      {settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          hint="Run the weekly draft — every active driver with delivered, unsettled loads gets one."
        />
      ) : (
        <div className="space-y-2 mb-6">
          {settlements.map((settlement) => (
            <Link key={settlement.id} href={`/hub/money/settlements/${settlement.id}`} className="block">
              <Panel className="p-3.5 hover:border-white/20 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{settlement.driver_name}</span>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[settlement.status])}>
                        {settlement.status}
                      </span>
                      <span className="text-body-xs text-steel-400 uppercase">
                        {settlement.pay_type === "percentage" ? "Owner-op" : "Company"}
                      </span>
                    </div>
                    <p className="text-body-sm text-steel-200 mt-1">
                      {String(settlement.period_start).slice(0, 10)} — {String(settlement.period_end).slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-extrabold text-gold">{fmtCents(settlement.net_cents)}</p>
                    <p className="text-body-xs text-steel-300">
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
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white mb-3">Escrow balances</h2>
          <Panel className="divide-y divide-white/5">
            {escrow.map((entry) => (
              <div key={entry.driver_id} className="flex items-center justify-between p-3.5 text-sm">
                <span className="text-steel-100 font-semibold">{entry.driver_name}</span>
                <span className="font-display font-extrabold text-white">{fmtCents(Number(entry.balance_cents))}</span>
              </div>
            ))}
          </Panel>
        </>
      ) : null}
    </div>
  )
}
