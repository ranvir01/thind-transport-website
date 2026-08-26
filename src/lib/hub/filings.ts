/**
 * Federal registration filings derived from the carrier row alone.
 *
 * MCS-150 (49 CFR 390.19a): every carrier must refresh its Motor Carrier
 * Identification Report at least biennially, on a schedule encoded in the
 * USDOT number itself — the last digit picks the filing month (1–9 =
 * Jan–Sep, 0 = October; November and December are never assigned), the
 * next-to-last digit picks the year parity (even digit = even years, odd =
 * odd years; a single-digit number counts as even), and the update is due
 * by the end of that month. Nobody enters any of this anywhere, and FMCSA's
 * penalty for missing it is deactivating the USDOT number — the company
 * simply stops being allowed to operate. So, like Form 2290, it is derived.
 *
 * UCR (49 U.S.C. 14504a): annual and calendar-driven — registration for the
 * next year opens October 1 and must be complete before January 1.
 *
 * Both use the 2290 "verify" pattern: LoadOff cannot know a filing happened
 * unless the office records it, so an untracked obligation whose date has
 * passed shows red as "verify filed" until a company compliance item
 * mentioning it exists (any status — an open item renders on its own, and
 * done/waived means handled). Pure and I/O-free; filings-compliance.ts is
 * the half that talks to the database.
 */
import type { ComplianceEntry } from "./compliance"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Filing month 1–12 from the USDOT number's last digit, or null if unusable. */
export function mcs150Month(usdot: string): number | null {
  const digits = usdot.replace(/\D/g, "")
  if (!digits) return null
  const last = Number(digits[digits.length - 1])
  return last === 0 ? 10 : last
}

/** Filing-year parity (0 = even years, 1 = odd) from the next-to-last digit. */
export function mcs150YearParity(usdot: string): 0 | 1 | null {
  const digits = usdot.replace(/\D/g, "")
  if (!digits) return null
  const nextToLast = digits.length >= 2 ? Number(digits[digits.length - 2]) : 0
  return (nextToLast % 2) as 0 | 1
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** Last day of the month as YYYY-MM-DD (UTC); month is 1-indexed. */
function endOfMonthISO(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

/**
 * The most recent MCS-150 due date on or before `now`, and the one after it.
 * ISO date strings compare lexicographically, so plain < / >= is safe here.
 */
export function mcs150Cycle(
  usdot: string,
  now: Date
): { lastDue: string; nextDue: string; month: number } | null {
  const month = mcs150Month(usdot)
  const parity = mcs150YearParity(usdot)
  if (month === null || parity === null) return null
  let year = now.getUTCFullYear() + 1
  while (year % 2 !== parity || endOfMonthISO(year, month) > isoDate(now)) year--
  return { lastDue: endOfMonthISO(year, month), nextDue: endOfMonthISO(year + 2, month), month }
}

/**
 * MCS-150 wall entries. `itemDueOns` are the due dates of the carrier's
 * company compliance items that mention the filing (null due date = counts
 * for the current cycle, same as 2290's step-aside).
 */
export function mcs150WallEntries(
  usdot: string | null,
  itemDueOns: (string | null)[],
  now: Date
): ComplianceEntry[] {
  if (!usdot) return []
  const cycle = mcs150Cycle(usdot, now)
  if (!cycle) return []

  const monthName = MONTHS[cycle.month - 1]
  const currentFloor = `${cycle.lastDue.slice(0, 4)}-01-01`
  const currentTracked = itemDueOns.some((d) => d === null || d >= currentFloor)

  if (!currentTracked) {
    return [
      {
        entity: "company", entityId: null, name: "Company",
        kind:
          `MCS-150 biennial update — verify filed for the ${monthName} ` +
          `${cycle.lastDue.slice(0, 4)} cycle (49 CFR 390.19; missing it deactivates the USDOT)`,
        due: cycle.lastDue, color: "red", href: "/hub/compliance",
      },
    ]
  }

  // Current cycle is recorded — give the next one a 90-day runway. A biennial
  // date that first appears 30 days out (the wall's usual amber window) is
  // exactly the kind that gets missed.
  const daysToNext = (Date.parse(`${cycle.nextDue}T00:00:00Z`) - now.getTime()) / 86_400_000
  const nextFloor = `${cycle.nextDue.slice(0, 4)}-01-01`
  const nextTracked = itemDueOns.some((d) => d !== null && d >= nextFloor)
  if (daysToNext <= 90 && !nextTracked) {
    return [
      {
        entity: "company", entityId: null, name: "Company",
        kind: `MCS-150 biennial update — due by end of ${monthName} ${cycle.nextDue.slice(0, 4)} (49 CFR 390.19)`,
        due: cycle.nextDue, color: "amber", href: "/hub/compliance",
      },
    ]
  }
  return []
}

/**
 * UCR wall entries. The registration in force for calendar year Y was due
 * Dec 31 of Y-1; the window for Y+1 opens Oct 1. Same verify semantics.
 */
export function ucrWallEntries(itemDueOns: (string | null)[], now: Date): ComplianceEntry[] {
  const entries: ComplianceEntry[] = []
  const y = now.getUTCFullYear()
  const today = isoDate(now)

  const verifyDue = `${y - 1}-12-31`
  const verifyFloor = `${y - 1}-10-01`
  const verifyTracked = itemDueOns.some((d) => d === null || d >= verifyFloor)
  if (!verifyTracked) {
    entries.push({
      entity: "company", entityId: null, name: "Company",
      kind: `UCR registration — verify ${y} filed at plan.ucr.gov (49 U.S.C. 14504a)`,
      due: verifyDue, color: "red", href: "/hub/compliance",
    })
  }

  if (today >= `${y}-10-01`) {
    const upcomingDue = `${y}-12-31`
    const upcomingTracked = itemDueOns.some((d) => d !== null && d >= `${y}-10-01`)
    if (!upcomingTracked) {
      const daysOut = (Date.parse(`${upcomingDue}T00:00:00Z`) - now.getTime()) / 86_400_000
      entries.push({
        entity: "company", entityId: null, name: "Company",
        kind: `UCR ${y + 1} registration — window open at plan.ucr.gov`,
        due: upcomingDue,
        // 45-day amber like 2290: an annual filing surfacing 30 days out is thin.
        color: daysOut < 0 ? "red" : daysOut <= 45 ? "amber" : "green",
        href: "/hub/compliance",
      })
    }
  }
  return entries
}
