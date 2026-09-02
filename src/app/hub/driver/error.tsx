"use client"

/**
 * Error boundary for the driver segment. It renders INSIDE the driver layout,
 * so the header, tab bar and offline strip stay up — a driver who hits a bug
 * on one screen can still tap to Pay or Messages. Same copy and actions as the
 * hub-wide boundary's dark branch (src/app/hub/error.tsx), built on the
 * forced-dark --driver-* ladder rather than the office tokens (AGENTS.md).
 */
import { useEffect } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { btnDriverPrimaryCls, btnDriverSecondaryCls } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"

export default function DriverError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Driver error boundary:", error)
  }, [error])

  return (
    <section className="driver-card p-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">{PRODUCT.shortName}</p>
      <h1 className="mt-2 text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mt-2 text-body-sm text-steel-300">
        This screen hit an error. Try again or head back to a safe page.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[12px] tabular-nums text-steel-300">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={() => reset()} className={btnDriverPrimaryCls}>
          <RefreshCw className="h-5 w-5" />
          Try again
        </button>
        <Link href="/hub/driver" className={btnDriverSecondaryCls}>
          Back to Home
        </Link>
      </div>
    </section>
  )
}
