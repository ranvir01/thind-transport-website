import Link from "next/link"
import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { fmtCentsExact } from "@/lib/hub/types"
import { DriverBottomTabs } from "@/components/hub/DriverBottomTabs"

export const dynamic = "force-dynamic"

const earnings = [
  { label: "TT-7004 loaded miles", amount: 126750 },
  { label: "Detention approved", amount: 12000 },
  { label: "Lumper reimbursement", amount: 4300 },
]
const deductions = [
  { label: "Advance recapture", amount: 15000 },
  { label: "Escrow contribution", amount: 5000 },
]

export default async function DriverPayPage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  const gross = earnings.reduce((sum, line) => sum + line.amount, 0)
  const deduct = deductions.reduce((sum, line) => sum + line.amount, 0)

  return (
    <main className="min-h-screen bg-navy px-4 pb-28 pt-5 text-white">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gold">
              {user.dataMode === "sandbox" ? "SANDBOX DRIVER" : "Driver app"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white">Current week pay</h1>
            <p className="mt-1 text-sm text-steel-200">Live settlement preview. Final pay depends on office approval.</p>
          </div>
          <Link href="/hub/driver" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-steel-100">
            Load
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-steel-300">Estimated net</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-gold">{fmtCentsExact(gross - deduct)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs text-steel-300">Gross</p>
              <p className="mt-1 text-right font-bold tabular-nums text-white">{fmtCentsExact(gross)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs text-steel-300">Deductions</p>
              <p className="mt-1 text-right font-bold tabular-nums text-white">{fmtCentsExact(deduct)}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Earnings</h2>
          <div className="mt-3 space-y-2">
            {earnings.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-steel-100">{line.label}</span>
                <span className="font-bold tabular-nums text-white">{fmtCentsExact(line.amount)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Deductions</h2>
          <div className="mt-3 space-y-2">
            {deductions.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-steel-100">{line.label}</span>
                <span className="font-bold tabular-nums text-white">−{fmtCentsExact(line.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <DriverBottomTabs />
    </main>
  )
}
