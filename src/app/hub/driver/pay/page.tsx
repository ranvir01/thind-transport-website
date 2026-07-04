import { FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverSettlements } from "@/lib/hub/driver-app"
import { query } from "@/lib/hub/db"
import { fmtCentsExact } from "@/lib/hub/types"
import { AdvanceRequestForm } from "@/components/hub/driver/AdvanceRequestForm"

export const dynamic = "force-dynamic"

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

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">My pay</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Every settlement, line by line — tap one to open the statement.
      </p>

      <div className="mb-4 space-y-2">
        <AdvanceRequestForm />
        {advances.map((advance) => (
          <p key={advance.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-800/80 px-3 py-2.5 text-sm">
            <span className="text-steel-100">
              Advance {advance.status === "pending" ? "requested" : "approved"}
              {advance.note ? ` — ${advance.note}` : ""}
            </span>
            <span className="font-display font-extrabold text-gold">{fmtCentsExact(advance.amount_cents)}</span>
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
          {settlements.map((s) => (
            <li key={s.id} className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
              <div className="flex items-center justify-between gap-2">
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
                <p className="font-display text-xl font-extrabold text-gold">{fmtCentsExact(s.net_cents)}</p>
              </div>
              {s.statement_url ? (
                <a
                  href={s.statement_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 font-display text-sm font-bold uppercase tracking-[0.06em] text-steel-100 hover:bg-white/5"
                >
                  <FileText className="h-4 w-4" /> Open statement
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
