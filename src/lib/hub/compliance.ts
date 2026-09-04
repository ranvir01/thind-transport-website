import { query } from "./db"
import { notifyRoles } from "./notify"
import { getCarrierSettings } from "./settings"
import { iftaFilingComplianceEntries } from "./ifta"
import { form2290ComplianceEntries } from "./hvut-compliance"
import { filingsComplianceEntries } from "./filings-compliance"
import { mileageStatus } from "./maintenance-due"

export type ComplianceColor = "red" | "amber" | "green"

export interface ComplianceEntry {
  entity: "driver" | "truck" | "trailer" | "company"
  entityId: string | null
  name: string
  kind: string
  due: string | null
  /** Miles remaining until a mileage-based PM is due (negative = overdue).
   *  Only set when there's no usable due date and set to null otherwise. */
  dueMiles?: number | null
  color: ComplianceColor
  href: string
  manualItemId?: string
}

function colorFor(due: string | null, now: Date): ComplianceColor {
  if (!due) return "amber"
  const dueDate = new Date(due)
  if (dueDate < now) return "red"
  if (dueDate.getTime() - now.getTime() < 30 * 86400000) return "amber"
  return "green"
}

const COLOR_SEVERITY: Record<ComplianceColor, number> = { red: 0, amber: 1, green: 2 }

/** More urgent of the two colors (nulls are "no signal", not "fine"). */
function worseColor(a: ComplianceColor | null, b: ComplianceColor | null): ComplianceColor | null {
  if (a && b) return COLOR_SEVERITY[a] <= COLOR_SEVERITY[b] ? a : b
  return a ?? b
}

/**
 * Best-known current odometer per truck: the highest reading recorded across
 * telematics pings, work orders, and DVIRs (a real odometer never rolls back,
 * so MAX is a safe fleet-wide "latest" without needing per-source timestamps).
 */
export async function truckOdometers(carrierId: string): Promise<Map<string, number>> {
  const rows = await query<{ truck_id: string; odometer: string }>(
    `SELECT truck_id, MAX(odometer) AS odometer FROM (
       SELECT truck_id, odometer FROM hub.position_pings WHERE carrier_id = $1 AND odometer IS NOT NULL
       UNION ALL
       SELECT truck_id, odometer FROM hub.maintenance_records WHERE carrier_id = $1 AND odometer IS NOT NULL
       UNION ALL
       SELECT truck_id, odometer FROM hub.dvirs WHERE carrier_id = $1 AND odometer IS NOT NULL
     ) readings
     GROUP BY truck_id`,
    [carrierId]
  )
  return new Map(rows.map((r) => [r.truck_id, Number(r.odometer)]))
}

/**
 * The compliance surface: derived items (document/credential expiries,
 * maintenance due) + manual company items (IFTA decals, 2290, UCR, BOC-3…).
 */
