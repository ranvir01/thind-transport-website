"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import {
  currentTestingPeriod, notifyRandomTestPool, recordRandomTestResult, selectRandomTestPool,
  type TestResult, type TestType,
} from "@/lib/hub/random-testing"
import { actionError } from "@/lib/hub/action-error"
import type { ActionResult } from "./fleet"

/** Office-triggered "run this quarter's pool" — selects, then immediately notifies (DOT requires prompt notice once selected). */
export async function runRandomTestSelectionAction(testType: TestType): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const period = currentTestingPeriod()
    const selected = await selectRandomTestPool(user.carrierId, testType, period)
    const { notified } = await notifyRandomTestPool(user.carrierId, testType, period)
    revalidatePath("/hub/compliance/random-testing")
    return {
      ok: true,
      error: selected.length === 0 && notified === 0 ? "Nothing to select — quarter's pool is already full or no active drivers" : undefined,
    }
  } catch (err) {
    return actionError(err, "Failed to run selection")
  }
}

export async function recordRandomTestResultAction(
  id: string,
  values: {
    status: "completed" | "refused" | "no_show"
    result?: TestResult | ""
    completedOn?: string
    notes?: string
  }
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("compliance:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    await recordRandomTestResult(user.carrierId, id, {
      status: values.status,
      result: values.result || null,
      completedOn: values.completedOn || null,
      notes: values.notes || null,
    })
    revalidatePath("/hub/compliance/random-testing")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to record result")
  }
}
