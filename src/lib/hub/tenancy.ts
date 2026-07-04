import { query } from "./db"

/**
 * Cross-table tenancy guard (AGENTS.md standing rule): any id written onto a
 * carrier-scoped row must itself belong to the same carrier. Single-column
 * writes can guard inline with a join (see assignFuelToLoad); this helper
 * covers multi-column writes like load create/update where the load row
 * references customers, drivers, trucks, and trailers at once.
 */
const REF_TABLES = {
  customer_id: { table: "hub.customers", label: "Customer" },
  driver_id: { table: "hub.drivers", label: "Driver" },
  truck_id: { table: "hub.trucks", label: "Truck" },
  trailer_id: { table: "hub.trailers", label: "Trailer" },
} as const

export type CarrierRefField = keyof typeof REF_TABLES

export async function assertCarrierRefs(
  carrierId: string,
  refs: Partial<Record<CarrierRefField, string | null | undefined>>
): Promise<void> {
  for (const field of Object.keys(refs) as CarrierRefField[]) {
    const id = refs[field]
    if (!id) continue
    const { table, label } = REF_TABLES[field]
    const rows = await query<{ id: string }>(
      `SELECT id FROM ${table} WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [carrierId, id]
    )
    if (rows.length === 0) throw new Error(`${label} not found`)
  }
}
