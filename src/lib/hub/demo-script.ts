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

/* ============================================================================
 * Multi-seat tracks — the same fabricated day from every chair in the
 * business. "office" reuses the original scene list; driver/owner/broker are
 * their own arcs so a prospect can run the company from all angles.
 * ==========================================================================*/

export type DemoTrackId = "office" | "driver" | "owner" | "broker"

export interface DemoTrack {
  id: DemoTrackId
  label: string
  role: string
  blurb: string
  scenes: DemoScene[]
}

const DRIVER_SCENES: DemoScene[] = [
  {
    id: "d-offer",
    title: "Load offer",
    caption: "Loads arrive on the phone — accept from the couch, not a callback queue.",
    durationMs: 7600,
    stepsMs: [300, 1400, 3000, 4600],
  },
  {
    id: "d-run",
    title: "The run",
    caption: "Everything for the run on one card. No calling dispatch back for the dock number.",
    durationMs: 8600,
    stepsMs: [300, 1200, 2200, 3400, 4800],
  },
  {
    id: "d-arrive",
    title: "Arrival",
    caption: "The geofence stamps arrival; the detention clock runs without an argument.",
    durationMs: 7600,
    stepsMs: [300, 1800, 3400, 5000],
  },
  {
    id: "d-pod",
    title: "POD",
    caption: "Photograph the POD before leaving the dock — uploads even if signal drops.",
    durationMs: 7200,
    stepsMs: [300, 1600, 3200, 4600],
  },
  {
    id: "d-pay",
    title: "Pay",
    caption: "Pay is transparent: every mile, every deduction, on the phone before Friday.",
    durationMs: 8600,
    stepsMs: [300, 1400, 2600, 3800, 5200],
  },
  {
    id: "d-wrap",
    title: "Your seat",
    caption: "That's a driver's whole day of paperwork — about four taps.",
    durationMs: 0,
    stepsMs: [300, 1100],
  },
]

const OWNER_SCENES: DemoScene[] = [
  {
    id: "o-pulse",
    title: "The pulse",
    caption: "The week in four numbers — revenue, margin, unbilled, and who owes you.",
    durationMs: 8200,
    stepsMs: [300, 1000, 1700, 2400, 3600],
  },
  {
    id: "o-fraud",
    title: "Fuel audit",
    caption: "The fuel audit never sleeps: a 312-gallon buy on a 240-gallon tank gets caught overnight.",
    durationMs: 8200,
    stepsMs: [300, 1800, 3400, 5000],
  },
  {
    id: "o-settle",
    title: "Driver pay",
    caption: "Settlements draft themselves to the penny — you just approve.",
    durationMs: 8200,
    stepsMs: [300, 1400, 2600, 3800, 5200],
  },
  {
    id: "o-books",
    title: "Books",
    caption: "Invoices, payments and fuel sync to QuickBooks — nothing typed twice.",
    durationMs: 7600,
    stepsMs: [300, 1600, 3200, 4600],
  },
  {
    id: "o-comply",
    title: "Compliance",
    caption: "CDLs, med cards, 2290s, IFTA — one wall, watched daily, renewal packet ready.",
    durationMs: 8200,
    stepsMs: [300, 1500, 2700, 3900, 5200],
  },
  {
    id: "o-wrap",
    title: "Your seat",
    caption: "The back office ran itself. You made two decisions all week.",
    durationMs: 0,
    stepsMs: [300, 1100],
  },
]

const BROKER_SCENES: DemoScene[] = [
  {
    id: "b-track",
    title: "Tracking link",
    caption: "\"Where's my truck?\" gets a live link, not a phone call.",
    durationMs: 8600,
    stepsMs: [300, 1600, 3200, 4800],
  },
  {
    id: "b-docs",
    title: "Paperwork",
    caption: "POD lands with the invoice, minutes after delivery — nothing to chase.",
    durationMs: 7600,
    stepsMs: [300, 1600, 3200, 4600],
  },
  {
    id: "b-score",
    title: "The record",
    caption: "On-time, tracked, papered — the carrier brokers call back.",
    durationMs: 7000,
    stepsMs: [300, 1600, 3200],
  },
  {
    id: "b-wrap",
    title: "Your seat",
    caption: "Your broker never waited on anything. That's why the next load comes easy.",
    durationMs: 0,
    stepsMs: [300, 1100],
  },
]

export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: "office",
    label: "Dispatcher",
    role: "Run the day",
    blurb: "Book, dispatch, track, invoice, get paid — the full loop in 90 seconds.",
    scenes: DEMO_SCENES,
  },
  {
    id: "driver",
    label: "Driver",
    role: "Run the load",
    blurb: "Accept, drive, arrive, photograph the POD, watch the pay math.",
    scenes: DRIVER_SCENES,
  },
  {
    id: "owner",
    label: "Owner",
    role: "Run the money",
    blurb: "Margins, fuel audit, driver pay, books and compliance — on autopilot.",
    scenes: OWNER_SCENES,
  },
  {
    id: "broker",
    label: "Broker view",
    role: "What customers see",
    blurb: "The live tracking link, instant paperwork, and why they call back.",
    scenes: BROKER_SCENES,
  },
]

export function demoTrack(id: string): DemoTrack | null {
  return DEMO_TRACKS.find((t) => t.id === id) ?? null
}
