"use client"

/**
 * Real posted capacity from the operations system (Phase 5 §8.6) — shown on
 * the public /routes page. Renders nothing when no capacity is posted, so
 * the marketing page never shows an empty or fabricated section.
 *
 * D0 token pass: the strip used to be a white-on-white block of green pills
 * that only read because `.brand-page-shell` force-darkened `bg-green-50`
 * underneath it. It now uses the dark card grammar directly — `border-white/10`
 * chips on the navy ground, dates in mono tabular figures. The data fetching is
 * untouched.
 */
import { useEffect, useState } from "react"
import { TruckIcon } from "lucide-react"

interface Posting {
  equipment: string
  available_on: string
  origin_city: string
  origin_state: string
  dest_preference: string | null
}

const EQUIPMENT_LABEL: Record<string, string> = {
  dry_van: "Dry van",
  reefer: "Reefer",
  flatbed: "Flatbed",
}

export function AvailableTrucksStrip() {
  const [postings, setPostings] = useState<Posting[]>([])

  useEffect(() => {
    fetch("/api/hub/public-capacity")
      .then((response) => (response.ok ? response.json() : { postings: [] }))
      .then((data) => setPostings(data.postings ?? []))
      .catch(() => {})
  }, [])

  if (postings.length === 0) return null

  return (
    <section aria-labelledby="available-now-heading" className="bg-navy-950 py-section-tight">
      <div className="container">
        <h2
          id="available-now-heading"
          className="flex items-center gap-2 font-display text-m-h3 font-bold text-white text-balance"
        >
          <TruckIcon className="h-5 w-5 shrink-0 text-orange-300" aria-hidden />
          <span>Trucks available now</span>
        </h2>
        <p className="mt-2 max-w-measure text-m-body text-steel-200">
          Live from our dispatch system — call and it&apos;s yours.
        </p>
        <ul className="mt-4 flex list-none flex-wrap gap-2">
          {postings.map((posting, i) => (
            <li
              key={i}
              className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-m-body text-steel-200"
            >
              <span className="font-semibold text-white">
                {EQUIPMENT_LABEL[posting.equipment] ?? posting.equipment}
              </span>
              <span aria-hidden>·</span>
              <span>{`${posting.origin_city}, ${posting.origin_state}`}</span>
              <span aria-hidden>·</span>
              <span className="font-mono tabular-nums text-white">
                {new Date(posting.available_on).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {posting.dest_preference ? (
                <span>{`→ ${posting.dest_preference}`}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
