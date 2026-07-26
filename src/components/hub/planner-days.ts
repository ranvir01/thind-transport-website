/**
 * Day-column math for the week-grid planner, split out of PlannerGrid.tsx so it
 * can be unit-tested (the component imports a "use server" action and can't be).
 *
 * dayIndex maps a timestamp to its column offset from days[0] by LOCAL calendar
 * date, not by elapsed milliseconds. Dividing (date − weekStart) by 86400000
 * breaks on the two DST weeks: the 23-hour spring-forward day pulled
 * early-morning loads one column left, and the 25-hour fall-back day pushed
 * late-evening loads one column right. Mapping both instants to their local
 * calendar dates first, then differencing in UTC space (where every day is
 * exactly 24h), is immune to either transition.
 *
 * days[0] is a plain YYYY-MM-DD; timestamps before it yield negative indexes
 * and past-the-week ones exceed 6 — callers clamp with Math.max/Math.min.
 */
export function dayIndex(days: string[], iso: string): number {
  const date = new Date(iso)
  const [y, m, d] = days[0].split("-").map(Number)
  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(y, m - 1, d)) / 86400000
  )
}
