import type { HubRole } from "./types"

/**
 * The LoadOff sandbox: a fully seeded, resettable practice company
 * ("Blue Ridge Haulage") anyone can drive from any seat. Pure constants —
 * client-safe; seeding lives in sandbox-seed.ts (server only).
 *
 * Sandbox logins reuse the @demo.thind suffix on purpose: the
 * HUB_DEMO_LOGIN="false" kill switch disables every demo/sandbox account
 * in one move (see src/lib/hub/demo.ts).
 */
export const SANDBOX_CARRIER_ID = "33333333-3333-3333-3333-333333333333"
export const SANDBOX_CARRIER_NAME = "Blue Ridge Haulage (Sandbox)"
/** Public by design — the sandbox is a playground, not a tenant. */
export const SANDBOX_PASSWORD = "SandboxRide1!"

export function isSandboxCarrier(carrierId: string | null | undefined): boolean {
  return carrierId === SANDBOX_CARRIER_ID
}

export interface SandboxSeat {
  key: string
  /** The person you become. */
  name: string
  title: string
  email: string
  role: HubRole
  /** Where this seat lands after sign-in. */
  entry: string
  /** What this seat is for — one line on the seat card. */
  blurb: string
  /** Seat group for the picker layout. */
  group: "office" | "road" | "outside"
}

export const SANDBOX_SEATS: SandboxSeat[] = [
  {
    key: "owner",
    name: "Priya Dhillon",
    title: "Owner",
    email: "sandbox.owner@demo.thind",
    role: "owner",
    entry: "/hub",
    blurb: "The whole business: P&L, settlement approvals, users, settings.",
    group: "office",
  },
  {
    key: "dispatcher",
    name: "Marcus Webb",
    title: "Dispatcher",
    email: "sandbox.dispatch@demo.thind",
    role: "dispatcher",
    entry: "/hub/loadboard",
    blurb: "Book loads, assign trucks, chase check calls, keep the board moving.",
    group: "office",
  },
  {
    key: "accountant",
    name: "Rosa Alvarez",
    title: "Accountant",
    email: "sandbox.books@demo.thind",
    role: "accountant",
    entry: "/hub/money",
    blurb: "Invoices out, payments in, driver settlements to the penny.",
    group: "office",
  },
  {
    key: "safety",
    name: "Elena Vasquez",
    title: "Safety manager",
    email: "sandbox.safety@demo.thind",
    role: "dispatcher",
    entry: "/hub/safety",
    blurb: "Fleet safety score, incidents, DVIR defects, the compliance wall.",
    group: "office",
  },
  {
    key: "recruiter",
    name: "Grace Okafor",
    title: "Recruiter",
    email: "sandbox.recruiting@demo.thind",
    role: "dispatcher",
    entry: "/hub/recruiting",
    blurb: "Applicant pipeline from first click to orientation day.",
    group: "office",
  },
  {
    key: "driver",
    name: "Jordan Reyes",
    title: "Company driver",
    email: "sandbox.driver@demo.thind",
    role: "driver",
    entry: "/hub/driver",
    blurb: "Your load, your clocks, your pay — the phone-first driver app.",
    group: "road",
  },
  {
    key: "owner_operator",
    name: "Sam Brar",
    title: "Owner-operator",
    email: "sandbox.oo@demo.thind",
    role: "driver",
    entry: "/hub/driver",
    blurb: "Percentage pay, your own truck, escrow and advances that add up.",
    group: "road",
  },
  {
    key: "broker",
    name: "Dana Kim",
    title: "Broker · Summit Freight",
    email: "sandbox.broker@demo.thind",
    role: "broker",
    entry: "/hub/portal",
    blurb: "The customer portal a broker sees: live tracking, PODs, invoices.",
    group: "outside",
  },
  {
    key: "shipper",
    name: "Alex Chen",
    title: "Shipper · Cascade Foods",
    email: "sandbox.shipper@demo.thind",
    role: "shipper",
    entry: "/hub/portal",
    blurb: "Direct-shipper view: quotes, pickups on the calendar, delivery proof.",
    group: "outside",
  },
]

export function sandboxSeat(key: string): SandboxSeat | undefined {
  return SANDBOX_SEATS.find((seat) => seat.key === key)
}

/** Which seat a signed-in sandbox user occupies (by login email). */
export function seatForEmail(email: string | null | undefined): SandboxSeat | undefined {
  if (!email) return undefined
  const needle = email.toLowerCase()
  return SANDBOX_SEATS.find((seat) => seat.email === needle)
}

export interface SandboxTourStep {
  label: string
  href: string
}

/**
 * The per-seat guided tour: the first three moves that make this chair make
 * sense. Rendered as a dismissable card with the sandbox banner.
 */
export const SANDBOX_TOURS: Record<string, SandboxTourStep[]> = {
  owner: [
    { label: "Read the morning pulse", href: "/hub" },
    { label: "Approve draft settlements", href: "/hub/money/settlements" },
    { label: "Check the safety score", href: "/hub/safety" },
  ],
  dispatcher: [
    { label: "Book a quoted load", href: "/hub/loadboard" },
    { label: "Dispatch truck + driver", href: "/hub/dispatch" },
    { label: "Track the live trucks", href: "/hub/map" },
  ],
  accountant: [
    { label: "Bill delivered loads", href: "/hub/money" },
    { label: "Chase 30-day aging", href: "/hub/money/invoices" },
    { label: "Approve settlements", href: "/hub/money/settlements" },
  ],
  safety: [
    { label: "Read the safety score", href: "/hub/safety" },
    { label: "Review the DOT register", href: "/hub/safety" },
    { label: "Check the compliance wall", href: "/hub/compliance" },
  ],
  recruiter: [
    { label: "Advance an applicant", href: "/hub/recruiting" },
    { label: "Pull Priti's MVR file", href: "/hub/recruiting" },
    { label: "Close Dale's offer", href: "/hub/recruiting" },
  ],
  driver: [
    { label: "Send the POD", href: "/hub/driver" },
    { label: "Check this week's pay", href: "/hub/driver/pay" },
    { label: "Answer dispatch", href: "/hub/driver/messages" },
  ],
  owner_operator: [
    { label: "See pay + escrow", href: "/hub/driver/pay" },
    { label: "Ask for an advance", href: "/hub/driver/pay" },
    { label: "Check load + clocks", href: "/hub/driver" },
  ],
  broker: [
    { label: "Track live freight", href: "/hub/portal" },
    { label: "Open a POD", href: "/hub/portal" },
    { label: "Check open invoices", href: "/hub/portal" },
  ],
  shipper: [
    { label: "See pickups scheduled", href: "/hub/portal" },
    { label: "Follow a shipment", href: "/hub/portal" },
    { label: "Grab delivery proof", href: "/hub/portal" },
  ],
}

export type SandboxScenario = "steady" | "crunch"

export const SANDBOX_SCENARIOS: { key: SandboxScenario; label: string; blurb: string }[] = [
  { key: "steady", label: "Steady week", blurb: "The baseline company — loads moving, money flowing." },
  { key: "crunch", label: "Crunch day", blurb: "Two pickups late, a truck in the shop, invoices aging — go." },
]
