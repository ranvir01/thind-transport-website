import { headers } from "next/headers"
import { PRODUCT } from "@/lib/hub/product"
import { SignOutButton } from "@/components/hub/SignOutButton"

/**
 * Portal chrome is intentionally minimal: external users get their freight,
 * their documents, their payment status — and nothing else.
 * NOTE: the accept/[token] page is public and renders inside this layout
 * without a session, so the guard lives in the pages, not here.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await headers() // opt into dynamic rendering for every portal page
  return (
    <div className="min-h-screen bg-navy">
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-navy-900/95 px-4 backdrop-blur-sm">
        <span className="brand-wordmark text-base font-semibold text-fg tracking-[0.14em]">
          {PRODUCT.wordmark}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Customer portal</span>
      </header>
      <main className="pt-20 pb-12 px-4 mx-auto w-full max-w-3xl">{children}</main>
      <footer className="pb-8 px-4 mx-auto w-full max-w-3xl">
        <div className="max-w-[200px]">
          <SignOutButton />
        </div>
      </footer>
    </div>
  )
}
