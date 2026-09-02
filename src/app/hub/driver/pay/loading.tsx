/**
 * Pay-page skeleton: heading bar, the advance button, then settlement cards at
 * the real card padding/radius so the page lands with zero layout shift.
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
    >
      <div className={`${SK} my-1 h-7 w-28 rounded-control`} />
      <div className={`${SK} mt-2 mb-5 h-3.5 w-4/5 rounded-pill`} />

      {/* Ask for an advance */}
      <div className={`${SK} mb-4 h-14 rounded-control`} />

      {/* Settlements */}
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="driver-card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className={`${SK} h-5 w-36 rounded-pill`} />
              <div className={`${SK} mt-1.5 h-3.5 w-28 rounded-pill`} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <div className={`${SK} h-6 w-20 rounded-control`} />
              <div className="h-11 w-11" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
