/**
 * Portal home skeleton. Mirrors the real page block for block — greeting,
 * one moving-load card, the invoice summary + list, the recent-shipments
 * list — at the same paddings and radii so the real page lands with zero
 * layout shift.
 *
 * `.hub-skeleton` paints the office --surface-2 by default; on forced-dark
 * surfaces hub-theme.css swaps in a 6% white wash and a brighter sheen, and a
 * rounded-* utility on the block overrides the inherited radius.
 */
const SK = "hub-skeleton"

function ListRows({ rows }: { rows: number }) {
  return (
    <div className="driver-card divide-y divide-white/5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <div className={`${SK} h-4 w-36 rounded-pill`} />
            <div className={`${SK} mt-2 h-3 w-24 rounded-pill`} />
          </div>
          <div className={`${SK} h-6 w-20 rounded-pill`} />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="space-y-6"
    >
      {/* Greeting + subtitle */}
      <div>
        <div className={`${SK} h-7 w-32 rounded-control`} />
        <div className={`${SK} mt-2 h-4 w-3/4 rounded-pill`} />
      </div>

      {/* Moving now: heading + one load card */}
      <section>
        <div className={`${SK} mb-2 h-4 w-28 rounded-pill`} />
        <div className="driver-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className={`${SK} h-5 w-40 rounded-pill`} />
            <div className={`${SK} h-6 w-20 rounded-pill`} />
          </div>
          <div className={`${SK} mt-2 h-4 w-56 rounded-pill`} />
          <div className="mt-2.5 flex items-center gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`${SK} h-1.5 flex-1 rounded-pill`} />
            ))}
          </div>
        </div>
      </section>

      {/* Invoices: heading + summary + rows */}
      <section>
        <div className={`${SK} mb-2 h-4 w-20 rounded-pill`} />
        <div className="driver-card driver-card--well mb-3 flex items-end justify-between gap-3 px-4 py-3">
          <div>
            <div className={`${SK} h-3 w-24 rounded-pill`} />
            <div className={`${SK} mt-2 h-7 w-28 rounded-control`} />
          </div>
          <div className={`${SK} h-4 w-20 rounded-pill`} />
        </div>
        <ListRows rows={3} />
      </section>

      {/* Recent shipments */}
      <section>
        <div className={`${SK} mb-2 h-4 w-36 rounded-pill`} />
        <ListRows rows={3} />
      </section>
    </div>
  )
}
