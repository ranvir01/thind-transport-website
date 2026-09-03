/**
 * Mirrors /hub/reports: header + range form, the 5-up KPI row, the 6-up totals
 * row, the "Deadhead — typed vs measured" heading and its 4-up KPI grid, then
 * the per-truck P&L table silhouette (8 rows at the real 41px row height).
 * Same grids, gaps and paddings as the page so nothing shifts on hydration.
 *
 * The per-truck deadhead table between the 4-up and the P&L table is
 * conditional on there being fuel rows in range (page.tsx renders it only when
 * deadhead.trucks.length > 0), so reserving space for it would over-shoot on
 * every carrier without fuel data — it is deliberately not in the silhouette.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-36 rounded-control" />
          <div className="hub-skeleton mt-2 h-4 w-[28rem] max-w-full rounded-control" />
        </div>
        <div className="flex gap-2">
          <div className="hub-skeleton h-11 w-40 rounded-control" />
          <div className="hub-skeleton h-11 w-28 rounded-control" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="hub-skeleton h-11 w-40 rounded-control" />
        <div className="hub-skeleton h-11 w-40 rounded-control" />
        <div className="hub-skeleton h-11 w-24 rounded-control" />
        <div className="flex min-h-[44px] flex-wrap items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hub-skeleton h-8 w-24 rounded-pill" />
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-[104px] rounded-card" />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-[84px] rounded-card" />
        ))}
      </div>

      <div className="mb-2 mt-6 flex items-center gap-2">
        <div className="hub-skeleton h-6 w-64 max-w-full rounded-control" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="hub-skeleton h-[104px] rounded-card" />
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <div className="border-b border-border px-4 py-3">
          <div className="hub-skeleton h-4 rounded-control" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
            <div className="hub-skeleton h-5 rounded-control" />
          </div>
        ))}
      </div>
    </div>
  )
}
