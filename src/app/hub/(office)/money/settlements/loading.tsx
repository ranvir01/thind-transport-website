/**
 * Mirrors /hub/money/settlements: back link, header with the draft action,
 * then the settlement card list (8 rows) and the escrow balances panel — the
 * same rounded-card rows at the same heights the real page renders.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-5 w-24 rounded-control" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-44 rounded-control" />
          <div className="hub-skeleton mt-2 h-4 w-72 max-w-full rounded-control" />
        </div>
        <div className="hub-skeleton h-11 w-36 rounded-control" />
      </div>

      <div className="mb-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-[76px] rounded-card" />
        ))}
      </div>

      <div className="hub-skeleton mb-3 h-6 w-40 rounded-control" />
      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hub-skeleton h-12 rounded-control" />
          ))}
        </div>
      </div>
    </div>
  )
}
