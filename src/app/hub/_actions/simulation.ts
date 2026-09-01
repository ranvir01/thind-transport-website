"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { isSimulation, type SimView } from "@/lib/hub/mode"
import { advanceSimulatedDay } from "@/lib/hub/sim-clock"

export async function setSimViewAction(view: SimView): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOwner()
  if (!(await isSimulation())) return { ok: false, error: "Switcher is simulation-only" }
  if (!["thind", "ats", "all"].includes(view)) return { ok: false, error: "Unknown view" }
  await query(
    `UPDATE hub.users SET sim_view = $2 WHERE id = $1 AND carrier_id = $3`,
    [user.id, view, user.homeCarrierId ?? user.carrierId]
  )
  revalidatePath("/hub")
  return { ok: true }
}

export async function advanceSimDayAction(): Promise<{ ok: boolean; error?: string; date?: string }> {
  const user = await requireOwner()
  if (!(await isSimulation())) return { ok: false, error: "Clock is simulation-only" }
  try {
    const result = await advanceSimulatedDay(user.carrierId)
    revalidatePath("/hub")
    return { ok: true, date: result.date }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Advance failed" }
  }
}
