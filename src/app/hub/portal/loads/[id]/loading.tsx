/**
 * Portal load-detail skeleton: back button + reference + status pill, the
 * route summary card, the stops card, the documents list — same paddings and
 * radii as the real page so it lands with zero layout shift. Same forced-dark
 * skeleton treatment as the portal home loading state (see ../../loading.tsx).
 * `.hub-skeleton` paints the office --surface-2 by default; on forced-dark
 * surfaces hub-theme.css swaps in a 6% white wash and a brighter sheen, and a
 * rounded-* utility on the block overrides the inherited radius.
 */
const SK = "hub-skeleton"

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="space-y-4"
    >
      {/* Back + reference + status pill */}
      <div className="flex items-center gap-3">
        <div className={`${SK} h-12 w-12 shrink-0 rounded-control`} />
        <div className={`${SK} h-6 w-32 rounded-pill`} />
        <div className={`${SK} ml-auto h-6 w-20 rounded-pill`} />
      </div>

      {/* Route summary */}
      <section className="driver-card space-y-2 p-4">
        <div className={`${SK} h-4 w-64 rounded-pill`} />
        <div className="flex items-center gap-1.5 py-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`${SK} h-1.5 flex-1 rounded-pill`} />
          ))}
        </div>
        <div className={`${SK} h-3.5 w-48 rounded-pill`} />
        <div className={`${SK} h-3.5 w-52 rounded-pill`} />
      </section>

      {/* Stops */}
      <section className="driver-card p-4">
        <div className={`${SK} mb-3 h-4 w-14 rounded-pill`} />
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <div className={`${SK} h-7 w-7 shrink-0 rounded-full`} />
              <div className="min-w-0 flex-1">
                <div className={`${SK} h-3 w-16 rounded-pill`} />
                <div className={`${SK} mt-1.5 h-4 w-40 rounded-pill`} />
                <div className={`${SK} mt-1.5 h-3 w-56 rounded-pill`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section>
        <div className={`${SK} mb-2 h-4 w-24 rounded-pill`} />
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="driver-card flex min-h-[56px] items-center gap-3 p-3.5">
              <div className={`${SK} h-5 w-5 shrink-0 rounded-control`} />
              <div className="min-w-0 flex-1">
                <div className={`${SK} h-4 w-16 rounded-pill`} />
                <div className={`${SK} mt-1.5 h-3 w-44 rounded-pill`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
