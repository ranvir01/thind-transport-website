/**
 * LoadOff product showcase — mock-data walkthroughs for every persona.
 * Used by the public /loadoff theater. Numbers mirror seed-demo (integer cents).
 */

import { PRODUCT } from "@/lib/hub/product"

export type ShowcaseDevice = "desktop" | "phone"

export type ShowcasePersonaId =
  | "dispatcher"
  | "driver"
  | "accountant"
  | "owner"
  | "broker"
  | "shipper"

export interface ShowcaseFrame {
  id: string
  screenTitle: string
  voiceover: string
  beats: string[]
  durationMs: number
}

export interface ShowcasePersona {
  id: ShowcasePersonaId
  label: string
  roleLine: string
  device: ShowcaseDevice
  demoEmail: string
  summary: string
  frames: ShowcaseFrame[]
}

export const SHOWCASE_MOCK = {
  due: {
    ref: "THD-1001",
    lane: "Kent, WA pickup",
    window: "09:00",
  },
  load: {
    ref: "THD-1008",
    lane: "Kent, WA → Sacramento, CA",
    rateCents: 285000,
    driver: "Marcus Hale",
    truck: "Unit 214",
  },
  active: {
    ref: "THD-1003",
    lane: "Portland, OR → Boise, ID",
    status: "In transit",
  },
  money: {
    unbilledCents: 285000,
    settleNetCents: 184230,
  },
} as const

export const SHOWCASE_PERSONAS: ShowcasePersona[] = [
  {
    id: "dispatcher",
    label: "Dispatcher",
    roleLine: "Today → book → dispatch",
    device: "desktop",
    demoEmail: "dispatch@demo.thind",
    summary: "Zero-click huddle: late pickups, unconfirmed drivers, freight ready to bill.",
    frames: [
      {
        id: "today",
        screenTitle: "Today",
        voiceover: "Open Today. Red and amber first — late appointments, unconfirmed drivers, unbilled money.",
        beats: ["Due today", "Unconfirmed pulses", "One-click invoice"],
        durationMs: 5000,
      },
      {
        id: "paste",
        screenTitle: "Paste rate con",
        voiceover: "Paste the broker email once. Lane, rate, and stops fill in — booked in under a minute.",
        beats: ["Integer-cent rate", "Stops parsed", "Broker linked"],
        durationMs: 4800,
      },
    ],
  },
  {
    id: "driver",
    label: "Driver",
    roleLine: "Phone-first cab app",
    device: "phone",
    demoEmail: "driver@demo.thind",
    summary: "Confirm, arrive, POD. Big buttons. Works offline.",
    frames: [
      {
        id: "home",
        screenTitle: "My load",
        voiceover: "Active load is pinned with appointment windows and facility tips.",
        beats: ["Thumb tabs", "Pinned paperwork", "Offline queue"],
        durationMs: 5000,
      },
      {
        id: "status",
        screenTitle: "I'm here",
        voiceover: "Tap I'm here or Leaving now. Detention starts. Delivered unlocks Snap & send.",
        beats: ["One-tap status", "Camera POD", "Detention clock"],
        durationMs: 5000,
      },
    ],
  },
  {
    id: "accountant",
    label: "Accountant",
    roleLine: "POD → invoice → settle",
    device: "desktop",
    demoEmail: "accounting@demo.thind",
    summary: "When POD lands, invoice is one click. Settlements run pay rules.",
    frames: [
      {
        id: "invoice",
        screenTitle: "Invoice THD-1008",
        voiceover: "POD attached, branded PDF ready. Send — AR updates the same minute.",
        beats: ["Integer cents", "POD attached", "Factor remit"],
        durationMs: 5000,
      },
      {
        id: "ifta",
        screenTitle: "Fuel & IFTA",
        voiceover: "Reefer gallons stay tax-exempt. Quarter worksheet is a button.",
        beats: ["REEFER badges", "Quarter export", "MPG without reefer"],
        durationMs: 4800,
      },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    roleLine: "Pulse + people",
    device: "desktop",
    demoEmail: "owner@demo.thind",
    summary: "Dispatch, money, compliance, hiring, and integrations — one login.",
    frames: [
      {
        id: "pulse",
        screenTitle: "Owner pulse",
        voiceover: "Revenue this week, AR aging, compliance reds, trucks empty tomorrow.",
        beats: ["KPI drill-in", "Compliance flags", "Empty forecast"],
        durationMs: 5000,
      },
    ],
  },
  {
    id: "broker",
    label: "Broker",
    roleLine: "Partner portal",
    device: "phone",
    demoEmail: "broker@demo.thind",
    summary: "Live tracking, POD download, invoice status — no check-calls.",
    frames: [
      {
        id: "moving",
        screenTitle: "Moving now",
        voiceover: "Every load in transit with a position hint. Tap for docs and payment.",
        beats: ["Live status", "Your reference", "Packet download"],
        durationMs: 5000,
      },
    ],
  },
  {
    id: "shipper",
    label: "Shipper",
    roleLine: "Quotes + tracking",
    device: "phone",
    demoEmail: "shipper@demo.thind",
    summary: "Request a quote, track the shipment, grab the POD.",
    frames: [
      {
        id: "quote",
        screenTitle: "Request quote",
        voiceover: "Lane, equipment, and timing in one form. Status updates in the same portal.",
        beats: ["Quote request", "Track shipment", "POD ready"],
        durationMs: 4800,
      },
    ],
  },
]

export const SHOWCASE_PASSWORD = "ThindDemo1!"

export function getPersona(id: string): ShowcasePersona | undefined {
  return SHOWCASE_PERSONAS.find((p) => p.id === id)
}

export const SHOWCASE_PITCH = {
  headline: `${PRODUCT.name} — one login for every seat`,
  subhead: PRODUCT.mission,
} as const
