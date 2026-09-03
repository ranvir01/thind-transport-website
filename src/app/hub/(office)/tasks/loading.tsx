/**
 * Mirrors TasksPage: the 3xl column, the quick-add well (one 48px input row),
 * then bucket sections of task cards — same wrappers and paddings, so the real
 * list lands on top of it without a shift.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-24 rounded-control" />
          <div className="hub-skeleton mt-1 h-5 w-96 max-w-full rounded-control" />
        </div>
      </div>

      <div className="mb-4 rounded-card border border-border bg-surface-2 p-3">
        <div className="flex gap-2">
          <div className="hub-skeleton h-12 flex-1 rounded-control" />
          <div className="hub-skeleton h-12 w-12 shrink-0 rounded-control" />
          <div className="hub-skeleton h-12 w-12 shrink-0 rounded-control" />
        </div>
      </div>

      <div className="space-y-5">
        {[0, 1].map((section) => (
          <section key={section}>
            <div className="hub-skeleton mb-2 h-5 w-28 rounded-control" />
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className="rounded-card border border-border bg-surface-2 p-3">
                  <div className="flex items-start gap-3">
                    <div className="hub-skeleton mt-0.5 h-7 w-7 shrink-0 rounded-control" />
                    <div className="min-w-0 flex-1">
                      <div className="hub-skeleton h-5 w-2/3 rounded-control" />
                      <div className="hub-skeleton mt-1 h-4 w-40 rounded-control" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
