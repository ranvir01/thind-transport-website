/**
 * Mirrors /hub/money/invoices: back link, header, the 7 status filter chips,
 * then the desktop table silhouette (8 rows at the real 48px row height) with
 * the mobile card list under md. Same paddings and Panel chrome as the page,
 * so the swap to real content shifts nothing.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-5 w-24 rounded-control" />
      <div className="mb-6">
        <div className="hub-skeleton h-7 w-40 rounded-control" />
        <div className="hub-skeleton mt-2 h-4 w-80 max-w-full rounded-control" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-8 w-20 rounded-pill" />
        ))}
      </div>

      <div className="hidden rounded-card border border-border bg-surface p-4 shadow-card md:block">
        <div className="hub-skeleton mb-3 h-8 rounded-control" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="hub-skeleton h-12 rounded-control" />
          ))}
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-[92px] rounded-card" />
        ))}
      </div>
    </div>
  )
}
