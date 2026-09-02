import Link from "next/link"
import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { OFFICE_ROLES } from "@/lib/hub/types"
import { PRODUCT } from "@/lib/hub/product"
import { Panel } from "@/components/hub/ui"
import { SignOutButton } from "@/components/hub/SignOutButton"
import { LoadOffMark } from "@/components/hub/LoadOffMark"

const ROLE_COPY: Record<string, { title: string; body: string }> = {
  // The portal shipped — the only way to land on this page is requirePortalUser
  // bouncing an account whose customer_id is null. Say that, the way the driver
  // copy below already does, instead of telling people a built feature is coming.
  broker: {
    title: "Almost there",
    body: "Your account isn't linked to a customer record yet — ask the office to connect it and your portal unlocks: live load tracking, PODs, invoices, and payment status.",
  },
  shipper: {
    title: "Almost there",
    body: "Your account isn't linked to a customer record yet — ask the office to connect it and your portal unlocks: shipment tracking, delivery documents, and quotes.",
  },
  driver: {
    title: "Almost there",
    body: "Your account isn't linked to a driver record yet — ask the office to connect it and your driver app unlocks.",
  },
}

export default async function HubWelcomePage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (OFFICE_ROLES.includes(user.role)) redirect("/hub")
  if (user.role === "driver") {
    const { queryOne } = await import("@/lib/hub/db")
    // AND active: without it, a deactivated driver whose driver_id is still
    // linked bounces straight back to /hub/driver, which requireDriverUser's
    // own active check bounces right back here — an infinite redirect loop
    // (confirmed live during a QA drive on 2026-07-20; ERR_TOO_MANY_REDIRECTS).
    const row = await queryOne<{ driver_id: string | null }>(
      `SELECT driver_id FROM hub.users WHERE id = $1 AND carrier_id = $2 AND active`,
      [user.id, user.carrierId]
    )
    if (row?.driver_id) redirect("/hub/driver")
  }

  const carrier = await getCarrier(user.carrierId)
  const copy = ROLE_COPY[user.role] ?? ROLE_COPY.broker
  const phone = carrier?.phone ?? null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8 text-center">
        <LoadOffMark size={52} className="mb-3" />
        <span className="block brand-wordmark text-2xl font-semibold text-fg tracking-[0.14em]">
          {PRODUCT.wordmark}
        </span>
        <span className="block text-[11px] font-bold uppercase tracking-[0.3em] text-accent-text mt-1">
          {carrier?.name ?? PRODUCT.tagline}
        </span>
        <h1 className="mt-6 text-xl font-semibold text-fg">
          {copy.title}
        </h1>
        <p className="mt-2 text-body-sm text-fg-2">
          Hi {user.name.split(" ")[0]} — you&apos;re signed in. {copy.body}
        </p>
        {phone ? (
          <p className="mt-4 text-body-sm text-fg-2">
            Until then, dispatch has you covered:{" "}
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="text-accent-text font-semibold">
              {phone}
            </a>
          </p>
        ) : null}
        <div className="mt-6 space-y-3">
          <SignOutButton />
          <Link href="/" className="block text-body-sm text-fg-3 hover:text-fg">
            Back to the website
          </Link>
        </div>
      </Panel>
    </div>
  )
}
