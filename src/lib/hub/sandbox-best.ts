/**
 * "Beat your last shift" — the best shift a browser has ever worked in a seat.
 *
 * Pure half of the feature, same split as sandbox-ticker-policy.ts: the rules
 * live here and are unit-tested; ShiftCard.tsx owns the DOM and the
 * localStorage calls.
 *
 * The record is per SEAT and per BROWSER. There is no table behind it and
 * that is deliberate — the sandbox has no accounts worth the name, and a
 * scoreboard shared between strangers would turn a private "am I getting
 * better at this?" into a public one nobody asked for.
 *
 * It deliberately SURVIVES a reset. A reset mints a new sim epoch and throws
 * away the world, which is correct for an in-flight shift — the shift happened
 * somewhere that no longer exists. But a personal best is a fact about the
 * player, not about the company they played in. Voiding it on every reset
 * would make the one number worth chasing the most fragile thing on screen,
 * and the sales-demo flow starts with a reset every single time.
 */

export interface PersonalBest {
  /** Share of the seat's objectives completed, 0–100. */
  score: number
  /** What the shift was worth to the player, in cents. */
  cents: number
  minutes: number
  /** ISO timestamp — when the record was set. */
  at: string
}

export const bestKey = (seat: string) => `sandbox-best-${seat}`

/**
 * Parse a stored record, rejecting anything malformed.
 *
 * Returns null rather than a partial object: this value is rendered as a
 * number the player is asked to beat, and `undefined%` is worse than no line
 * at all. Storage is shared with every other tab and every past version of
 * this code, so what comes back is not trustworthy by construction.
 */
export function parseBest(raw: string | null): PersonalBest | null {
  if (!raw) return null
  try {
    const b = JSON.parse(raw) as Partial<PersonalBest>
    if (typeof b?.score !== "number" || !Number.isFinite(b.score)) return null
    if (typeof b?.cents !== "number" || !Number.isFinite(b.cents)) return null
    return {
      score: b.score,
      cents: b.cents,
      minutes: typeof b.minutes === "number" && Number.isFinite(b.minutes) ? b.minutes : 0,
      at: typeof b.at === "string" ? b.at : "",
    }
  } catch {
    return null
  }
}

/**
 * Did this shift beat the record?
 *
 * Score first, money only as the tie-break. The objectives ARE the job; the
 * money is what the job was worth. Ranking on money alone would crown the
 * shift where a big invoice happened to get paid by the autopilot over the
 * shift where someone actually cleared the board — which would teach exactly
 * the wrong lesson about the software.
 *
 * A first shift (no previous record) beats nothing: it SETS the record, which
 * `firstRecord` distinguishes, because congratulating someone for beating a
 * record that never existed is the kind of praise that makes the real thing
 * worthless.
 */
export function betterThan(prev: PersonalBest | null, next: PersonalBest): boolean {
  if (!prev) return true
  if (next.score !== prev.score) return next.score > prev.score
  return next.cents > prev.cents
}

/** True only when a record that already existed was knocked over. */
export function beatsExisting(prev: PersonalBest | null, next: PersonalBest): boolean {
  return prev !== null && betterThan(prev, next)
}

/**
 * Is this shift worth remembering at all?
 *
 * A shift that completed no objectives and earned nothing is not a record,
 * it is a person clocking in and straight back out. Storing it anyway is what
 * the first version did, and the card then advertised "Your best shift here:
 * 0% of the job, $0" — which is not a target to beat, it is a line that makes
 * the whole feature look broken. Found by looking at the screen; every unit
 * test passed.
 *
 * Zero is the only bar. Anything a player actually did is worth keeping,
 * however small — the point is to have something to beat, not to be graded.
 */
export function worthRemembering(next: PersonalBest): boolean {
  return next.score > 0 || next.cents > 0
}