export async function complianceEntries(carrierId: string): Promise<ComplianceEntry[]> {
  const now = new Date()
  const entries: ComplianceEntry[] = []

  const drivers = await query<{
    id: string; name: string; cdl_expiry: string | null; medical_card_expiry: string | null
  }>(
    `SELECT id, first_name || ' ' || last_name AS name, cdl_expiry, medical_card_expiry
     FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [carrierId]
  )
  for (const driver of drivers) {
    entries.push({
      entity: "driver", entityId: driver.id, name: driver.name, kind: "CDL",
      due: driver.cdl_expiry, color: colorFor(driver.cdl_expiry, now),
      href: `/hub/drivers/${driver.id}`,
    })
    entries.push({
      entity: "driver", entityId: driver.id, name: driver.name, kind: "Medical card",
      due: driver.medical_card_expiry, color: colorFor(driver.medical_card_expiry, now),
      href: `/hub/drivers/${driver.id}`,
    })
  }

  const trucks = await query<{
    id: string; unit_number: string
    registration_expiry: string | null; inspection_due: string | null; insurance_expiry: string | null
  }>(
    `SELECT id, unit_number, registration_expiry, inspection_due, insurance_expiry
     FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'`,
    [carrierId]
  )
  for (const truck of trucks) {
    const name = `Truck #${truck.unit_number}`
    const href = `/hub/fleet/trucks/${truck.id}`
    entries.push({ entity: "truck", entityId: truck.id, name, kind: "Registration", due: truck.registration_expiry, color: colorFor(truck.registration_expiry, now), href })
    entries.push({ entity: "truck", entityId: truck.id, name, kind: "Annual inspection (396.17)", due: truck.inspection_due, color: colorFor(truck.inspection_due, now), href })
    entries.push({ entity: "truck", entityId: truck.id, name, kind: "Insurance", due: truck.insurance_expiry, color: colorFor(truck.insurance_expiry, now), href })
  }

  const trailers = await query<{
    id: string; unit_number: string
    registration_expiry: string | null; inspection_due: string | null
  }>(
    `SELECT id, unit_number, registration_expiry, inspection_due
     FROM hub.trailers WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'`,
    [carrierId]
  )
  for (const trailer of trailers) {
    const name = `Trailer #${trailer.unit_number}`
    const href = `/hub/fleet/trailers/${trailer.id}`
    entries.push({ entity: "trailer", entityId: trailer.id, name, kind: "Registration", due: trailer.registration_expiry, color: colorFor(trailer.registration_expiry, now), href })
    entries.push({ entity: "trailer", entityId: trailer.id, name, kind: "Annual inspection (396.17)", due: trailer.inspection_due, color: colorFor(trailer.inspection_due, now), href })
  }

  // Maintenance schedules due by date and/or mileage, whichever is more urgent
  // — most real PM (oil changes, tire rotations) is "X months or Y miles,
  // whichever comes first," and a mileage-only schedule used to have no due_on
  // at all, so it sat amber forever regardless of how overdue it actually was.
  const maintenance = await query<{
    id: string; truck_id: string; unit_number: string; name: string
    due_on: string | null; interval_miles: number | null; last_done_odometer: string | null
  }>(
    `SELECT ms.id, ms.truck_id, t.unit_number, ms.name, ms.interval_miles, ms.last_done_odometer,
       CASE WHEN ms.interval_days IS NOT NULL AND ms.last_done_on IS NOT NULL
         THEN (ms.last_done_on + (ms.interval_days || ' days')::interval)::date::text
         ELSE NULL END AS due_on
     FROM hub.maintenance_schedules ms JOIN hub.trucks t ON t.id = ms.truck_id AND t.carrier_id = ms.carrier_id
     WHERE ms.carrier_id = $1 AND t.deleted_at IS NULL AND t.status <> 'retired'`,
    [carrierId]
  )
  const odometerByTruck = maintenance.length > 0 ? await truckOdometers(carrierId) : new Map<string, number>()
  for (const schedule of maintenance) {
    const dateColor = schedule.due_on ? colorFor(schedule.due_on, now) : null
    const { color: mileageColor, milesRemaining } = mileageStatus(
      schedule.interval_miles,
      odometerByTruck.get(schedule.truck_id),
      schedule.last_done_odometer != null ? Number(schedule.last_done_odometer) : null
    )
    const color = worseColor(dateColor, mileageColor) ?? "amber"
    const dateGoverns = dateColor !== null && (mileageColor === null || COLOR_SEVERITY[dateColor] <= COLOR_SEVERITY[mileageColor])
    entries.push({
      entity: "truck", entityId: schedule.truck_id, name: `Truck #${schedule.unit_number}`,
      kind: `PM: ${schedule.name}`,
      due: dateGoverns ? schedule.due_on : null,
      dueMiles: !dateGoverns && mileageColor !== null ? milesRemaining : null,
      color,
      href: `/hub/fleet/trucks/${schedule.truck_id}`,
    })
  }

  // Manual company-level items (2290, UCR, IFTA decals, BOC-3, consortium…)
  const manual = await query<{ id: string; kind: string; due_on: string | null; note: string | null }>(
    `SELECT id, kind, due_on, note FROM hub.compliance_items
     WHERE carrier_id = $1 AND status = 'open' AND entity_type = 'company'
     ORDER BY due_on NULLS LAST`,
    [carrierId]
  )
  for (const item of manual) {
    entries.push({
      entity: "company", entityId: null, name: "Company", kind: item.kind,
      due: item.due_on, color: colorFor(item.due_on, now),
      href: "/hub/compliance", manualItemId: item.id,
    })
  }

  const iftaEntries = await iftaFilingComplianceEntries(carrierId)
  entries.push(...iftaEntries)

  // Form 2290 is derived rather than stored: it is annual, fleet-wide, and
  // nobody enters it anywhere, so it only shows up when someone remembers.
  entries.push(...(await form2290ComplianceEntries(carrierId, now)))

  // MCS-150 biennial + UCR annual: derived the same way, from the carrier's
  // own USDOT number and the calendar (see filings.ts for the 390.19 rule).
  entries.push(...(await filingsComplianceEntries(carrierId, now)))

  const order = { red: 0, amber: 1, green: 2 }
  return entries.sort((a, b) => order[a.color] - order[b.color] || String(a.due ?? "9999").localeCompare(String(b.due ?? "9999")))
}

export async function addComplianceItem(
  carrierId: string,
  input: { kind: string; dueOn: string | null; note?: string | null }
): Promise<void> {
  await query(
    `INSERT INTO hub.compliance_items (carrier_id, entity_type, kind, due_on, note)
     VALUES ($1, 'company', $2, $3, $4)`,
    [carrierId, input.kind, input.dueOn, input.note ?? null]
  )
}

