/**
 * More-page skeleton: heading, the orientation card, four link rows, the call/
 * install/alerts buttons and the account card — same paddings and radii as
 * the real page so it lands with zero layout shift.
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
      <div className={`${SK} my-1 h-7 w-20 rounded-control`} />

      {/* Orientation card */}
      <section className="driver-card p-4">
        <div className={`${SK} h-3 w-32 rounded-pill`} />
        <div className="mt-3 space-y-2">
          <div className={`${SK} h-3.5 w-full rounded-pill`} />
          <div className={`${SK} h-3.5 w-11/12 rounded-pill`} />
          <div className={`${SK} h-3.5 w-4/5 rounded-pill`} />
        </div>
      </section>

      {/* Link rows */}
      <ul className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="driver-card flex min-h-[56px] items-center gap-3 p-4">
            <div className={`${SK} h-11 w-11 shrink-0 rounded-control`} />
            <div className="min-w-0 flex-1">
              <div className={`${SK} h-4 w-40 max-w-full rounded-pill`} />
              <div className={`${SK} mt-1.5 h-3.5 w-32 rounded-pill`} />
            </div>
            <div className={`${SK} h-5 w-5 shrink-0 rounded-pill`} />
          </li>
        ))}
      </ul>

      {/* Call the office · install · alerts */}
      <div className={`${SK} h-14 rounded-control`} />
      <div className={`${SK} h-[52px] rounded-card`} />
      <div className={`${SK} h-12 rounded-control`} />

      {/* Account */}
      <div className="driver-card p-4">
        <div className={`${SK} h-4 w-32 rounded-pill`} />
        <div className={`${SK} mt-1.5 h-3.5 w-52 max-w-full rounded-pill`} />
        <div className={`${SK} mt-3 h-11 rounded-control`} />
      </div>
    </div>
  )
}
