import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { pendingIntakeCount } from "@/lib/hub/intake-drafts"
import { HubShell } from "@/components/hub/HubNav"
import { SandboxBanner } from "@/components/hub/SandboxBanner"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const sandbox = isSandboxCarrier(user.carrierId)
  const [carrier, settings, smallCarrier, sim, inboxCount] = await Promise.all([
    getCarrier(user.carrierId),
    getCarrierSettings(user.carrierId),
    // Per-tenant nav mode: the env var is only the default; a carrier/user
    // override row in hub.feature_flags wins (lib/hub/flags.ts).
    getFlag("nav.small_carrier_mode", {
      carrierId: user.carrierId,
      userId: user.id,
      role: user.role,
    }),
    // Shift Mode soft kill — only worth resolving inside the sandbox tenant.
    sandbox ? getFlag("sim.shift_mode", { carrierId: user.carrierId }) : Promise.resolve(false),
    // Nav badge. A COUNT on a carrier-scoped partial index — cheap enough to
    // run on every office page, and the whole point of the queue is that you
    // see it without going looking for it.
    pendingIntakeCount(user.carrierId).catch(() => 0),
  ])

  return (
    <HubShell
      user={{ name: user.name, role: user.role, carrierName: carrier?.name }}
      smallCarrier={smallCarrier}
      accent={settings.branding.accent}
      inboxCount={inboxCount}
    >
      {sandbox ? <SandboxBanner seat={seatForEmail(user.email)?.key} sim={sim} /> : null}
      {children}
    </HubShell>
  )
}
