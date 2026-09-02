import Link from "next/link"
import { btnPrimaryCls, Panel } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"

/**
 * 404 for everything under /hub. Without this file a bad hub URL (or a
 * `notFound()` from a scoped fetch like the portal's load page) fell through
 * to the ROOT not-found — the marketing site's truck-and-red-404 page — inside
 * the software. Office tokens on purpose: this renders in the hub layout,
 * where the stored mode governs, so bg-surface/text-fg are the right ones.
 */
export default function HubNotFound() {
  return (
    <div className="hauldesk-auth flex min-h-screen items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 text-center md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-3">{PRODUCT.shortName}</p>
        <h1 className="mt-2 text-xl font-semibold text-fg">Page not found</h1>
        <p className="mt-2 text-sm text-fg-2">That page doesn&apos;t exist here, or it moved.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/hub" className={btnPrimaryCls}>
            Back to Today
          </Link>
        </div>
      </Panel>
    </div>
  )
}
