"use client"

/**
 * Real posted capacity from the operations system (Phase 5 §8.6) — shown on
 * the public /routes page. Renders nothing when no capacity is posted, so
 * the marketing page never shows an empty or fabricated section.
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
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <TruckIcon className="h-5 w-5 text-green-700" /> Trucks available now
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Live from our dispatch system — call and it&apos;s yours.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {postings.map((posting, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-700/20 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-900"
          >
            {EQUIPMENT_LABEL[posting.equipment] ?? posting.equipment} ·{" "}
            {posting.origin_city}, {posting.origin_state} ·{" "}
            {new Date(posting.available_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {posting.dest_preference ? ` → ${posting.dest_preference}` : ""}
          </span>
        ))}
      </div>
    </section>
  )
}
