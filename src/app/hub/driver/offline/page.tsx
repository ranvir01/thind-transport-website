import Link from "next/link"
import { WifiOff } from "lucide-react"
import { DriverBottomTabs } from "@/components/hub/DriverBottomTabs"

export default function DriverOfflinePage() {
  return (
    <main className="min-h-screen bg-navy px-4 pb-28 pt-10 text-white">
      <div className="mx-auto max-w-[430px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <WifiOff className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            You&apos;re offline
          </h1>
          <p className="mt-2 text-sm text-steel-100">
            Keep working. POD captures and status taps show as saved and will sync when your connection returns.
          </p>
          <Link
            href="/hub/driver"
            className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-orange px-5 font-display text-base font-bold uppercase tracking-[0.08em] text-white shadow-cta"
          >
            Back to load
          </Link>
        </div>
      </div>
      <DriverBottomTabs />
    </main>
  )
}
