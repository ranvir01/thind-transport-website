import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { pendingIntakeCount } from "@/lib/hub/intake-drafts"
import { readSimScenario } from "@/lib/hub/sandbox-shift"
import { getUserPrefs, type UserPrefs } from "@/lib/hub/user-prefs"
import { gettingStartedState } from "@/app/hub/_actions/onboarding"
import { HubShell } from "@/components/hub/HubNav"
import { SandboxBanner } from "@/components/hub/SandboxBanner"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const sandbox = isSandboxCarrier(user.carrierId)
  const [carrier, settings, smallCarrier, sim, inboxCount, scenario, prefs, started] = await Promise.all([
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
    // Which world is loaded. Only meaningful — and only read — inside the sandbox.
    sandbox ? readSimScenario() : Promise.resolve("steady" as const),
    // Sidebar width and the like. A read failure is an expanded sidebar, not a 500.
    getUserPrefs(user.carrierId, user.id).catch((): UserPrefs => ({})),
    // The Setup nav group folds once the core checklist is done — the same
    // signal the Today page uses to hide SetupProgressCard.
    gettingStartedState().catch(() => null),
  ])
  const setupComplete = Boolean(started && started.trucks && started.drivers && started.customers && started.loads)

  return (
    <HubShell
      user={{ name: user.name, role: user.role, carrierName: carrier?.name }}
      smallCarrier={smallCarrier}
      accent={settings.branding.accent}
      inboxCount={inboxCount}
      railCollapsed={prefs.sidebarCollapsed === true}
      setupComplete={setupComplete}
    >
      {sandbox ? <SandboxBanner seat={seatForEmail(user.email)?.key} sim={sim} scenario={scenario} /> : null}
      {children}
    </HubShell>
  )
}
