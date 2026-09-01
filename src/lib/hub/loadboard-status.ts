/**
 * Status policy for the load board's inline status cell — the synchronous
 * half of the load-page rules (billing lock, cancel lock), shared by the
 * server gate in loadboard.ts and the grid's dropdown. Dispatch legality and
 * the POD gate need per-load data, so those stay server-side in
 * patchLoadBoardField. Kept free of server imports so the client grid can
 * use it.
 */
import { canCancelLoad, LOAD_STATUSES, STATUS_LABELS, type LoadStatus } from "./types"

/** Set only by the invoice/settlement flow, never by hand (see setLoadStatusAction). */
export const BILLING_STATUSES: readonly LoadStatus[] = ["invoiced", "paid", "settled"]

/** Statuses the board may offer for a load currently in `from`. */
export function loadBoardStatusChoices(from: LoadStatus): LoadStatus[] {
  if (BILLING_STATUSES.includes(from)) return [from]
  return LOAD_STATUSES.filter(
    (to) =>
      to === from ||
      (!BILLING_STATUSES.includes(to) && (to !== "cancelled" || canCancelLoad(from)))
  )
}

/** Why a `from` → `to` board edit is refused, or null when allowed. */
export function loadBoardStatusRefusal(from: LoadStatus, to: LoadStatus): string | null {
  if (BILLING_STATUSES.includes(to)) {
    return `${STATUS_LABELS[to]} is set by the invoice and settlement flow — bill it from the load page`
  }
  if (BILLING_STATUSES.includes(from)) {
    return `Load is ${STATUS_LABELS[from].toLowerCase()} — billing statuses only change through the invoice and settlement flow`
  }
  if (to === "cancelled" && !canCancelLoad(from)) {
    return `Cannot cancel a load that is ${STATUS_LABELS[from].toLowerCase()}`
  }
  return null
}
