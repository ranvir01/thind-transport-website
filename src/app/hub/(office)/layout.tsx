import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { isSimulation } from "@/lib/hub/mode"
import { HubShell } from "@/components/hub/HubNav"
import { SandboxBanner } from "@/components/hub/SandboxBanner"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const sandbox = isSandboxCarrier(user.carrierId)
  const [carrier, settings, smallCarrier, sim, simulation] = await Promise.all([
    getCarrier(user.carrierId),
    getCarrierSettings(user.carrierId),
    getFlag("nav.small_carrier_mode", {
      carrierId: user.carrierId,
      userId: user.id,
      role: user.role,
    }),
    sandbox ? getFlag("sim.shift_mode", { carrierId: user.carrierId }) : Promise.resolve(false),
    isSimulation(),
  ])

  return (
    <HubShell
      user={{ name: user.name, role: user.role, carrierName: carrier?.name }}
      smallCarrier={smallCarrier}
      accent={settings.branding.accent}
      simulation={!sandbox && simulation}
      simView={user.simView}
    >
      {sandbox ? <SandboxBanner seat={seatForEmail(user.email)?.key} sim={sim} /> : null}
      {children}
    </HubShell>
  )
}
