/**
 * The sandbox simulation's heartbeat. SimTicker (mounted in the sandbox
 * banner) POSTs here every ~25s while a sandbox tab is visible; the first
 * beat after a gap fast-forwards the world (bounded catch-up).
 *
 * Gates, in cost order (review E1/E3): the HUB_DEMO_LOGIN hard kill, the
 * sim.shift_mode soft kill (feature flag, no redeploy), then a REQUIRED
 * sandbox session — ticks fire ~2×/min per tab and a catch-up tick can run
 * a few hundred statements, so this endpoint is never an unauthenticated
 * cost lever (unlike the rare, cheap reset). Every SimTicker mount lives
 * inside a signed-in sandbox tab, so the session demand costs nothing.
 * The caller's seat is derived from the session (never the request body) so
 * presence can't be spoofed into standing down someone else's AI teammate.
 */
import { NextResponse } from "next/server"
import { demoLoginEnabled } from "@/lib/hub/demo"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, SANDBOX_CARRIER_ID, seatForEmail } from "@/lib/hub/sandbox"
import { tickSandboxSim } from "@/lib/hub/sandbox-sim"
import { getHubUser } from "@/lib/hub/session"

export const dynamic = "force-dynamic"

export async function POST() {
  if (!demoLoginEnabled()) {
    return NextResponse.json({ advanced: false, reason: "disabled" }, { status: 403 })
  }
  if (!(await getFlag("sim.shift_mode", { carrierId: SANDBOX_CARRIER_ID }))) {
    return NextResponse.json({ advanced: false, reason: "off" }, { status: 403 })
  }
  const user = await getHubUser().catch(() => null)
  if (!user || !isSandboxCarrier(user.carrierId)) {
    return NextResponse.json({ advanced: false, reason: "unauthorized" }, { status: 401 })
  }
  const seat = seatForEmail(user.email)
  const result = await tickSandboxSim(seat?.key ?? null)
  return NextResponse.json(result)
}
