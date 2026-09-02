/**
 * Home-page skeleton. Mirrors the real layout block for block (one load card,
 * the two glance cards, the HOS card, the three quick tiles) at the same
 * paddings and radii so the real page lands with zero layout shift.
 *
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
      {/* The work: status banner, three stop rows, one primary action */}
      <section className="driver-card overflow-hidden">
        <div className={`${SK} h-14 rounded-none`} />
        <div className="space-y-3 p-4">
          <div className={`${SK} h-[72px] rounded-control`} />
          <div className={`${SK} h-[72px] rounded-control`} />
          <div className={`${SK} h-[72px] rounded-control`} />
          <div className={`${SK} h-16 rounded-control`} />
        </div>
      </section>

      {/* Quick glances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="driver-card p-4">
          <div className={`${SK} h-3 w-20 rounded-pill`} />
          <div className={`${SK} mt-2 h-8 w-28 rounded-control`} />
          <div className={`${SK} mt-2 h-3 w-24 rounded-pill`} />
        </div>
        <div className="driver-card p-4">
          <div className={`${SK} h-3 w-16 rounded-pill`} />
          <div className="mt-2.5 space-y-1.5">
            <div className={`${SK} h-6 rounded-pill`} />
            <div className={`${SK} h-6 rounded-pill`} />
          </div>
        </div>
      </div>

      {/* Hours of service */}
      <div className="driver-card p-4">
        <div className={`${SK} h-3 w-32 rounded-pill`} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="driver-card driver-card--well h-[68px]" />
          <div className="driver-card driver-card--well h-[68px]" />
          <div className="driver-card driver-card--well h-[68px]" />
          <div className={`${SK} col-span-3 h-3 w-3/4 rounded-pill`} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${SK} min-h-[56px] rounded-control`} />
        <div className={`${SK} min-h-[56px] rounded-control`} />
        <div className={`${SK} min-h-[56px] rounded-control`} />
      </div>
    </div>
  )
}
