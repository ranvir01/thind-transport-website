/**
 * The sandbox simulation's heartbeat. SimTicker (mounted in the sandbox
 * banner) POSTs here every ~25s while a sandbox tab is visible; the first
 * beat after a gap fast-forwards the world (bounded catch-up). Same trust
 * level as the public sandbox reset — the tick can only move the fabricated
 * tenant, and the 20s in-lock gate is the rate limiter. The caller's seat is
 * derived from the session (never the request body) so presence can't be
 * spoofed into standing down someone else's AI teammate.
 */
import { NextResponse } from "next/server"
import { demoLoginEnabled } from "@/lib/hub/demo"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { tickSandboxSim } from "@/lib/hub/sandbox-sim"
import { getHubUser } from "@/lib/hub/session"

export const dynamic = "force-dynamic"

export async function POST() {
  if (!demoLoginEnabled()) {
    return NextResponse.json({ advanced: false, reason: "disabled" }, { status: 403 })
  }
  const user = await getHubUser().catch(() => null)
  const seat = user && isSandboxCarrier(user.carrierId) ? seatForEmail(user.email) : undefined
  const result = await tickSandboxSim(seat?.key ?? null)
  return NextResponse.json(result)
}
