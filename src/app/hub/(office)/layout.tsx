import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier } from "@/lib/hub/sandbox"
import { HubShell } from "@/components/hub/HubNav"
import { SandboxBanner } from "@/components/hub/SandboxBanner"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const [carrier, settings, smallCarrier] = await Promise.all([
    getCarrier(user.carrierId),
    getCarrierSettings(user.carrierId),
    // Per-tenant nav mode: the env var is only the default; a carrier/user
    // override row in hub.feature_flags wins (lib/hub/flags.ts).
    getFlag("nav.small_carrier_mode", {
      carrierId: user.carrierId,
      userId: user.id,
      role: user.role,
    }),
  ])

  return (
    <HubShell
      user={{ name: user.name, role: user.role, carrierName: carrier?.name }}
      smallCarrier={smallCarrier}
      accent={settings.branding.accent}
    >
      {isSandboxCarrier(user.carrierId) ? <SandboxBanner /> : null}
      {children}
    </HubShell>
  )
}
