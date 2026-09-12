import type { GroundedTruck } from "./dvir"
import type { LegalityCheck } from "./drivers"

/**
 * The strips under a dispatch-board card, computed where a test can reach
 * them.
 *
 * The board used to show one line at most — the first hard stop, else the
 * first warning — and a truck grounded on an unsafe DVIR appeared only as
 * "Truck #N is in the shop": no defect, no way to the page that certifies the
 * repair (#66). A grounded truck now leads with the reason and links to its
 * truck page; the bare "in the shop" stop is the same fact and is dropped so
 * the card does not say it twice. Every other stop still shows, and the first
 * warning still shows only when nothing is stopping the load.
 *
 * No `server-only`, no database: pure, so the board page stays thin and the
 * behaviour is pinned by a unit test rather than a render.
 */
export interface DispatchCardAlert {
  tone: "bad" | "warn"
  text: string
  /** Present when the alert has a page that resolves it. */
  href?: string
}

export function groundedByTruck(rows: GroundedTruck[]): Map<string, GroundedTruck> {
  return new Map(rows.map((g) => [g.truck_id, g]))
}

export function groundedAlertText(g: GroundedTruck): string {
  const defect = g.defects[0]?.label ?? "Defect"
  return `Unit ${g.truck_unit} grounded — ${defect} · certify repair`
}

const SHOP_STOP = / is in the shop$/

export function dispatchCardAlerts(input: {
  legality: LegalityCheck
  grounded: GroundedTruck | null
}): DispatchCardAlert[] {
  const { legality, grounded } = input
  const alerts: DispatchCardAlert[] = []
  if (grounded) {
    alerts.push({
      tone: "bad",
      text: groundedAlertText(grounded),
      href: `/hub/fleet/trucks/${grounded.truck_id}`,
    })
  }
  const stops = grounded ? legality.stops.filter((s) => !SHOP_STOP.test(s)) : legality.stops
  for (const stop of stops) alerts.push({ tone: "bad", text: stop })
  if (alerts.length === 0 && legality.warnings.length > 0) {
    alerts.push({ tone: "warn", text: legality.warnings[0] })
  }
  return alerts
}
