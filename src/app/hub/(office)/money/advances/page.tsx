import { listAdvances } from "@/lib/hub/settlements"
import { listDrivers } from "@/lib/hub/drivers"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents, fmtCentsExact } from "@/lib/hub/types"
import { advanceBalances } from "@/lib/hub/advances-core"
import { Panel, PageHeader, BackLink, Pill, moneyCls, type PillTone } from "@/components/hub/ui"
import { AdvanceForm } from "@/components/hub/MoneyForms"
import { AdvanceDecideButtons } from "@/components/hub/AdvanceDecideButtons"
import { cn } from "@/lib/utils"
import { formatHubDateShort } from "@/lib/hub/format-dates"

export const dynamic = "force-dynamic"

/** Advance status → Pill tone. Outstanding is money the driver still owes back. */
const STATUS_TONE: Record<string, PillTone> = {
  pending: "neutral",
  outstanding: "warn",
  applied: "ok",
  cancelled: "bad",
}

export default async function AdvancesPage() {
  const user = await requirePermissionPage("money:read")
  const [advances, drivers] = await Promise.all([
    listAdvances(user.carrierId),
    listDrivers(user.carrierId),
  ])
  const balances = advanceBalances(advances)

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader title="Advances" subtitle="Cash and EFS-code advances — auto-deducted on the next settlement." />

      {balances.length > 0 ? (
        <Panel className="mb-4 p-4">
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Owed by driver</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {balances.map((b) => (
              <li key={b.driver_id} className="flex items-baseline justify-between gap-2 rounded-control border border-border bg-surface-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{b.driver_name}</p>
                  {b.pending_cents > 0 ? (
                    <p className="text-body-xs text-fg-3">{fmtCentsExact(b.pending_cents)} awaiting approval</p>
                  ) : (
                    <p className="text-body-xs text-fg-3">recovers next settlement</p>
                  )}
                </div>
                <span className={cn(moneyCls, "shrink-0 text-sm text-accent-text")}>{fmtCents(b.exposure_cents)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {can(user.role, "money:write") ? (
          <AdvanceForm drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))} />
        ) : null}
        <Panel className="divide-y divide-border">
          {advances.length === 0 ? (
            <p className="p-5 text-body-sm text-fg-3">No advances recorded.</p>
          ) : (
            advances.map((advance) => (
              <div key={advance.id} className="flex items-center justify-between gap-2 p-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{advance.driver_name}</p>
                  <p className="text-body-xs text-fg-3">
                    {formatHubDateShort(advance.issued_on)}{advance.reference ? ` · ${advance.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill tone={STATUS_TONE[advance.status] ?? "neutral"} size="xs" className="uppercase tracking-wide">
                    {advance.status === "pending" ? "driver asked" : advance.status}
                  </Pill>
                  <span className={cn(moneyCls, "text-accent-text")}>{fmtCentsExact(advance.amount_cents)}</span>
                  {advance.status === "pending" && can(user.role, "money:approve") ? (
                    <AdvanceDecideButtons id={advance.id} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}
