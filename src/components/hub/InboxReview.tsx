"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { rateConToLoadForm } from "@/lib/hub/rate-con-to-form"
import { acceptIntakeDraftAction } from "@/app/hub/_actions/intake"
import { LoadForm, type Option, type PriceBookOption } from "@/components/hub/LoadForm"
import type { ParsedRateCon } from "@/lib/hub/parser"

/**
 * The emailed-rate-con review screen: the SAME LoadForm the paste path uses,
 * prefilled through the SAME mapping (lib/hub/rate-con-to-form). There is no
 * second booking UI to keep in step — the only thing added here is filing the
 * draft after the load is actually created.
 */
export function InboxReview({
  draftId,
  parsed,
  rawText,
  customers,
  drivers,
  trucks,
  trailers,
  priceBook,
}: {
  draftId: string
  parsed: ParsedRateCon
  rawText: string | null
  customers: (Option & { mc?: string | null })[]
  drivers: Option[]
  trucks: Option[]
  trailers: Option[]
  priceBook: PriceBookOption[]
}) {
  const [showText, setShowText] = useState(false)
  const initial = useMemo(() => rateConToLoadForm(parsed, customers), [parsed, customers])

  return (
    <div className="space-y-4">
      {rawText ? (
        <div>
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="text-sm font-semibold text-accent-text hover:underline"
          >
            {showText ? "Hide the original text" : "Show the original text"}
          </button>
          {showText ? (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-card border border-border bg-surface-2 p-3 font-mono text-[12px] text-fg-2">
              {rawText}
            </pre>
          ) : null}
        </div>
      ) : null}

      <LoadForm
        initial={initial}
        customers={customers}
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
        priceBook={priceBook}
        onCreated={async (loadId) => {
          const result = await acceptIntakeDraftAction(draftId, loadId)
          // The load booked either way — this only files the draft. Warn rather
          // than fail, so nobody thinks the freight didn't go in.
          if (!result.ok) toast.warning(result.error ?? "Load booked, but the Inbox draft stayed open")
        }}
      />
    </div>
  )
}
