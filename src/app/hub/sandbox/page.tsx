import type { Metadata } from "next"
import { SeatPicker } from "./SeatPicker"

export const metadata: Metadata = {
  title: "Sandbox — run the whole company",
  description:
    "A fully seeded practice trucking company. Pick any of nine seats — owner, dispatch, accounting, safety, recruiting, two drivers, broker, shipper — and drive the real app.",
}

// First entry seeds a whole quarter of company data in one transaction.
export const maxDuration = 60

/**
 * The playable sandbox: real app, real database rows, fake company
 * (Blue Ridge Haulage). Public (proxy allowlists /hub/sandbox); picking a
 * seat signs you in as that person. One click resets the whole room.
 */
export default function SandboxPage() {
  return <SeatPicker />
}
