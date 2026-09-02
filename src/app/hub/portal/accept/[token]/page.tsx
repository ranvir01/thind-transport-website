import { getInvitation } from "@/lib/hub/portal"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { PRODUCT } from "@/lib/hub/product"
import { AcceptInvitationForm } from "@/components/hub/AcceptInvitationForm"
import { PORTAL_ACCENT_DEFAULT, resolvePortalAccent } from "@/app/hub/portal/accent"
import { resolveInvitationState } from "./invitationState"

export const dynamic = "force-dynamic"

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await getInvitation(token)
  const [carrier, accent] = invitation
    ? await Promise.all([
        getCarrier(invitation.carrier_id).catch(() => null),
        getCarrierSettings(invitation.carrier_id)
          .then((s) => resolvePortalAccent(s.branding.accent))
          .catch(() => PORTAL_ACCENT_DEFAULT),
      ])
    : [null, PORTAL_ACCENT_DEFAULT]
  const state = resolveInvitationState(invitation)

  return (
    <div className="mx-auto max-w-md">
      <div
        className="driver-card p-6"
        style={{ "--portal-accent": accent.text } as React.CSSProperties}
      >
        <span className="brand-wordmark text-xl font-semibold text-white tracking-[0.14em]">{PRODUCT.wordmark}</span>
        {/* Always-on card kicker — unique vs layout chrome; do not move into a state branch. */}
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel-300">
          Portal invitation
        </p>
        {!invitation ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invitation link isn&apos;t valid. Ask {carrier?.name ?? "the carrier"} to send a fresh one.
          </p>
        ) : state === "used" ? (
          <p className="mt-4 text-body-sm text-steel-200">
            This invitation was already used —{" "}
            <a href="/hub/login" className="text-[color:var(--portal-accent)] underline">sign in here</a>.
          </p>
        ) : state === "expired" ? (
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
            <p className="mt-1 text-[13px] text-steel-300">Account email: {invitation.email}</p>
            <div className="mt-4">
              <AcceptInvitationForm token={token} email={invitation.email} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
