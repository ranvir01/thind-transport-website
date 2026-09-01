import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { PRODUCT } from "@/lib/hub/product"
import { Panel } from "@/components/hub/ui"
import { SignOutButton } from "@/components/hub/SignOutButton"

/**
 * Dead end for a session whose carrier was suspended by platform admin
 * mid-JWT (same /hub/deactivated pattern: not /hub/login, since the proxy
 * still sees a valid token there and bounces straight back into the app,
 * re-hitting the same isActiveCarrier check — an infinite redirect loop).
 */
export default async function HubSuspendedPage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8 text-center">
        <span className="brand-wordmark text-2xl font-semibold text-fg tracking-[0.14em]">{PRODUCT.wordmark}</span>
        <h1 className="mt-6 font-display text-xl font-extrabold uppercase tracking-wide text-fg">
          Workspace suspended
        </h1>
        <p className="mt-2 text-body-sm text-fg-2">
          Hi {user.name.split(" ")[0]} — this workspace has been suspended. Contact your account
          manager to restore access.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </Panel>
    </div>
  )
}
