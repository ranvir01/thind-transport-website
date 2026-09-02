/**
 * DVIR skeleton: heading bar, then the inspection card with its title and the
 * eleven checklist rows (label + OK/defect toggle) and the sign-off card, at
 * the real paddings/radii so the form lands with zero layout shift.
 * `.hub-skeleton` paints the office --surface-2 by default; on forced-dark
 * surfaces hub-theme.css swaps in a 6% white wash and a brighter sheen, and a
 * rounded-* utility on the block overrides the inherited radius.
 */
const SK = "hub-skeleton"
const ROWS = Array.from({ length: 11 }, (_, i) => i)

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
    >
      <div className={`${SK} my-1 h-7 w-44 rounded-control`} />
      <div className={`${SK} mt-2 mb-5 h-3.5 w-11/12 rounded-pill`} />

      <div className="space-y-4">
        <section className="driver-card p-4">
          <div className={`${SK} h-5 w-56 max-w-full rounded-pill`} />
          <div className={`${SK} mt-2 mb-3 h-3.5 w-40 rounded-pill`} />
          <ul className="space-y-1.5">
            {ROWS.map((i) => (
              <li key={i} className="flex min-h-[48px] items-center justify-between gap-3">
                <div className={`${SK} h-4 w-32 rounded-pill`} />
                <div className={`${SK} h-11 w-28 shrink-0 rounded-control`} />
              </li>
            ))}
          </ul>
        </section>

        <section className="driver-card p-4">
          <div className={`${SK} h-3 w-24 rounded-pill`} />
          <div className={`${SK} mt-2 h-24 rounded-control`} />
          <div className={`${SK} mt-3 h-14 rounded-control`} />
        </section>
      </div>
    </div>
  )
}
