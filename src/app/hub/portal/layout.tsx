import { headers } from "next/headers"
import { PRODUCT } from "@/lib/hub/product"
import { getFlag } from "@/lib/hub/flags"
import { getHubUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { readSimScenario } from "@/lib/hub/sandbox-shift"
import { SandboxBanner } from "@/components/hub/SandboxBanner"
import { SignOutButton } from "@/components/hub/SignOutButton"
import { PORTAL_ACCENT_DEFAULT, resolvePortalAccent } from "./accent"

/**
 * Portal chrome is intentionally minimal: external users get their freight,
 * their documents, their payment status — and nothing else.
 * NOTE: the accept/[token] page is public and renders inside this layout
 * without a session, so the guard lives in the pages, not here.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await headers() // opt into dynamic rendering for every portal page
  // The portal is the CARRIER's front door, not LoadOff's: signed-in brokers
  // and shippers see the carrier they hired (same as /track). The public
  // accept/[token] page has no session, so it keeps the product wordmark.
  const user = await getHubUser()
  const [carrier, accent] =
    (user?.role === "broker" || user?.role === "shipper") && user.carrierId
      ? await Promise.all([
          getCarrier(user.carrierId).catch(() => null),
          getCarrierSettings(user.carrierId)
            .then((s) => resolvePortalAccent(s.branding.accent))
            .catch(() => PORTAL_ACCENT_DEFAULT),
        ])
      : [null, PORTAL_ACCENT_DEFAULT]
  return (
    // --portal-accent lets page-level headers (text-[color:var(--portal-accent)])
    // follow the carrier's brand without each page re-reading settings.
    <div className="min-h-screen bg-navy" style={{ "--portal-accent": accent.text } as React.CSSProperties}>
      {/* Same geometry as the driver header: 56px plus the notch inset the bar
          pads itself by, so the carrier name never sits under the status bar
          on an installed iPhone. */}
      <header
        className="fixed top-0 inset-x-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between gap-3 border-b bg-driver-surface px-4 pt-[env(safe-area-inset-top,0px)]"
        style={{ borderBottomColor: accent.rule }}
      >
        {carrier?.name ? (
          <span className="min-w-0 truncate text-[15px] font-semibold text-white">
            {carrier.name}
          </span>
        ) : (
          <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
        )}
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--portal-accent)]">
          Customer portal
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl overscroll-y-contain px-4 pb-12 pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
        {user && isSandboxCarrier(user.carrierId) ? (
          <SandboxBanner
            dark
            seat={seatForEmail(user.email)?.key}
            sim={await getFlag("sim.shift_mode", { carrierId: user.carrierId })}
            scenario={await readSimScenario()}
          />
        ) : null}
        {children}
      </main>
      <footer className="pb-8 px-4 mx-auto w-full max-w-3xl">
        <div className="max-w-[200px]">
          <SignOutButton variant="dark" />
        </div>
      </footer>
    </div>
  )
}
