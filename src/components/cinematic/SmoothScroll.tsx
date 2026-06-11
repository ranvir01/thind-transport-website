"use client"

import { ReactLenis } from "lenis/react"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // The Hub is an app, not a marketing page — native scrolling only.
  if ((pathname.startsWith("/hub") || pathname.startsWith("/track"))) {
    return <>{children}</>
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}

