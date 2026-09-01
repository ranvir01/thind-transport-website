import { requireDriverUser } from "@/lib/hub/session"
import { getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { readSimScenario } from "@/lib/hub/sandbox-shift"
import { SandboxBanner } from "@/components/hub/SandboxBanner"
import { DriverNav } from "@/components/hub/driver/DriverNav"
import { OfflineSync } from "@/components/hub/driver/OfflineSync"
import { PORTAL_ACCENT_DEFAULT, resolvePortalAccent } from "@/app/hub/portal/accent"

export default async function DriverAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDriverUser()
  const sandbox = isSandboxCarrier(user.carrierId)
  // Driver app is a navy-backdrop surface same as the portal, so the same
  // WCAG-contrast resolution applies: reuse resolvePortalAccent rather than
  // re-deriving it.
  const [accent, sim, scenario] = await Promise.all([
    getCarrierSettings(user.carrierId)
      .then((s) => resolvePortalAccent(s.branding.accent))
      .catch(() => PORTAL_ACCENT_DEFAULT),
    sandbox ? getFlag("sim.shift_mode", { carrierId: user.carrierId }) : Promise.resolve(false),
    sandbox ? readSimScenario() : Promise.resolve("steady" as const),
  ])

  return (
    <div className="min-h-screen bg-navy" style={{ "--driver-accent": accent.text } as React.CSSProperties}>
      <DriverNav firstName={user.name.split(" ")[0]} />
      <OfflineSync />
      {/* Top bar 56px; bottom tabs ~64px PLUS the home-indicator inset the
          bar pads itself by. A flat pb-24 (96px) was actually short of
          64+34=98px on an installed iPhone PWA — the one place a driver
          would lose the bottom of their load card. */}
      <main className="pt-16 pb-[calc(6rem+env(safe-area-inset-bottom))] px-4 mx-auto w-full max-w-lg">
        {sandbox ? <SandboxBanner dark seat={seatForEmail(user.email)?.key} sim={sim} scenario={scenario} /> : null}
        {children}
      </main>
    </div>
  )
}
