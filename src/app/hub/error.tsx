"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RefreshCw } from "lucide-react"
import {
  btnDriverPrimaryCls,
  btnDriverSecondaryCls,
  btnPrimaryCls,
  btnSecondaryCls,
  Panel,
} from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"

type Surface = "office" | "driver" | "portal" | "login"

function surfaceFromPath(pathname: string): Surface {
  // Boundary matters: /hub/drivers is the OFFICE roster, not the driver app.
  if (/^\/hub\/(driver|driver-invite)(\/|$)/.test(pathname)) return "driver"
  if (/^\/hub\/portal(\/|$)/.test(pathname)) return "portal"
  if (pathname.startsWith("/hub/login")) return "login"
  return "office"
}

const HOME_LINK: Record<Surface, { href: string; label: string }> = {
  office: { href: "/hub", label: "Back to Today" },
  driver: { href: "/hub/driver", label: "Back to Home" },
  portal: { href: "/hub/portal", label: "Back to Portal" },
  login: { href: "/hub/login", label: "Back to Login" },
}

const OFFICE_COPY =
  "This screen hit an error. Try again or return to Today."
const DARK_COPY =
  "This screen hit an error. Try again or head back to a safe page."
const LOGIN_COPY =
  "Sign-in hit an error. Try again or reload the login page."

export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const surface = surfaceFromPath(pathname ?? "/hub")
  const home = HOME_LINK[surface]
  const isDark = surface === "driver" || surface === "portal"
  const copy = surface === "login" ? LOGIN_COPY : isDark ? DARK_COPY : OFFICE_COPY

  useEffect(() => {
    console.error("Hub error boundary:", error)
  }, [error])

  if (isDark) {
    return (
      // This boundary sits ABOVE the driver/portal layouts, so neither has set
      // the carrier's --driver-accent by the time it renders: give the primary
      // button the unbranded app's gold so it is never a transparent fill.
      <div
        className="flex min-h-screen items-center justify-center bg-navy px-4 py-12"
        style={{ "--driver-accent": "#F2A900" } as React.CSSProperties}
      >
        <section className="driver-card w-full max-w-md p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-steel-400">
            {PRODUCT.shortName}
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Something went wrong</h1>
          <p className="mt-3 text-sm text-steel-300">{copy}</p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[12px] tabular-nums text-steel-300">Ref: {error.digest}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => reset()} className={btnDriverPrimaryCls}>
              <RefreshCw className="h-5 w-5" />
              Try again
            </button>
            <Link href={home.href} className={btnDriverSecondaryCls}>
              {home.label}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <Panel className="w-full max-w-md p-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-3">{PRODUCT.shortName}</p>
        <h1 className="mt-2 text-lg font-semibold text-fg">Something went wrong</h1>
        <p className="mt-2 text-sm text-fg-2">{copy}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-fg-3">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => reset()} className={btnPrimaryCls}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link href={home.href} className={btnSecondaryCls}>
            {home.label}
          </Link>
        </div>
      </Panel>
    </div>
  )
}
