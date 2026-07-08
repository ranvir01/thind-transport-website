/**
 * Hobby-plan cron guard for vercel.json.
 *
 * Vercel Hobby rejects any cron that would fire more than once per calendar
 * day — the deploy fails before build, with a status link to
 * https://vercel.com/docs/cron-jobs/usage-and-pricing. This module is the
 * local/pre-merge catch so we never re-learn that at the Vercel status check.
 *
 * Shared by vitest (`src/lib/__tests__/hobby-cron-guard.test.ts`) and
 * `scripts/go-live-check.mjs`.
 */

/** Expand one cron field into the concrete values it matches in [min, max]. */
export function expandCronField(field, min, max) {
  if (field == null || field === "") {
    throw new Error(`empty cron field`)
  }
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }

  const out = new Set()
  for (const part of field.split(",")) {
    const [rangePart, stepRaw] = part.split("/")
    const step = stepRaw != null ? Number(stepRaw) : 1
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`invalid cron step in "${field}"`)
    }

    let start
    let end
    if (rangePart === "*") {
      start = min
      end = max
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-")
      start = Number(a)
      end = Number(b)
    } else {
      start = Number(rangePart)
      end = stepRaw != null ? max : start
    }
    if (![start, end].every((n) => Number.isInteger(n) && n >= min && n <= max) || start > end) {
      throw new Error(`invalid cron range in "${field}"`)
    }
    for (let n = start; n <= end; n += step) out.add(n)
  }
  return [...out].sort((a, b) => a - b)
}

/**
 * How many times would this 5-field cron fire on a single calendar day that
 * matches its day-of-month / day-of-week filters?
 *
 * Hobby only cares about per-day frequency — weekly/monthly schedules are fine
 * as long as each firing day has exactly one (minute, hour) pair.
 */
export function firingsPerMatchingDay(schedule) {
  const parts = String(schedule).trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`expected 5-field cron, got ${parts.length} in "${schedule}"`)
  }
  const [minute, hour] = parts
  const minutes = expandCronField(minute, 0, 59)
  const hours = expandCronField(hour, 0, 23)
  return minutes.length * hours.length
}

/** True when Hobby would reject this schedule at deploy time. */
export function exceedsHobbyDailyLimit(schedule) {
  return firingsPerMatchingDay(schedule) > 1
}

/**
 * @param {{ crons?: { path?: string, schedule?: string }[] } | null | undefined} vercel
 * @returns {{ path: string, schedule: string, firingsPerDay: number }[]}
 */
export function hobbyIllegalCrons(vercel) {
  const illegal = []
  for (const cron of vercel?.crons ?? []) {
    const schedule = cron?.schedule
    const path = cron?.path ?? "(missing path)"
    if (!schedule) {
      illegal.push({ path, schedule: String(schedule), firingsPerDay: Infinity })
      continue
    }
    const firingsPerDay = firingsPerMatchingDay(schedule)
    if (firingsPerDay > 1) {
      illegal.push({ path, schedule, firingsPerDay })
    }
  }
  return illegal
}
