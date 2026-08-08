import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { HubShell } from "@/components/hub/HubNav"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const carrier = await getCarrier(user.carrierId)
  // Per-tenant nav mode: the env var is only the default; a carrier/user
  // override row in hub.feature_flags wins (lib/hub/flags.ts).
  const smallCarrier = await getFlag("nav.small_carrier_mode", {
    carrierId: user.carrierId,
    userId: user.id,
    role: user.role,
  })

  return (
    <HubShell
      user={{ name: user.name, role: user.role, carrierName: carrier?.name }}
      smallCarrier={smallCarrier}
    >
      {children}
    </HubShell>
  )
}
