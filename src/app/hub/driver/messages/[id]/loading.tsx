/**
 * Thread skeleton: the back button + title row, then the chat column at the
 * same viewport-relative height ChatThread uses, a few bubbles, and the
 * composer row — so the real thread lands with zero layout shift.
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
      <div className="mb-3 flex items-center gap-3">
        <div className={`${SK} h-12 w-12 shrink-0 rounded-control`} />
        <div className={`${SK} h-7 w-44 rounded-control`} />
      </div>

      <div className="flex h-[calc(100dvh-220px)] min-h-[320px] flex-col">
        <div className="flex-1 space-y-2 overflow-hidden pr-1">
          <div className={`${SK} h-12 w-2/3 rounded-card`} />
          <div className={`${SK} ml-auto h-12 w-3/5 rounded-card`} />
          <div className={`${SK} h-16 w-3/4 rounded-card`} />
        </div>
        <div className="flex items-end gap-2 border-t border-white/10 pt-2">
          <div className={`${SK} h-12 w-12 shrink-0 rounded-control`} />
          <div className={`${SK} h-12 flex-1 rounded-control`} />
          <div className={`${SK} h-12 w-12 shrink-0 rounded-control`} />
        </div>
      </div>
    </div>
  )
}
