// Appointment countdown pill on the Today dashboard. Lives outside page.tsx so
// the lateness math is unit-testable (countdown.test.ts); `now` is injectable
// for the same reason.
export function countdown(
  iso: string | null,
  now: number = Date.now()
): { label: string; urgent: boolean } {
  if (!iso) return { label: "no appt", urgent: false }
  const minutes = Math.round((new Date(iso).getTime() - now) / 60000)
  if (minutes < 0) {
    const late = -minutes
    if (late < 60) return { label: `${late}m late`, urgent: true }
    return { label: `${Math.round(late / 60)}h late`, urgent: true }
  }
  if (minutes < 60) return { label: `in ${minutes}m`, urgent: minutes < 30 }
  if (minutes < 60 * 12) return { label: `in ${Math.round(minutes / 60)}h`, urgent: false }
  return {
    label: new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    urgent: false,
  }
}
