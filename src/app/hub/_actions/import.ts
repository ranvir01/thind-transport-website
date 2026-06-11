"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { createLoad } from "@/lib/hub/loads"
import { findCustomerByName, createCustomer } from "@/lib/hub/customers"
import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import {
  parseMoney, parseIntSafe, normalizeEquipment, normalizeState, parseDateSafe,
  type ImportRow,
} from "@/lib/hub/csv"

export interface ImportResult {
  ok: boolean
  imported: number
  failed: { row: number; error: string }[]
  customersCreated: number
}

/**
 * Import historical loads from the mapped Excel/CSV rows. Customers are
 * created on the fly by name; drivers/trucks are matched when names line up.
 * History lands as `settled` so it never enters the active dispatch flow.
 */
export async function importLoadsAction(
  rows: ImportRow[],
  options: { asHistory: boolean }
): Promise<ImportResult> {
  const user = await requireOfficeUser()
  const failed: { row: number; error: string }[] = []
  let imported = 0
  let customersCreated = 0

  const customerCache = new Map<string, string>()
  const drivers = await query<{ id: string; name: string }>(
    `SELECT id, LOWER(first_name || ' ' || last_name) AS name FROM hub.drivers WHERE deleted_at IS NULL`
  )
  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE deleted_at IS NULL`
  )

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row.customer_name?.trim()
      if (!name) throw new Error("Missing customer name")
      if (!row.origin_city?.trim() || !row.dest_city?.trim()) throw new Error("Missing origin or destination")

      let customerId = customerCache.get(name.toLowerCase())
      if (!customerId) {
        const existing = await findCustomerByName(name)
        if (existing) {
          customerId = existing.id
        } else {
          const created = await createCustomer({
            name, type: "broker", payment_terms_days: 30, factored: false, status: "active",
          })
          customerId = created.id
          customersCreated++
        }
        customerCache.set(name.toLowerCase(), customerId)
      }

      const driverId = row.driver_name
        ? drivers.find((d) => d.name === row.driver_name!.trim().toLowerCase())?.id ?? null
        : null
      const truckId = row.truck_unit
        ? trucks.find((t) => t.unit_number === row.truck_unit!.trim())?.id ?? null
        : null

      await createLoad(
        {
          customer_id: customerId,
          customer_reference: row.customer_reference?.trim() || null,
          status: options.asHistory ? "settled" : "booked",
          equipment: normalizeEquipment(row.equipment),
          commodity: row.commodity?.trim() || null,
          weight_lbs: parseIntSafe(row.weight_lbs),
          linehaul: parseMoney(row.linehaul),
          fuel_surcharge: parseMoney(row.fuel_surcharge),
          accessorials: [],
          loaded_miles: parseIntSafe(row.loaded_miles),
          driver_id: driverId,
          truck_id: truckId,
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
    actorId: user.id, actorName: user.name,
    entityType: "import", entityId: new Date().toISOString(),
    action: "import_loads", newValue: { imported, failed: failed.length, customersCreated },
  })

  revalidatePath("/hub/loads")
  revalidatePath("/hub/customers")
  revalidatePath("/hub")
  return { ok: failed.length === 0, imported, failed, customersCreated }
}
