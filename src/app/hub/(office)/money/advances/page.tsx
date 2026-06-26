import { listAdvances } from "@/lib/hub/settlements"
import { listDrivers } from "@/lib/hub/drivers"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink } from "@/components/hub/ui"
import { AdvanceForm } from "@/components/hub/MoneyForms"
import { AdvanceDecideButtons } from "@/components/hub/AdvanceDecideButtons"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  pending: "bg-steel-700/60 text-fg-2 border-steel-500/40",
  outstanding: "bg-gold-500/15 text-gold-300 border-gold-400/30",
  applied: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-400/30",
}

export default async function AdvancesPage() {
  const user = await requirePermissionPage("money:read")
  const [advances, drivers] = await Promise.all([
    listAdvances(user.carrierId),
    listDrivers(user.carrierId),
  ])

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader title="Advances" subtitle="Cash and EFS-code advances — auto-deducted on the next settlement." />
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
                    {String(advance.issued_on).slice(0, 10)}{advance.reference ? ` · ${advance.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[advance.status])}>
                    {advance.status === "pending" ? "driver asked" : advance.status}
                  </span>
                  <span className="font-mono font-medium text-accent-text tabular-nums">{fmtCentsExact(advance.amount_cents)}</span>
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
