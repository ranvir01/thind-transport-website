import Link from "next/link"
import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { DriverPwaClient } from "@/components/hub/DriverPwaClient"
import { DriverBottomTabs } from "@/components/hub/DriverBottomTabs"

export const dynamic = "force-dynamic"

export default async function HubDriverPage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")

  return (
    <main className="min-h-screen bg-navy px-4 pb-28 pt-5 text-white">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gold">
              {user.dataMode === "sandbox" ? "SANDBOX DRIVER" : "Driver app"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white">
              Today&apos;s load
            </h1>
            <p className="mt-1 text-sm text-steel-200">Welcome, {user.name}. Confirm status, POD, and pay from the road.</p>
          </div>
          <Link href="/hub" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-steel-100">
            Office
          </Link>
        </div>

        <section className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-steel-300">Current status</p>
              <p className="mt-1 text-xl font-bold text-white">In transit to Fresno, CA</p>
            </div>
            <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-gold">
              Live
            </span>
          </div>
          <button className="mt-4 min-h-[60px] w-full rounded-2xl bg-orange px-5 font-display text-base font-bold uppercase tracking-[0.08em] text-white shadow-cta">
            Arrived at delivery
          </button>
        </section>

        <DriverPwaClient />
      </div>

      <DriverBottomTabs />
    </main>
  )
}
