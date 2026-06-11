import { getInvitation } from "@/lib/hub/portal"
import { getCarrier } from "@/lib/hub/settings"
import { PRODUCT } from "@/lib/hub/product"
import { AcceptInvitationForm } from "@/components/hub/AcceptInvitationForm"

export const dynamic = "force-dynamic"

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await getInvitation(token)
  const carrier = invitation ? await getCarrier(invitation.carrier_id) : null
  const expired = invitation ? new Date(invitation.expires_at) < new Date() : false
  const used = Boolean(invitation?.accepted_user_id)

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-6">
        <span className="brand-wordmark text-xl font-semibold text-white tracking-[0.14em]">{PRODUCT.wordmark}</span>
        {!invitation ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invitation link isn&apos;t valid. Ask {carrier?.name ?? "the carrier"} to send a fresh one.
          </p>
        ) : used ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invitation was already used — <a href="/hub/login" className="text-gold underline">sign in here</a>.
          </p>
        ) : expired ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invitation expired. Ask {carrier?.name ?? "the carrier"} to send a fresh one.
          </p>
        ) : (
          <>
            <p className="mt-3 text-body-sm text-steel-200">
              <span className="font-semibold text-white">{carrier?.name}</span> set up portal access for{" "}
              <span className="font-semibold text-white">{invitation.customer_name}</span>: live tracking,
              PODs, invoices, payment status — no more checking calls.
            </p>
            <p className="mt-1 text-body-xs text-steel-400">Account email: {invitation.email}</p>
            <div className="mt-4">
              <AcceptInvitationForm token={token} email={invitation.email} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
