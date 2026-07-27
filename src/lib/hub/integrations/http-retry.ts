/**
 * Retry-with-backoff for live vendor calls.
 *
 * Why this matters more than it looks: Terminal is the one adapter making real
 * production calls, and its cron runs DAILY. A single transient 503 is
 * therefore a ~24-hour hole in position and HOS data, with no alert and no
 * second attempt until tomorrow. The same is true of every other adapter the
 * day its credentials land.
 *
 * What is and isn't retried, and why:
 *  - 429 and 5xx: retried. These are "try again", by definition.
 *  - Network errors and timeouts: retried. Same class.
 *  - Every other 4xx: NOT retried. A 401 will not become a 200 by asking
 *    again; retrying it just burns the rate limit and delays the real error
 *    reaching the sync ledger where someone might see it.
 *
 * `Retry-After` is honored when the server sends it, in both its forms
 * (delta-seconds and HTTP-date). This is not optional politeness — OTR fronts
 * its API with Azure APIM, which answers a bare 429 with Retry-After, and
 * ignoring it is how an integration gets its key throttled harder.
 */

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number
  /** First backoff in ms; doubles each attempt. Default 500. */
  baseDelayMs?: number
  /** Ceiling for any single wait. Default 8000. */
  maxDelayMs?: number
  /** Injectable for tests — the default actually waits. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable for tests. */
  random?: () => number
  /** Label used in the thrown error, e.g. "Terminal /vehicles". */
  label?: string
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Is this status worth trying again? */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

/**
 * Parse a Retry-After header into milliseconds. Accepts delta-seconds ("120")
 * and HTTP-date ("Wed, 21 Oct 2026 07:28:00 GMT"); returns null for anything
 * else, including a date in the past, so the caller falls back to its own
 * backoff rather than waiting zero or a negative amount.
 */
export function parseRetryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header) return null
  const trimmed = header.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000
  const asDate = Date.parse(trimmed)
  if (Number.isNaN(asDate)) return null
  const delta = asDate - now
  return delta > 0 ? delta : null
}

/**
 * Exponential backoff with full jitter. Jitter matters when a fleet-wide sync
 * fans out — without it every truck's request retries on the same tick and
 * re-creates the burst that caused the 429.
 */
export function backoffMs(attempt: number, base: number, max: number, random = Math.random): number {
  const ceiling = Math.min(max, base * 2 ** attempt)
  return Math.round(ceiling * (0.5 + random() * 0.5))
}

/**
 * fetch, with retry on 429/5xx and transport failures.
 *
 * Returns the Response for the caller to check — it does NOT throw on a
 * non-OK status, so existing `if (!response.ok) throw` code keeps its own
 * error messages. It throws only when every attempt failed at the transport
 * level, preserving the last underlying error as the message.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const {
    attempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    sleep = defaultSleep,
    random = Math.random,
    label = url,
  } = options

  let lastError: unknown = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const isLast = attempt === attempts - 1
    try {
      const response = await fetch(url, init)
      // `ok` is checked before the status class: a successful response is
      // never worth retrying regardless of what its status field says, and
      // trusting the number alone made a bad test fixture (ok:true with
      // status:503) burn three real backoff waits.
      if (response.ok || !isRetryableStatus(response.status) || isLast) return response

      const retryAfter = parseRetryAfterMs(response.headers.get("retry-after"))
      await sleep(retryAfter ?? backoffMs(attempt, baseDelayMs, maxDelayMs, random))
    } catch (err) {
      lastError = err
      if (isLast) break
      await sleep(backoffMs(attempt, baseDelayMs, maxDelayMs, random))
    }
  }

  throw new Error(
    `${label} failed after ${attempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  )
}
