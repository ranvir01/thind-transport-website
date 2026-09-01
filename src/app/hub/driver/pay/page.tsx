import { ChevronDown, FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverSettlements, driverSettlementLines } from "@/lib/hub/driver-app"
import { query } from "@/lib/hub/db"
import { fmtCentsExact } from "@/lib/hub/types"
import { AdvanceRequestForm } from "@/components/hub/driver/AdvanceRequestForm"

export const dynamic = "force-dynamic"

const LINE_KIND_CLS: Record<string, string> = {
  earning: "border-green-500/40 bg-green-500/10 text-green-400",
  reimbursement: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  deduction: "border-red-500/40 bg-red-500/10 text-red-400",
}

export default async function DriverPayPage() {
  const user = await requireDriverUser()
  const [settlements, advances] = await Promise.all([
    driverSettlements(user.carrierId, user.driverId),
    query<{ id: string; amount_cents: number; status: string; issued_on: string; note: string | null }>(
      `SELECT id, amount_cents, status, issued_on, note FROM hub.advances
       WHERE carrier_id = $1 AND driver_id = $2 AND status IN ('pending','outstanding')
       ORDER BY created_at DESC LIMIT 5`,
      [user.carrierId, user.driverId]
    ),
  ])
  const linesBySettlement = new Map(
    await Promise.all(
      settlements.map(async (s) => [s.id, await driverSettlementLines(user.carrierId, user.driverId, s.id)] as const)
    )
  )

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">My pay</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Every settlement, line by line — tap one to see what&apos;s in it.
      </p>

      <div className="mb-4 space-y-2">
        <AdvanceRequestForm />
        {advances.map((advance) => (
          <p key={advance.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-800/80 px-3 py-2.5 text-sm">
            <span className="text-steel-100">
              Advance {advance.status === "pending" ? "requested" : "approved"}
              {advance.note ? ` — ${advance.note}` : ""}
            </span>
            <span className="font-display font-extrabold text-[color:var(--driver-accent)]">{fmtCentsExact(advance.amount_cents)}</span>
          </p>
        ))}
      </div>

      {settlements.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-navy-800/80 p-6 text-center">
          <p className="font-semibold text-white">No settlements yet</p>
          <p className="mt-1 text-body-sm text-steel-300">
            Once the office approves your first settlement it shows up here with the PDF statement.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {settlements.map((s) => {
            const lines = linesBySettlement.get(s.id) ?? []
            return (
              <li key={s.id}>
                <details className="group rounded-2xl border border-white/10 bg-navy-800/80">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="font-semibold text-white">
                        Week of {new Date(s.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
                        {new Date(s.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-body-xs text-steel-300">
                        {s.status === "paid" ? "Paid" : "Approved — payment on the way"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-display text-xl font-extrabold text-[color:var(--driver-accent)]">{fmtCentsExact(s.net_cents)}</p>
                      <ChevronDown className="h-4 w-4 text-steel-400 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-2">
                    <ul className="divide-y divide-white/10">
                      {lines.map((line) => (
                        <li key={line.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <div className="min-w-0">
                            <span className={`mr-2 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${LINE_KIND_CLS[line.kind] ?? "border-white/20 bg-white/5 text-steel-300"}`}>
                              {line.kind}
                            </span>
                            <span className="text-steel-100">{line.label}</span>
                          </div>
                          <span className={`shrink-0 font-semibold ${line.kind === "deduction" ? "text-red-400" : "text-white"}`}>
                            {line.kind === "deduction" ? "−" : ""}{fmtCentsExact(line.amount_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {s.statement_url ? (
                      <a
                        href={s.statement_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 font-display text-sm font-bold uppercase tracking-[0.06em] text-steel-100 hover:bg-white/5"
                      >
                        <FileText className="h-4 w-4" /> Open statement
                      </a>
                    ) : null}
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
