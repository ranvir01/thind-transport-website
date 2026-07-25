// Day-column math for the week-grid planner. Lives outside PlannerGrid.tsx
// (which pulls in "use server" actions and can't be imported by a unit test)
// so the date math is testable in isolation — same reasoning as planner-lanes.ts.

/**
 * 0-based day column of `iso` within the planner week, where `days` holds the
 * week's seven YYYY-MM-DD strings and column 0 is `days[0]` in the viewer's
 * timezone. Counts local calendar days, not elapsed 24h buckets: across a DST
 * fall-back the last local day of the week is 25h long, so elapsed-time math
 * put its final hour in column 7 (off the grid). Both operands are local
 * midnights, so their difference is n×24h ± the DST shift and rounding
 * recovers n exactly.
 *
 * Out-of-week timestamps return indices outside 0–6 (negative before the
 * week, ≥7 after); callers clamp to taste.
 */
export function dayIndex(days: string[], iso: string): number {
  const date = new Date(iso)
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekStart = new Date(`${days[0]}T00:00:00`)
  return Math.round((localMidnight.getTime() - weekStart.getTime()) / 86400000)
}
