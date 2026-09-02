/**
 * Time-off skeleton: heading bar, the request form card (two date fields,
 * kind, reason, primary button), the "My requests" heading and two request
 * cards — same paddings/radii as the real page for zero layout shift.
 * `.hub-skeleton` paints the office --surface-2 by default; on forced-dark
 * surfaces hub-theme.css swaps in a 6% white wash and a brighter sheen, and a
 * rounded-* utility on the block overrides the inherited radius.
 */
const SK = "hub-skeleton"

function Field({ wide }: { wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <div className={`${SK} mb-1.5 h-3 w-24 rounded-pill`} />
      <div className={`${SK} h-11 rounded-control`} />
    </div>
  )
}

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
    >
      <div className={`${SK} my-1 h-7 w-28 rounded-control`} />
      <div className={`${SK} mt-2 mb-5 h-3.5 w-11/12 rounded-pill`} />

      <section className="driver-card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field />
          <Field />
        </div>
        <Field wide />
        <Field wide />
        <div className={`${SK} h-14 rounded-control`} />
      </section>

      <div className={`${SK} mt-6 mb-2 h-5 w-28 rounded-pill`} />
      <ul className="space-y-2">
        {[0, 1].map((i) => (
          <li key={i} className="driver-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className={`${SK} h-4 w-40 rounded-pill`} />
              <div className={`${SK} h-5 w-28 shrink-0 rounded-pill`} />
            </div>
            <div className={`${SK} mt-2 h-3.5 w-32 rounded-pill`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
