"use client"

import dynamic from "next/dynamic"
import { LazyMount } from "@/components/util/LazyMount"

/**
 * The heaviest client component on the home page, loaded only when
 * scrolled near. `ssr: false` + visibility-gated mount means its chunk
 * never competes with the hero for bandwidth or main thread — the home page's
 * LCP/TBT budget belongs to the fold. The slot reserves its rendered height
 * so mounting (triggered 800px before entering the viewport) never shifts
 * visible layout.
 */
const ApplicationFormInner = dynamic(
  () => import("@/components/application/ApplicationForm").then((m) => ({ default: m.ApplicationForm })),
  { ssr: false }
)

export function DeferredApplicationForm() {
  return (
    <LazyMount minHeight={760}>
      <ApplicationFormInner />
    </LazyMount>
  )
}
