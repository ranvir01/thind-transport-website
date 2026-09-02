/**
 * Messages-list skeleton: heading bar plus thread rows (icon tile, two lines)
 * at the real row height and card radius — zero layout shift on land.
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
      <div className={`${SK} my-1 h-7 w-32 rounded-control`} />
      <div className={`${SK} mt-2 mb-5 h-3.5 w-3/4 rounded-pill`} />

      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="driver-card flex min-h-[64px] items-center gap-3 p-4">
            <div className={`${SK} h-11 w-11 shrink-0 rounded-control`} />
            <div className="min-w-0 flex-1">
              <div className={`${SK} h-4 w-32 rounded-pill`} />
              <div className={`${SK} mt-1.5 h-3.5 w-48 max-w-full rounded-pill`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
