import { ChevronDown, FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverSettlements, driverSettlementLines } from "@/lib/hub/driver-app"
import { query } from "@/lib/hub/db"
import { fmtCentsExact } from "@/lib/hub/types"
import { AdvanceRequestForm } from "@/components/hub/driver/AdvanceRequestForm"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"
import { btnDriverSecondaryCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

const LINE_KIND_CLS: Record<string, string> = {
  earning: "border-green-500/40 bg-green-500/10 text-green-400",
  reimbursement: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  deduction: "border-red-500/40 bg-red-500/10 text-red-400",
}

export default async function DriverPayPage() {
  const user = await requireDriverUser()
  const [settlements, advances, escrow] = await Promise.all([
    driverSettlements(user.carrierId, user.driverId),
    query<{ id: string; amount_cents: number; status: string; issued_on: string; note: string | null }>(
      `SELECT id, amount_cents, status, issued_on, note FROM hub.advances
       WHERE carrier_id = $1 AND driver_id = $2 AND status IN ('pending','outstanding')
       ORDER BY created_at DESC LIMIT 5`,
      [user.carrierId, user.driverId]
    ),
    // The running escrow balance — the same ledger approveSettlement appends
    // to. Only drivers with an escrow program have rows; everyone else sees
    // nothing rather than a $0.00 that reads as "you have no escrow" when
    // the truth is "this carrier does not hold one for you".
    query<{ balance_cents: number }>(
      `SELECT balance_cents FROM hub.escrow_ledger
        WHERE carrier_id = $1 AND driver_id = $2 ORDER BY id DESC LIMIT 1`,
      [user.carrierId, user.driverId]
    ),
  ])
  const escrowBalance = escrow[0]?.balance_cents ?? null
  const linesBySettlement = new Map(
    await Promise.all(
      settlements.map(async (s) => [s.id, await driverSettlementLines(user.carrierId, user.driverId, s.id)] as const)
    )
  )

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-white">My pay</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Every settlement, line by line — tap one to see what&apos;s in it.
      </p>

      <div className="mb-4 space-y-2">
        {escrowBalance !== null ? (
          <p className="driver-card flex items-center justify-between px-3 py-2.5 text-sm">
            <span className="text-steel-100">Escrow on deposit</span>
            <span className="font-display font-extrabold text-[color:var(--driver-accent)]">{fmtCentsExact(escrowBalance)}</span>
          </p>
        ) : null}
        <AdvanceRequestForm />
        {advances.map((advance) => (
          <p key={advance.id} className="driver-card flex min-h-[56px] items-center justify-between gap-3 p-4 text-sm">
            <span className="text-steel-100">
              Advance {advance.status === "pending" ? "requested" : "approved"}
              {advance.note ? ` — ${advance.note}` : ""}
            </span>
            <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-[color:var(--driver-accent)]">
              {fmtCentsExact(advance.amount_cents)}
            </span>
          </p>
        ))}
      </div>

      {settlements.length === 0 ? (
        <EmptyStateDark
          title="No settlements yet"
          hint="Once the office approves your first settlement it shows up here with the PDF statement."
        />
      ) : (
        <ul className="hub-stagger space-y-3">
          {settlements.map((s) => {
            const lines = linesBySettlement.get(s.id) ?? []
            return (
              <li key={s.id}>
                <details className="group driver-card">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        Week of {new Date(s.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
                        {new Date(s.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[13px] text-steel-300">
                        {s.status === "paid" ? "Paid" : "Approved — payment on the way"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className="font-mono text-xl font-semibold tabular-nums text-[color:var(--driver-accent)]">{fmtCentsExact(s.net_cents)}</p>
                      <span className="-mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center text-steel-300" aria-hidden>
                        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                    <ul className="divide-y divide-white/10">
                      {lines.map((line) => (
                        <li key={line.id} className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sm">
                          <div className="min-w-0">
                            <span className={`mr-2 inline-flex rounded-pill border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${LINE_KIND_CLS[line.kind] ?? "border-white/20 bg-white/5 text-steel-300"}`}>
                              {line.kind}
                            </span>
                            <span className="text-steel-100">{line.label}</span>
                          </div>
                          <span className={`shrink-0 font-mono font-semibold tabular-nums ${line.kind === "deduction" ? "text-red-400" : "text-white"}`}>
                            {line.kind === "deduction" ? "−" : ""}{fmtCentsExact(line.amount_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {s.statement_url ? (
                      <a href={s.statement_url} target="_blank" rel="noreferrer" className={btnDriverSecondaryCls}>
                        <FileText className="h-5 w-5" /> Open statement
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
