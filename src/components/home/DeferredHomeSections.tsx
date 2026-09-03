"use client"

import dynamic from "next/dynamic"
import { LazyMount } from "@/components/util/LazyMount"

/**
 * The two heaviest client components on the home page, loaded only when
 * scrolled near. `ssr: false` + visibility-gated mount means their chunks
 * never compete with the hero for bandwidth or main thread — the home page's
 * LCP/TBT budget belongs to the fold. Each slot reserves its rendered height
 * so mounting (triggered 800px before entering the viewport) never shifts
 * visible layout.
 */
const ProfitCalculatorInner = dynamic(
  () => import("@/components/features/ProfitCalculator").then((m) => ({ default: m.ProfitCalculator })),
  { ssr: false }
)
const ApplicationFormInner = dynamic(
  () => import("@/components/application/ApplicationForm").then((m) => ({ default: m.ApplicationForm })),
  { ssr: false }
)

export function DeferredProfitCalculator() {
  // 1336px is the calculator's rendered height at 390px after the instrument
  // re-skin (it was 2,663px): py-section 128 + the two .brand-section-panel
  // hairlines 2 + heading block 128 + mt-8 32 + inputs 429 + statement 583 +
  // the frame's own two hairlines 2 — which came to 1,280 while inputs and
  // statement shared one bordered frame. Splitting them into two panels adds
  // +17 (two more hairlines and the 16px gap that replaced the shared rule),
  // the statement's paper-island padding adds +16 (p-4 → p-6), and the hedged
  // methodology sentence wraps to one more 12.8px line, +20.
  return (
    <LazyMount minHeight={1336} id="calculator" className="scroll-mt-20">
      <ProfitCalculatorInner />
    </LazyMount>
  )
}

export function DeferredApplicationForm() {
  return (
    <LazyMount minHeight={760}>
      <ApplicationFormInner />
    </LazyMount>
  )
}
