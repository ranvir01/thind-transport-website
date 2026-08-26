/**
 * Normalize Postgres DATE values (Date objects or ISO strings) for display.
 * node-pg returns JavaScript Date objects; String(date).slice(0, 10) yields
 * "Mon Feb 12" and breaks toLocaleDateString — the Today time-off bug.
 */

export function toIsoDateOnly(value: unknown): string | null {
  if (value == null || value === "") return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }

  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return null
}

/** Short label for hub UI: "Jun 15" */
export function formatHubDateShort(value: unknown): string {
  const iso = toIsoDateOnly(value)
  if (!iso) return "—"
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
