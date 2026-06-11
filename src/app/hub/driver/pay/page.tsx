import { FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverSettlements } from "@/lib/hub/driver-app"
import { fmtCents } from "@/lib/hub/types"

export const dynamic = "force-dynamic"

export default async function DriverPayPage() {
  const user = await requireDriverUser()
  const settlements = await driverSettlements(user.carrierId, user.driverId)

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">My pay</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Every settlement, line by line — tap one to open the statement.
      </p>

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
                <p className="font-display text-xl font-extrabold text-gold">{fmtCents(s.net_cents)}</p>
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
