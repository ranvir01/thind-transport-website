import { query, queryOne } from "./db"
import { iftaDueDate, lastCompletedQuarterKey } from "./ifta-core"

export type ComplianceColor = "red" | "amber" | "green"

export interface ComplianceEntry {
  entity: "driver" | "truck" | "trailer" | "company"
  entityId: string | null
  name: string
  kind: string
  due: string | null
  color: ComplianceColor
  href: string
  manualItemId?: string
}

/** Auto-entry for the quarter whose filing is actually due (mirrors IFTA screen default). */
export async function iftaFilingComplianceEntry(
  carrierId: string,
  now: Date
): Promise<ComplianceEntry | null> {
  const quarter = lastCompletedQuarterKey(now)
  const report = await queryOne<{ status: string }>(
    `SELECT status FROM hub.ifta_reports WHERE carrier_id = $1 AND quarter = $2`,
    [carrierId, quarter]
  )
  if (report?.status === "filed") return null

  const due = iftaDueDate(quarter).toISOString().slice(0, 10)
  return {
    entity: "company",
    entityId: null,
    name: "Company",
    kind: `IFTA filing (${quarter})`,
    due,
    color: colorFor(due, now),
    href: `/hub/compliance/ifta?q=${quarter}`,
  }
}

function colorFor(due: string | null, now: Date): ComplianceColor {
  if (!due) return "amber"
  const dueDate = new Date(due)
  if (dueDate < now) return "red"
  if (dueDate.getTime() - now.getTime() < 30 * 86400000) return "amber"
  return "green"
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

  // Maintenance schedules due by date
  const maintenance = await query<{ id: string; truck_id: string; unit_number: string; name: string; due_on: string | null }>(
    `SELECT ms.id, ms.truck_id, t.unit_number, ms.name,
       CASE WHEN ms.interval_days IS NOT NULL AND ms.last_done_on IS NOT NULL
         THEN (ms.last_done_on + (ms.interval_days || ' days')::interval)::date::text
         ELSE NULL END AS due_on
     FROM hub.maintenance_schedules ms JOIN hub.trucks t ON t.id = ms.truck_id
     WHERE ms.carrier_id = $1 AND t.deleted_at IS NULL AND t.status <> 'retired'`,
    [carrierId]
  )
  for (const schedule of maintenance) {
    entries.push({
      entity: "truck", entityId: schedule.truck_id, name: `Truck #${schedule.unit_number}`,
      kind: `PM: ${schedule.name}`, due: schedule.due_on, color: colorFor(schedule.due_on, now),
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

  const iftaEntry = await iftaFilingComplianceEntry(carrierId, now)
  if (iftaEntry) entries.push(iftaEntry)

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
