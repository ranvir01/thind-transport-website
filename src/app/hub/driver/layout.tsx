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
    // --driver-accent is the carrier's resolved accent (≥4.5:1 on the dark card,
    // see portal/accent.ts). The same colour doubles as the primary-button fill
    // with a fixed dark label: anything that passes as text on the card passes
    // with dark text on top of it, so the pair needs no second resolution.
    <div
      className="min-h-screen bg-navy"
      style={
        {
          "--driver-accent": accent.text,
          "--driver-accent-fill": accent.text,
          "--driver-accent-fg": "#121316",
        } as React.CSSProperties
      }
    >
      <DriverNav firstName={user.name.split(" ")[0]} />
      <OfflineSync />
      {/* Clearance mirrors the chrome's own geometry, inset for inset:
          - top: 56px header + the notch inset the header pads itself by, plus
            8px of air (4rem + safe-area-inset-top);
          - bottom: 64px tab rows + the home-indicator inset the bar pads
            itself by (never less than the bar's own 8px floor), plus air. A
            flat pb-24 (96px) was actually short of 64+34=98px on an installed
            iPhone PWA — the one place a driver would lose the bottom of their
            load card;
          - sides: 16px, or the landscape safe-area inset when that is wider. */}
      <main className="mx-auto w-full max-w-lg overscroll-y-contain pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-[calc(6rem+max(env(safe-area-inset-bottom,0px),8px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        {sandbox ? <SandboxBanner dark seat={seatForEmail(user.email)?.key} sim={sim} scenario={scenario} /> : null}
        {children}
      </main>
    </div>
  )
}
