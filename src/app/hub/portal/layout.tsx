import { headers } from "next/headers"
import { PRODUCT } from "@/lib/hub/product"
import { getHubUser } from "@/lib/hub/session"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
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
      <header
        className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-navy-900/95 px-4 backdrop-blur-sm"
        style={{ borderBottomColor: accent.rule }}
      >
        {carrier?.name ? (
          <span className="min-w-0 truncate font-display text-sm font-extrabold uppercase tracking-wider text-white">
            {carrier.name}
          </span>
        ) : (
          <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
        )}
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--portal-accent)]">
          Customer portal
        </span>
      </header>
      <main className="pt-20 pb-12 px-4 mx-auto w-full max-w-3xl">
        {user && isSandboxCarrier(user.carrierId) ? (
          <SandboxBanner dark seat={seatForEmail(user.email)?.key} />
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
