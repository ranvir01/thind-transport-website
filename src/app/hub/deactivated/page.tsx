import { redirect } from "next/navigation"
import { getHubUser } from "@/lib/hub/session"
import { PRODUCT } from "@/lib/hub/product"
import { Panel } from "@/components/hub/ui"
import { SignOutButton } from "@/components/hub/SignOutButton"

/**
 * Dead end for a session whose account was deactivated mid-JWT. Deliberately
 * not /hub/login: the proxy still sees a valid token there and bounces the
 * user straight back into the app, which re-hits the same active check —
 * an infinite redirect loop (the token itself is only cleared client-side,
 * by the sign-out button below).
 */
export default async function HubDeactivatedPage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8 text-center">
        <span className="brand-wordmark text-2xl font-semibold text-fg tracking-[0.14em]">{PRODUCT.wordmark}</span>
        <h1 className="mt-6 font-display text-xl font-extrabold uppercase tracking-wide text-fg">
          Account deactivated
        </h1>
        <p className="mt-2 text-body-sm text-fg-2">
          Hi {user.name.split(" ")[0]} — your account has been deactivated. Contact your carrier&apos;s owner to
          restore access.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </Panel>
    </div>
  )
}
