/**
 * Incident skeleton: heading bar, the report card (location + GPS button,
 * description, load, police report), the three-questions card and the submit
 * button — same paddings/radii as the real form for zero layout shift.
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
      <div className={`${SK} my-1 h-7 w-48 rounded-control`} />
      <div className={`${SK} mt-2 h-3.5 w-full rounded-pill`} />
      <div className={`${SK} mt-1.5 mb-5 h-3.5 w-3/4 rounded-pill`} />

      <div className="space-y-4">
        <section className="driver-card space-y-3 p-4">
          <div>
            <div className={`${SK} mb-1.5 h-3 w-24 rounded-pill`} />
            <div className="flex gap-3">
              <div className={`${SK} h-12 flex-1 rounded-control`} />
              <div className={`${SK} h-12 w-12 shrink-0 rounded-control`} />
            </div>
          </div>
          <div>
            <div className={`${SK} mb-1.5 h-3 w-28 rounded-pill`} />
            <div className={`${SK} h-24 rounded-control`} />
          </div>
          <div>
            <div className={`${SK} mb-1.5 h-3 w-20 rounded-pill`} />
            <div className={`${SK} h-11 rounded-control`} />
          </div>
          <div>
            <div className={`${SK} mb-1.5 h-3 w-48 rounded-pill`} />
            <div className={`${SK} h-11 rounded-control`} />
          </div>
        </section>

        <section className="driver-card space-y-2 p-4">
          <div className={`${SK} h-3 w-56 max-w-full rounded-pill`} />
          <div className={`${SK} h-11 rounded-control`} />
          <div className={`${SK} h-11 rounded-control`} />
          <div className={`${SK} h-11 rounded-control`} />
        </section>

        <div className={`${SK} h-14 rounded-control`} />
      </div>
    </div>
  )
}
