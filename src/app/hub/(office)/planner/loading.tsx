/**
 * Mirrors PlannerPage: the header with its week switcher, then the 980px-wide
 * truck grid (200px label column + seven day columns) in the same overflow
 * wrapper — the real grid lands on top of it without a shift.
 */
export default function Loading() {
  const days = [0, 1, 2, 3, 4, 5, 6]
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-32 rounded-control" />
          <div className="hub-skeleton mt-1 h-5 w-80 max-w-full rounded-control" />
        </div>
        <div className="flex items-center gap-1">
          <div className="hub-skeleton h-11 w-11 rounded-control" />
          <div className="hub-skeleton h-11 w-40 rounded-control" />
          <div className="hub-skeleton h-11 w-11 rounded-control" />
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[980px]">
          <div className="grid" style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}>
            <div />
            {days.map((day) => (
              <div key={day} className="px-2 py-2">
                <div className="hub-skeleton mx-auto h-4 w-14 rounded-control" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="grid items-stretch rounded-card border border-border bg-surface"
                style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
              >
                <div className="border-r border-border px-3 py-2">
                  <div className="hub-skeleton h-5 w-16 rounded-control" />
                  <div className="hub-skeleton mt-1 h-4 w-28 rounded-control" />
                </div>
                {days.map((day) => (
                  <div key={day} className="min-h-[54px] border-r border-border last:border-r-0" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hub-skeleton mt-3 h-[18px] w-3/4 rounded-control" />
    </div>
  )
}
