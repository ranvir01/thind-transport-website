"use client"

import dynamic from "next/dynamic"
import { LazyMount } from "@/components/util/LazyMount"

/**
 * The three heaviest client components on the home page, loaded only when
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
const QuickQualifyInner = dynamic(
  () => import("@/components/features/QuickQualify").then((m) => ({ default: m.QuickQualify })),
  { ssr: false }
)
const ApplicationFormInner = dynamic(
  () => import("@/components/application/ApplicationForm").then((m) => ({ default: m.ApplicationForm })),
  { ssr: false }
)

export function DeferredProfitCalculator() {
  return (
    <LazyMount minHeight={900}>
      <ProfitCalculatorInner />
    </LazyMount>
  )
}

export function DeferredQuickQualify() {
  return (
    <LazyMount minHeight={620}>
      <QuickQualifyInner />
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
