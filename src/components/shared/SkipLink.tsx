"use client"

import { usePathname } from "next/navigation"

/** Accessibility skip-link past the marketing navbar. Hidden where that navbar
 *  doesn't render (/hub, /track) — there it would be a dead first tab stop in
 *  marketing orange on app chrome. */
export const SkipLink = () => {
  const pathname = usePathname()
  if (pathname.startsWith("/hub") || pathname.startsWith("/track")) return null
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold focus:font-display"
    >
      Skip to main content
    </a>
  )
}
