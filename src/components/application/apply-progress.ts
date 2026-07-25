/**
 * Progress math for the /apply wizard, extracted so the mapping is testable.
 *
 * The old inline formula (`((step - 1) / 4) * 100`, with a `0 → 25` render
 * hack) showed 25% on BOTH step 1 and step 2 — a driver who finished the
 * qualify step saw zero bar movement for their effort — and capped the final
 * step at 75%. Endowed progress is a real conversion lever on mobile forms:
 * the bar must visibly advance on every step and read near-done at the end.
 */
export const APPLY_TOTAL_STEPS = 4

export function applyProgressPercent(step: number): number {
  const clamped = Math.min(Math.max(step, 1), APPLY_TOTAL_STEPS)
  return Math.round((clamped / APPLY_TOTAL_STEPS) * 100)
}
