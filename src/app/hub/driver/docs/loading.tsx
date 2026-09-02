/**
 * Documents skeleton: heading bar, the CDL/medical expiry card, then file rows
 * (icon, two lines, expiry pill) at the real row height and card radius so
 * the page lands with zero layout shift.
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
      <div className={`${SK} my-1 h-7 w-40 rounded-control`} />
      <div className={`${SK} mt-2 mb-5 h-3.5 w-11/12 rounded-pill`} />

      {/* Expiries */}
      <div className="driver-card mb-4 space-y-2 p-4">
        <div className="flex min-h-[28px] items-center justify-between gap-3">
          <div className={`${SK} h-4 w-10 rounded-pill`} />
          <div className={`${SK} h-5 w-28 rounded-pill`} />
        </div>
        <div className="flex min-h-[28px] items-center justify-between gap-3">
          <div className={`${SK} h-4 w-24 rounded-pill`} />
          <div className={`${SK} h-5 w-28 rounded-pill`} />
        </div>
        <div className={`${SK} h-3.5 w-3/4 rounded-pill`} />
      </div>

      {/* Files */}
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="driver-card flex min-h-[56px] items-center gap-3 p-4">
            <div className={`${SK} h-5 w-5 shrink-0 rounded-pill`} />
            <div className="min-w-0 flex-1">
              <div className={`${SK} h-4 w-32 rounded-pill`} />
              <div className={`${SK} mt-1.5 h-3.5 w-48 max-w-full rounded-pill`} />
            </div>
            <div className={`${SK} h-5 w-24 shrink-0 rounded-pill`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
