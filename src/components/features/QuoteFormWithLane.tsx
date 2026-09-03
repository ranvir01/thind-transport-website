"use client"

/**
 * The quote form, plus the lane the visitor just priced in the estimator.
 *
 * Reading `?lane=` on the client rather than from the page's `searchParams` is
 * deliberate: touching searchParams in the server component turns /quote into a
 * dynamically-rendered route, and /quote is an ad landing page that wants to be
 * a static CDN hit. The lane is a nicety, so it fills in after hydration and
 * the page keeps its prerender.
 *
 * The "lane carried over" notice now renders inside ShipperQuoteForm: the form
 * is its own paper island, and a note sitting above it would be ink type on
 * the dark page ground.
 */

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ShipperQuoteForm } from "@/components/features/ShipperQuoteForm"

function LaneAwareForm() {
  const lane = useSearchParams().get("lane")?.slice(0, 160) || undefined
  return <ShipperQuoteForm defaultLane={lane} />
}

export function QuoteFormWithLane() {
  // Fallback is the same form without the prefill — never a spinner in the
  // place of a form someone is trying to fill in.
  return (
    <Suspense fallback={<ShipperQuoteForm />}>
      <LaneAwareForm />
    </Suspense>
  )
}
