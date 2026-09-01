"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requirePermission } from "@/lib/hub/session"
import { pnlPresetRanges, resolvePnlRange, REPORTS_RANGE_COOKIE } from "@/lib/hub/reports"

const COOKIE_PATH = "/hub/reports"
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60

/**
 * Apply a P&L range (preset button or the from/to fields), remember it, and
 * land on the canonical ?from/?to URL so the subtitle, KPI cards, and
 * range-aware CSV export all follow from the params as before.
 */
export async function applyReportRangeAction(formData: FormData) {
  await requirePermission("money:read")
  const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : null)
  const preset = pnlPresetRanges().find((p) => p.key === str(formData.get("preset")))
  const range = preset?.range ?? resolvePnlRange(str(formData.get("from")), str(formData.get("to")))
  const jar = await cookies()
  jar.set(REPORTS_RANGE_COOKIE, `${range.from}_${range.to}`, {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  })
  redirect(`/hub/reports?from=${range.from}&to=${range.to}`)
}

/** Forget the remembered range and go back to the default trailing-92-day view. */
export async function resetReportRangeAction() {
  await requirePermission("money:read")
  const jar = await cookies()
  // Expire rather than delete(): the delete default path ("/") wouldn't match.
  jar.set(REPORTS_RANGE_COOKIE, "", { path: COOKIE_PATH, httpOnly: true, sameSite: "lax", maxAge: 0 })
  redirect("/hub/reports")
}
