import { headers } from "next/headers"
import { PRODUCT } from "@/lib/hub/product"
import { getHubUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { SignOutButton } from "@/components/hub/SignOutButton"

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
  const carrier =
    (user?.role === "broker" || user?.role === "shipper") && user.carrierId
      ? await getCarrier(user.carrierId).catch(() => null)
      : null
  return (
    <div className="min-h-screen bg-navy">
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-navy-900/95 px-4 backdrop-blur-sm">
        {carrier?.name ? (
          <span className="min-w-0 truncate font-display text-sm font-extrabold uppercase tracking-wider text-white">
            {carrier.name}
          </span>
        ) : (
          <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
        )}
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Customer portal</span>
      </header>
      <main className="pt-20 pb-12 px-4 mx-auto w-full max-w-3xl">{children}</main>
      <footer className="pb-8 px-4 mx-auto w-full max-w-3xl">
        <div className="max-w-[200px]">
          <SignOutButton variant="dark" />
        </div>
      </footer>
    </div>
  )
}
