/**
 * The LoadOff interactive demo — scene script.
 *
 * A scripted "day at a carrier", compressed to ~90 seconds, running entirely
 * on fabricated data (no tenant reads, no network). Where a live integration
 * would answer (ELD stream, QuickBooks, bank feed), the demo simulates the
 * answer — this is the product at max potential, which is exactly what a
 * prospect needs to see before credentials exist.
 *
 * Pure data so the player and tests share one source of truth.
 */

export interface DemoScene {
  id: string
  /** Short label for the progress rail / scene list. */
  title: string
  /** The one-line sell under the scene — narration, not marketing fluff. */
  caption: string
  /** Auto-advance after this many ms (0 = never; the player waits for a tap). */
  durationMs: number
  /** Sub-step reveal offsets in ms from scene start (scenes stage visuals off these). */
  stepsMs: number[]
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: "open",
    title: "LoadOff",
    caption: "A day at a 10-truck carrier, compressed into 90 seconds.",
    durationMs: 4600,
    stepsMs: [200, 900, 1700],
  },
  {
    id: "today",
    title: "Today",
    caption: "One screen says what needs a human. Everything else runs itself.",
    durationMs: 7800,
    stepsMs: [300, 900, 1500, 2100, 3200],
  },
  {
    id: "ratecon",
    title: "Rate con",
    caption: "Paste any rate confirmation — the AI reads it and builds the load.",
    durationMs: 10400,
    stepsMs: [400, 2000, 2700, 3400, 4100, 4800, 6200],
  },
  {
    id: "dispatch",
    title: "Dispatch",
    caption: "One tap to dispatch. The driver confirms from the cab — no phone tag.",
    durationMs: 9000,
    stepsMs: [400, 1600, 3000, 4800, 6200],
  },
  {
    id: "track",
    title: "Live map",
    caption: "ELD connected: every truck live, geofences stamp arrivals for you.",
    durationMs: 10400,
    stepsMs: [400, 1500, 4200, 6800, 8200],
  },
  {
    id: "pod",
    title: "POD",
    caption: "The POD is photographed before the truck leaves the dock.",
    durationMs: 7200,
    stepsMs: [400, 1800, 3200, 4600],
  },
  {
    id: "invoice",
    title: "Invoice",
    caption: "Delivered → invoiced in one tap, POD attached, emailed to the broker.",
    durationMs: 9200,
    stepsMs: [400, 1400, 2400, 3400, 5000, 6400],
  },
  {
    id: "paid",
    title: "Paid",
    caption: "Payment lands, books sync to QuickBooks — nothing re-typed.",
    durationMs: 8800,
    stepsMs: [400, 1800, 3400, 5200],
  },
  {
    id: "autopilot",
    title: "Autopilot",
    caption: "IFTA, fuel audit, driver pay, compliance — the back office runs itself.",
    durationMs: 10600,
    stepsMs: [400, 1600, 2800, 4000, 5200, 6400],
  },
  {
    id: "wrap",
    title: "That's LoadOff",
    caption: "One load, zero phone calls, four minutes of office work. Take a load off.",
    durationMs: 0,
    stepsMs: [300, 1100, 1900],
  },
]

/** Fabricated cast + numbers the scenes render (single source, keeps scenes consistent). */
export const DEMO_DATA = {
  carrier: "Cascade Ridge Carriers",
  dispatcher: "Maya",
  driver: "Harpreet Singh",
  truck: "#101",
  broker: "Pacific Crest Logistics",
  lane: { origin: "Seattle, WA", dest: "Boise, ID", miles: 494 },
  reference: "PCL-88214",
  linehaulCents: 285000,
  detentionCents: 15000,
  invoiceNumber: "CRC-INV-1042",
  fuelGallonsFlagged: 312,
  tankCapacity: 240,
  settlementCents: 112000,
} as const

export function demoScene(id: string): DemoScene | null {
  return DEMO_SCENES.find((s) => s.id === id) ?? null
}

/** Total runtime of the auto-advancing portion (the wrap scene holds). */
export function demoRuntimeMs(): number {
  return DEMO_SCENES.reduce((sum, s) => sum + s.durationMs, 0)
}
