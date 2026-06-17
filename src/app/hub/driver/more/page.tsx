import Link from "next/link"
import { redirect } from "next/navigation"
import { Home, LogOut, Smartphone } from "lucide-react"
import { getHubUser } from "@/lib/hub/session"
import { DriverBottomTabs } from "@/components/hub/DriverBottomTabs"

export const dynamic = "force-dynamic"

export default async function DriverMorePage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")

  return (
    <main className="min-h-screen bg-navy px-4 pb-28 pt-5 text-white">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gold">
            {user.dataMode === "sandbox" ? "SANDBOX DRIVER" : "Driver app"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white">More</h1>
          <p className="mt-1 text-sm text-steel-200">Install help, office link, and account actions.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <Smartphone className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-white">Install on iPhone</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-steel-100">
                <li>Open this page in Safari over the HTTPS tunnel or Vercel preview.</li>
                <li>Tap the Share button.</li>
                <li>Tap Add to Home Screen.</li>
                <li>Open HaulDesk from the new icon.</li>
              </ol>
            </div>
          </div>
        </section>

        <div className="mt-4 space-y-3">
          <Link href="/hub" className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 font-semibold text-white">
            <Home className="h-5 w-5 text-gold" /> Office view
          </Link>
          <Link href="/hub/login" className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 font-semibold text-white">
            <LogOut className="h-5 w-5 text-gold" /> Switch account
          </Link>
        </div>

        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-steel-100">
          Support: call dispatch before editing money or paperwork. This driver app is optimized for sunlight, gloves, and weak signal.
        </p>
      </div>
      <DriverBottomTabs />
    </main>
  )
}
