"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { createLoad } from "@/lib/hub/loads"
import { findCustomerByName, createCustomer } from "@/lib/hub/customers"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { classifyFuelUse } from "@/lib/hub/fuel-core"
import { dollarsToCents } from "@/lib/hub/types"
import {
  parseIntSafe, normalizeEquipment, normalizeState, parseDateSafe,
  type ImportRow,
} from "@/lib/hub/csv"

export interface ImportResult {
  ok: boolean
  imported: number
  failed: { row: number; error: string }[]
  customersCreated?: number
  skippedDuplicates?: number
}

type GenericRow = Record<string, string>

async function truckMap(carrierId: string): Promise<Map<string, string>> {
  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  return new Map(trucks.map((t) => [t.unit_number.toLowerCase(), t.id]))
}

async function driverMap(carrierId: string): Promise<Map<string, string>> {
  const drivers = await query<{ id: string; name: string }>(
    `SELECT id, LOWER(first_name || ' ' || last_name) AS name FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  return new Map(drivers.map((d) => [d.name, d.id]))
}

function rowFingerprint(row: GenericRow): string {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 32)
}

/** Save/refresh a column-mapping template for one-click re-imports. */
export async function saveImportTemplateAction(
  kind: "loads" | "fuel" | "tolls" | "positions",
  name: string,
  mapping: Record<string, number | undefined>
): Promise<{ ok: boolean; error?: string }> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Forbidden" }
  }
  if (!name.trim()) return { ok: false, error: "Template needs a name" }
  await query(
    `INSERT INTO hub.import_templates (carrier_id, kind, name, mapping)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (carrier_id, kind, name) DO UPDATE SET mapping = $4, updated_at = NOW()`,
    [user.carrierId, kind, name.trim(), JSON.stringify(mapping)]
  )
  return { ok: true }
}

export async function listImportTemplatesAction(kind: string) {
  const user = await requirePermission("imports:run")
  return query<{ id: string; name: string; mapping: Record<string, number> }>(
    `SELECT id, name, mapping FROM hub.import_templates WHERE carrier_id = $1 AND kind = $2 ORDER BY name`,
    [user.carrierId, kind]
  )
}

// ---- Loads (historical Excel) ----

export async function importLoadsAction(
  rows: ImportRow[],
  options: { asHistory: boolean }
): Promise<ImportResult> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : "Forbidden" }] }
  }
  const failed: { row: number; error: string }[] = []
  let imported = 0
  let customersCreated = 0

  const customerCache = new Map<string, string>()
  const drivers = await driverMap(user.carrierId)
  const trucks = await truckMap(user.carrierId)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row.customer_name?.trim()
      if (!name) throw new Error("Missing customer name")
      if (!row.origin_city?.trim() || !row.dest_city?.trim()) throw new Error("Missing origin or destination")

      let customerId = customerCache.get(name.toLowerCase())
      if (!customerId) {
        const existing = await findCustomerByName(user.carrierId, name)
        if (existing) {
          customerId = existing.id
        } else {
          const created = await createCustomer(user.carrierId, {
            name, type: "broker", payment_terms_days: 30, factored: false, status: "active",
          })
          customerId = created.id
          customersCreated++
        }
        customerCache.set(name.toLowerCase(), customerId)
      }

      await createLoad(
        user.carrierId,
        {
          customer_id: customerId,
          customer_reference: row.customer_reference?.trim() || null,
          status: options.asHistory ? "settled" : "booked",
          equipment: normalizeEquipment(row.equipment),
          commodity: row.commodity?.trim() || null,
          weight_lbs: parseIntSafe(row.weight_lbs),
          linehaul_cents: dollarsToCents(row.linehaul),
          fuel_surcharge_cents: dollarsToCents(row.fuel_surcharge),
          accessorials: [],
          loaded_miles: parseIntSafe(row.loaded_miles),
          driver_id: row.driver_name ? drivers.get(row.driver_name.trim().toLowerCase()) ?? null : null,
          truck_id: row.truck_unit ? trucks.get(row.truck_unit.trim().toLowerCase()) ?? null : null,
          source: "import",
          notes: row.notes?.trim() || null,
          stops: [
            {
              type: "pickup",
              city: row.origin_city.trim(),
              state: normalizeState(row.origin_state ?? ""),
              appt_start: parseDateSafe(row.pickup_date),
            },
            {
              type: "delivery",
              city: row.dest_city.trim(),
              state: normalizeState(row.dest_state ?? ""),
              appt_start: parseDateSafe(row.delivery_date),
            },
          ],
        },
        { id: user.id, name: user.name }
      )
      imported++
    } catch (err) {
      failed.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  await logAudit({
    carrierId: user.carrierId, actorId: user.id, actorName: user.name,
    entityType: "import", entityId: new Date().toISOString(),
    action: "import_loads", newValue: { imported, failed: failed.length, customersCreated },
  })

  revalidatePath("/hub/loads")
  revalidatePath("/hub/customers")
  revalidatePath("/hub")
  return { ok: failed.length === 0, imported, failed, customersCreated }
}

// ---- Fuel ----

export async function importFuelAction(rows: GenericRow[], program: string): Promise<ImportResult> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : "Forbidden" }] }
  }
  const failed: { row: number; error: string }[] = []
  let imported = 0
  let skippedDuplicates = 0
  const trucks = await truckMap(user.carrierId)
  const drivers = await driverMap(user.carrierId)
  const source = `csv:${program || "fuel"}`

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const ts = parseDateSafe(row.ts)
      if (!ts) throw new Error("Bad date")
      const gallons = Number(row.gallons?.replace(/[^0-9.]/g, ""))
      if (!Number.isFinite(gallons) || gallons <= 0) throw new Error("Bad gallons")
      const totalCents = dollarsToCents(row.total)
      if (totalCents <= 0) throw new Error("Bad total")
      const externalId = row.external_id?.trim() || rowFingerprint(row)

      const result = await query<{ id: string }>(
        `INSERT INTO hub.fuel_transactions (
           carrier_id, source, external_id, card_program, truck_id, driver_id, ts, merchant, city,
           jurisdiction, gallons, fuel_type, fuel_use, unit_price_cents, total_cents, odometer, raw
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (carrier_id, source, external_id) DO NOTHING
         RETURNING id`,
        [
          user.carrierId, source, externalId, program || row.card_program || null,
          row.truck_unit ? trucks.get(row.truck_unit.trim().toLowerCase()) ?? null : null,
          row.driver_name ? drivers.get(row.driver_name.trim().toLowerCase()) ?? null : null,
          ts, row.merchant?.trim() || null, row.city?.trim() || null,
          row.jurisdiction ? normalizeState(row.jurisdiction) : null,
          gallons, row.fuel_type?.trim() || "diesel",
          // Reefer fuel is IFTA-exempt — classify at intake, reviewable later.
          classifyFuelUse(row.fuel_type),
          row.unit_price ? dollarsToCents(row.unit_price) : null,
          totalCents,
          row.odometer ? Number(row.odometer.replace(/[^0-9.]/g, "")) || null : null,
          JSON.stringify(row),
        ]
      )
      if (result.length === 0) skippedDuplicates++
      else imported++
    } catch (err) {
      failed.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }
  await logAudit({
    carrierId: user.carrierId, actorId: user.id, actorName: user.name,
    entityType: "import", entityId: new Date().toISOString(),
    action: "import_fuel", newValue: { imported, failed: failed.length, skippedDuplicates },
  })
  revalidatePath("/hub/fuel")
  return { ok: failed.length === 0, imported, failed, skippedDuplicates }
}

// ---- Tolls ----

export async function importTollsAction(rows: GenericRow[], program: string): Promise<ImportResult> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : "Forbidden" }] }
  }
  const failed: { row: number; error: string }[] = []
  let imported = 0
  let skippedDuplicates = 0
  const trucks = await truckMap(user.carrierId)
  const source = `csv:${program || "tolls"}`

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const ts = parseDateSafe(row.ts)
      if (!ts) throw new Error("Bad date")
      const amountCents = dollarsToCents(row.total)
      if (amountCents <= 0) throw new Error("Bad amount")
      const externalId = row.external_id?.trim() || rowFingerprint(row)
      const result = await query<{ id: string }>(
        `INSERT INTO hub.toll_transactions (carrier_id, source, external_id, transponder, truck_id, ts, plaza, jurisdiction, amount_cents, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (carrier_id, source, external_id) DO NOTHING RETURNING id`,
        [
          user.carrierId, source, externalId, row.transponder?.trim() || null,
          row.truck_unit ? trucks.get(row.truck_unit.trim().toLowerCase()) ?? null : null,
          ts, row.plaza?.trim() || null,
          row.jurisdiction ? normalizeState(row.jurisdiction) : null,
          amountCents, JSON.stringify(row),
        ]
      )
      if (result.length === 0) skippedDuplicates++
      else imported++
    } catch (err) {
      failed.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }
  await logAudit({
    carrierId: user.carrierId, actorId: user.id, actorName: user.name,
    entityType: "import", entityId: new Date().toISOString(),
    action: "import_tolls", newValue: { imported, failed: failed.length, skippedDuplicates },
  })
  revalidatePath("/hub/fuel")
  return { ok: failed.length === 0, imported, failed, skippedDuplicates }
}

// ---- Positions (ELD export) ----

export async function importPositionsAction(rows: GenericRow[]): Promise<ImportResult> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : "Forbidden" }] }
  }
  const failed: { row: number; error: string }[] = []
  let imported = 0
  const trucks = await truckMap(user.carrierId)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const truckId = trucks.get(row.truck_unit?.trim().toLowerCase() ?? "")
      if (!truckId) throw new Error(`Unknown truck unit "${row.truck_unit}"`)
      const ts = parseDateSafe(row.ts)
      if (!ts) throw new Error("Bad date")
      const lat = Number(row.lat)
      const lng = Number(row.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Bad coordinates")
      await query(
        `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, odometer, source)
         VALUES ($1,$2,$3,$4,$5,$6,'import')`,
        [user.carrierId, truckId, ts, lat, lng, row.odometer ? Number(row.odometer) || null : null]
      )
      imported++
    } catch (err) {
      failed.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }
  revalidatePath("/hub/map")
  return { ok: failed.length === 0, imported, failed }
}

// ---- IFTA mileage (TruckX-style jurisdiction summary) ----

export async function importMileageAction(rows: GenericRow[]): Promise<ImportResult> {
  let user
  try {
    user = await requirePermission("imports:run")
  } catch (err) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : "Forbidden" }] }
  }
  const failed: { row: number; error: string }[] = []
  let imported = 0
  const trucks = await truckMap(user.carrierId)
  const { randomUUID } = await import("crypto")
  const runId = randomUUID()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const truckId = trucks.get(row.truck_unit?.trim().toLowerCase() ?? "")
      if (!truckId) throw new Error(`Unknown truck unit "${row.truck_unit}"`)
      const quarter = row.quarter?.trim().toUpperCase()
      if (!/^\d{4}Q[1-4]$/.test(quarter ?? "")) throw new Error("Bad quarter (use 2026Q2)")
      const miles = Number(row.miles?.replace(/[^0-9.]/g, ""))
      if (!Number.isFinite(miles) || miles < 0) throw new Error("Bad miles")
      await query(
        `INSERT INTO hub.jurisdiction_miles (carrier_id, run_id, truck_id, quarter, jurisdiction, miles, source)
         VALUES ($1,$2,$3,$4,$5,$6,'import')`,
        [user.carrierId, runId, truckId, quarter, normalizeState(row.jurisdiction ?? ""), miles]
      )
      imported++
    } catch (err) {
      failed.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }
  revalidatePath("/hub/compliance/ifta")
  return { ok: failed.length === 0, imported, failed }
}
