"use server"

import { demoLoginEnabled } from "@/lib/hub/demo"
import { isSandboxCarrier, seatForEmail } from "@/lib/hub/sandbox"
import { isShiftSeat, type ShiftMetrics } from "@/lib/hub/sandbox-objectives"
import { bumpShiftCounter, readShiftMetrics, readSimEpoch } from "@/lib/hub/sandbox-shift"
import { getHubUser } from "@/lib/hub/session"

/**
 * Shift Mode's server half: stateless snapshots. The browser keeps the
 * baseline (clock-in is per-browser by design — no tables), the server only
 * ever reports "here is the world right now, and the sim epoch it belongs
 * to". A reset mints a new epoch, which voids any shift started before it.
 */

export interface ShiftSnapshot {
  ok: boolean
  error?: string
  seat?: string
  epoch?: string
  metrics?: ShiftMetrics
}

async function snapshot(): Promise<ShiftSnapshot> {
  if (!demoLoginEnabled()) return { ok: false, error: "The sandbox is disabled on this deployment." }
  const user = await getHubUser()
  if (!user || !isSandboxCarrier(user.carrierId)) {
    return { ok: false, error: "Sign in to a sandbox seat first." }
  }
  const seat = seatForEmail(user.email)
  if (!seat || !isShiftSeat(seat.key)) return { ok: false, error: "This seat doesn't run shifts." }
  try {
    const [epoch, metrics] = await Promise.all([readSimEpoch(), readShiftMetrics(user.id)])
    return { ok: true, seat: seat.key, epoch: epoch ?? "unseeded", metrics }
  } catch (error) {
    console.error("shift snapshot failed:", error)
    return { ok: false, error: "Couldn't read the shift board — try again." }
  }
}

/** Clock in: the returned metrics become the browser-held baseline. */
export async function startShiftAction(): Promise<ShiftSnapshot> {
  const snap = await snapshot()
  if (snap.ok && snap.seat) await bumpShiftCounter("shiftsStarted", snap.seat).catch(() => {})
  return snap
}

/** Live objectives poll — diffs against the stored baseline client-side. */
export async function shiftStatusAction(): Promise<ShiftSnapshot> {
  return snapshot()
}

/** End shift: same snapshot, plus the completed-shift telemetry bump. */
export async function endShiftAction(): Promise<ShiftSnapshot> {
  const snap = await snapshot()
  if (snap.ok && snap.seat) await bumpShiftCounter("shiftsCompleted", snap.seat).catch(() => {})
  return snap
}
