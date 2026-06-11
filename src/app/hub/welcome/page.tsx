import Link from "next/link"
import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { OFFICE_ROLES } from "@/lib/hub/types"
import { COMPANY_INFO } from "@/lib/constants"
import { Panel } from "@/components/hub/ui"
import { SignOutButton } from "@/components/hub/SignOutButton"

const ROLE_COPY: Record<string, { title: string; body: string; phase: string }> = {
  driver: {
    title: "Your driver hub is on the way",
    body: "Soon you'll get dispatches, update load statuses, snap PODs, and see your settlements right here.",
    phase: "Phase 4",
  },
  broker: {
    title: "Your carrier portal is on the way",
    body: "Soon you'll track your loads with Thind live, download PODs and invoices, and see payment status here.",
    phase: "Phase 5",
  },
  shipper: {
    title: "Your shipper portal is on the way",
    body: "Soon you'll request quotes, track shipments, and download delivery documents here.",
    phase: "Phase 5",
  },
}

export default async function HubWelcomePage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (OFFICE_ROLES.includes(user.role)) redirect("/hub")

  const copy = ROLE_COPY[user.role] ?? ROLE_COPY.driver

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8 text-center">
        <span className="brand-wordmark text-2xl font-semibold text-white tracking-[0.14em]">THIND</span>
        <span className="block text-[11px] font-bold uppercase tracking-[0.3em] text-gold mt-1">
          Transport Hub
        </span>
        <p className="mt-6 inline-flex rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
          Coming in {copy.phase}
        </p>
        <h1 className="mt-3 font-display text-xl font-extrabold uppercase tracking-wide text-white">
          {copy.title}
        </h1>
        <p className="mt-2 text-body-sm text-steel-200">
          Hi {user.name.split(" ")[0]} — you&apos;re signed in. {copy.body}
        </p>
        <p className="mt-4 text-body-sm text-steel-200">
          Until then, dispatch has you covered:{" "}
          <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-gold font-semibold">
            {COMPANY_INFO.phone}
          </a>
        </p>
        <div className="mt-6 space-y-3">
          <SignOutButton />
          <Link href="/" className="block text-body-sm text-steel-300 hover:text-white">
            Back to thindtransport.com
          </Link>
        </div>
      </Panel>
    </div>
  )
}
