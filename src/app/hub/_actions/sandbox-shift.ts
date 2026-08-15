"use server"

import { demoLoginEnabled } from "@/lib/hub/demo"
import { getFlag } from "@/lib/hub/flags"
import { isSandboxCarrier, SANDBOX_CARRIER_ID, seatForEmail } from "@/lib/hub/sandbox"
import { readCompanyFeed, type FeedItem } from "@/lib/hub/sandbox-feed"
import { isShiftSeat, type ShiftMetrics } from "@/lib/hub/sandbox-objectives"
import { bumpShiftCounter, readShiftMetrics, readSimEpoch } from "@/lib/hub/sandbox-shift"
import { getHubUser } from "@/lib/hub/session"

/**
 * Shift Mode's server half: stateless snapshots. The browser keeps the
 * baseline (clock-in is per-browser by design — no tables), the server only
 * ever reports "here is the world right now, and the sim epoch it belongs
 * to". A reset mints a new epoch, which voids any shift started before it.
 *
 * Both kill switches are enforced HERE too, not just on the tick route: a
 * tab that was already open when the flag flipped keeps its mounted card
 * polling, and `off` is what tells that card to stand down.
 */

export interface ShiftSnapshot {
  ok: boolean
  error?: string
  /** Shift Mode is switched off (kill switch or flag) — stop polling. */
  off?: boolean
  seat?: string
  epoch?: string
  metrics?: ShiftMetrics
  /** The crew rail — what everyone else has been doing while you worked. */
  feed?: FeedItem[]
}

async function snapshot(): Promise<ShiftSnapshot> {
  if (!demoLoginEnabled()) {
    return { ok: false, off: true, error: "The sandbox is disabled on this deployment." }
  }
  if (!(await getFlag("sim.shift_mode", { carrierId: SANDBOX_CARRIER_ID }))) {
    return { ok: false, off: true, error: "Shift Mode is switched off." }
  }
  const user = await getHubUser()
  if (!user || !isSandboxCarrier(user.carrierId)) {
    return { ok: false, off: true, error: "Sign in to a sandbox seat first." }
  }
  const seat = seatForEmail(user.email)
  if (!seat || !isShiftSeat(seat.key)) {
    return { ok: false, off: true, error: "This seat doesn't run shifts." }
  }
  try {
    // The feed is decoration, not scoring — if it fails, the shift carries on
    // without it rather than costing the player their objectives.
    const [epoch, metrics, feed] = await Promise.all([
      readSimEpoch(),
      readShiftMetrics(user.id, seat.key),
      readCompanyFeed(6).catch(() => [] as FeedItem[]),
    ])
    return { ok: true, seat: seat.key, epoch: epoch ?? "unseeded", metrics, feed }
  } catch (error) {
    console.error("shift snapshot failed:", error)
    // Retryable: the caller keeps its baseline and tries again.
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

/**
 * End shift. `startedEpoch` is the epoch the browser clocked in under: a
 * shift only counts as completed when it ends in the world it began in —
 * otherwise a reset mid-shift would score a voided shift against the NEW
 * world's counters.
 */
export async function endShiftAction(startedEpoch?: string): Promise<ShiftSnapshot> {
  const snap = await snapshot()
  if (snap.ok && snap.seat && startedEpoch && snap.epoch === startedEpoch) {
    await bumpShiftCounter("shiftsCompleted", snap.seat).catch(() => {})
  }
  return snap
}
