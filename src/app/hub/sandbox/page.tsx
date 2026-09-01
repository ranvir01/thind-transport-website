import type { Metadata } from "next"
import { getActiveHubUser } from "@/lib/hub/session"
import { isSandboxCarrier } from "@/lib/hub/sandbox"
import { getCarrier } from "@/lib/hub/settings"
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
export default async function SandboxPage() {
  // Taking a seat calls signIn, which REPLACES the current session. Since the
  // nav gained a "Practice mode" link, a real carrier can arrive here mid-shift
  // — so tell them what the click costs and give them a way back. The page
  // stays public: no session simply means no warning.
  const user = await getActiveHubUser()
  const realCarrier =
    user && user.carrierId && !isSandboxCarrier(user.carrierId)
      ? (await getCarrier(user.carrierId))?.name ?? "your company"
      : null

  return <SeatPicker signedInAs={realCarrier} />
}
