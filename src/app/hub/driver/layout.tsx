import { requireDriverUser } from "@/lib/hub/session"
import { getCarrierSettings } from "@/lib/hub/settings"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
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
  const [accent, sim] = await Promise.all([
    getCarrierSettings(user.carrierId)
      .then((s) => resolvePortalAccent(s.branding.accent))
      .catch(() => PORTAL_ACCENT_DEFAULT),
    sandbox ? getFlag("sim.shift_mode", { carrierId: user.carrierId }) : Promise.resolve(false),
  ])

  return (
    <div className="min-h-screen bg-navy" style={{ "--driver-accent": accent.text } as React.CSSProperties}>
      <DriverNav firstName={user.name.split(" ")[0]} />
      <OfflineSync />
      {/* Top bar 56px, bottom tabs 64px + safe area */}
      <main className="pt-16 pb-24 px-4 mx-auto w-full max-w-lg">
        {sandbox ? <SandboxBanner dark seat={seatForEmail(user.email)?.key} sim={sim} /> : null}
        {children}
      </main>
    </div>
  )
}
