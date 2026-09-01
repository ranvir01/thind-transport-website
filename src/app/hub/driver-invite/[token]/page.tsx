import { getDriverInviteState } from "@/lib/hub/driver-invite"
import { PRODUCT } from "@/lib/hub/product"
import { DriverInviteAcceptForm } from "@/components/hub/DriverInviteAcceptForm"

export const dynamic = "force-dynamic"

/**
 * Public driver-app invite accept page (M11): reached from the email a roster
 * import sends. Token-gated — the HMAC token carries carrier, driver, and
 * email; no session and no DB invitation row exist yet.
 */
export default async function DriverInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getDriverInviteState(token).catch(
    () => ({ valid: false, claimed: false }) as const
  )

  return (
    <div className="min-h-screen bg-navy px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-navy-800/80 p-6">
        <span className="brand-wordmark text-xl font-semibold text-white tracking-[0.14em]">{PRODUCT.wordmark}</span>
        {!invite.valid ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invite link isn&apos;t valid or has expired. Ask your carrier to send a fresh one.
          </p>
        ) : invite.claimed ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invite was already used — <a href="/hub/login" className="text-gold underline">sign in here</a>.
          </p>
        ) : (
          <>
            <p className="mt-3 text-body-sm text-steel-200">
              <span className="font-semibold text-white">{invite.carrierName ?? "Your carrier"}</span> set up
              driver app access for <span className="font-semibold text-white">{invite.driverName}</span>:
              your loads, POD uploads from your phone, and your pay — all in one place.
            </p>
            <p className="mt-1 text-body-xs text-steel-400">Account email: {invite.email}</p>
            <div className="mt-4">
              <DriverInviteAcceptForm token={token} email={invite.email!} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