export async function resolveComplianceItem(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.compliance_items SET status = 'done', updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id]
  )
}

export interface ComplianceSummary {
  red: number
  amber: number
  green: number
}

export function summarize(entries: ComplianceEntry[]): ComplianceSummary {
  return {
    red: entries.filter((e) => e.color === "red").length,
    amber: entries.filter((e) => e.color === "amber").length,
    green: entries.filter((e) => e.color === "green").length,
  }
}

/**
 * The entries the daily scan pages the office about: the 60/30/7-day warnings,
 * plus anything actually overdue.
 *
 * "Overdue" is the entry's own red, not just a due date in the past. Entries
 * whose module knows the obligation is already met keep their date and go
 * green — a filed IFTA quarter is the common one — and on a bare date test
 * every filed quarter was mailed out as "(EXPIRED)" every single day, forever.
 */
export function alertableEntries(entries: ComplianceEntry[], now = new Date()): ComplianceEntry[] {
  return entries.filter((entry) => {
    if (!entry.due) return false
    const days = Math.ceil((new Date(entry.due).getTime() - now.getTime()) / 86400000)
    if (days < 0) return entry.color === "red"
    return days === 60 || days === 30 || days === 7
  })
}

export interface ComplianceAlertRun {
  alerts: number
  /** An in-app notification was written this run (false = nothing to say, or
   *  a run in the last 20h already said it). */
  notified: boolean
  emailed: boolean
  /** Why no email went out, when none did. */
  reason?: "no_alerts" | "no_office_email" | "not_configured" | "deduped"
}

/**
 * The daily compliance-scan cron, extracted from the route so it reads like
 * every other job there.
 *
 * In-app FIRST, email second, and deliberately so: the office email was the
 * only channel until now, and production SMTP has twice sat on a rejected
 * Gmail app password for a week at a time (535-5.7.8, 2026-08-07→08-13 and
 * again 08-28→09-03). Every one of those runs computed its expiry warnings
 * and then threw them away with the failed send — DOT credentials aged out
 * with nobody told. A notification row costs one INSERT and survives SMTP.
 *
 * The mail failure still throws, on purpose: the run has to stay red so
 * /api/hub/cron/health and the Vercel cron dashboard keep showing the broken
 * credential instead of quietly passing on the in-app copy.
 */
export async function runComplianceAlerts(
  carrierId: string,
  carrierName: string
): Promise<ComplianceAlertRun> {
  const alerts = alertableEntries(await complianceEntries(carrierId))
  if (alerts.length === 0) return { alerts: 0, notified: false, emailed: false, reason: "no_alerts" }

  const lines = alerts.map(
    (a) => `• ${a.name} — ${a.kind}: due ${a.due}${a.color === "red" ? " (EXPIRED)" : ""}`
  )
  const notified = await notifyComplianceAlerts(carrierId, alerts.length, lines)

  const { officeEmail } = (await getCarrierSettings(carrierId)).notifications
  if (!officeEmail) return { alerts: alerts.length, notified, emailed: false, reason: "no_office_email" }

  // Dynamic so nodemailer stays out of the module graph of /hub/compliance,
  // which imports this file for the page itself.
  const { createMailTransport, isEmailConfigured, mailFrom } = await import("@/lib/mailer")
  if (!isEmailConfigured()) {
    return { alerts: alerts.length, notified, emailed: false, reason: "not_configured" }
  }

  try {
    await createMailTransport().sendMail({
      from: mailFrom(`${carrierName} Compliance`),
      to: officeEmail,
      subject: `Compliance alerts: ${alerts.length} item(s) need attention`,
      text: lines.join("\n"),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    throw new Error(
      `compliance alert email failed (${alerts.length} alert(s) delivered in-app instead): ${message}`
    )
  }
  return { alerts: alerts.length, notified, emailed: true }
}

/**
 * One summary notification per carrier per run, deduped over 20 hours so a
 * hand-triggered re-run on top of the daily cron does not double-page the
 * office (same window runHosViolationAlerts uses).
 */
async function notifyComplianceAlerts(
  carrierId: string,
  count: number,
  lines: string[]
): Promise<boolean> {
  const recent = await query(
    `SELECT 1 FROM hub.notifications
     WHERE carrier_id = $1 AND kind = 'compliance_alert'
       AND created_at > NOW() - INTERVAL '20 hours'
     LIMIT 1`,
    [carrierId]
  )
  if (recent.length > 0) return false

  const shown = lines.slice(0, 5)
  await notifyRoles(carrierId, ["owner", "dispatcher"], {
    kind: "compliance_alert",
    title: `${count} compliance item(s) need attention`,
    body: [...shown, lines.length > shown.length ? `…and ${lines.length - shown.length} more` : ""]
      .filter(Boolean)
      .join("\n"),
    link: "/hub/compliance",
  })
  return true
}
