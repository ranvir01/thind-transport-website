"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { btnPrimaryCls, btnSecondaryCls, Panel } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"

type Surface = "office" | "driver" | "portal" | "login"

function surfaceFromPath(pathname: string): Surface {
  if (pathname.startsWith("/hub/driver")) return "driver"
  if (pathname.startsWith("/hub/portal")) return "portal"
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
      <div className="flex min-h-screen items-center justify-center bg-navy px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900/80 p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-steel-400">
            {PRODUCT.shortName}
          </p>
          <h1 className="mt-2 font-display text-lg font-bold uppercase tracking-[0.06em] text-white">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-steel-300">{copy}</p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[10px] text-steel-500">Ref: {error.digest}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href={home.href}
              className="inline-flex min-h-[44px] items-center justify-center rounded-control border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5"
            >
              {home.label}
            </Link>
          </div>
        </div>
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
