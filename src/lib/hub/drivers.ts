import { query, queryOne } from "./db"
import type { Driver } from "./types"

export async function listDrivers(carrierId: string): Promise<Driver[]> {
  return query<Driver>(
    `SELECT * FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL ORDER BY last_name, first_name`,
    [carrierId]
  )
}

export async function getDriver(carrierId: string, id: string): Promise<Driver | null> {
  return queryOne<Driver>(
    `SELECT * FROM hub.drivers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, id]
  )
}

export interface DriverInput {
  first_name: string
  last_name: string
  phone?: string | null
  email?: string | null
  cdl_number?: string | null
  cdl_state?: string | null
  cdl_expiry?: string | null
  medical_card_expiry?: string | null
  hire_date?: string | null
  pay_type: "per_mile" | "percentage"
  pay_rate: number
  pay_loaded_miles_only?: boolean
  escrow_weekly_cents?: number
  insurance_weekly_cents?: number
  status: "active" | "inactive" | "applicant"
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
}

export async function createDriver(carrierId: string, input: DriverInput): Promise<Driver> {
  const rows = await query<Driver>(
    `INSERT INTO hub.drivers (
       carrier_id, first_name, last_name, phone, email, cdl_number, cdl_state, cdl_expiry,
       medical_card_expiry, hire_date, pay_type, pay_rate, pay_loaded_miles_only,
       escrow_weekly_cents, insurance_weekly_cents, status,
       emergency_contact_name, emergency_contact_phone, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      carrierId, input.first_name, input.last_name, input.phone ?? null, input.email ?? null,
      input.cdl_number ?? null, input.cdl_state ?? null, input.cdl_expiry ?? null,
      input.medical_card_expiry ?? null, input.hire_date ?? null, input.pay_type,
      input.pay_rate, input.pay_loaded_miles_only ?? true,
      input.escrow_weekly_cents ?? 0, input.insurance_weekly_cents ?? 0, input.status,
      input.emergency_contact_name ?? null, input.emergency_contact_phone ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateDriver(carrierId: string, id: string, input: DriverInput): Promise<Driver | null> {
  const rows = await query<Driver>(
    `UPDATE hub.drivers SET
       first_name=$3, last_name=$4, phone=$5, email=$6, cdl_number=$7, cdl_state=$8,
       cdl_expiry=$9, medical_card_expiry=$10, hire_date=$11, pay_type=$12, pay_rate=$13,
       pay_loaded_miles_only=$14, escrow_weekly_cents=$15, insurance_weekly_cents=$16,
       status=$17, emergency_contact_name=$18, emergency_contact_phone=$19, notes=$20,
       updated_at=NOW()
     WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      carrierId, id, input.first_name, input.last_name, input.phone ?? null, input.email ?? null,
      input.cdl_number ?? null, input.cdl_state ?? null, input.cdl_expiry ?? null,
      input.medical_card_expiry ?? null, input.hire_date ?? null, input.pay_type,
      input.pay_rate, input.pay_loaded_miles_only ?? true,
      input.escrow_weekly_cents ?? 0, input.insurance_weekly_cents ?? 0, input.status,
      input.emergency_contact_name ?? null, input.emergency_contact_phone ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

/** Drivers plus expiring-document summary for the compliance-aware roster. */
export interface DriverWithExpiry extends Driver {
  soonest_expiry: string | null
}

export async function listDriversWithExpiry(carrierId: string): Promise<DriverWithExpiry[]> {
  return query<DriverWithExpiry>(
    `SELECT d.*, LEAST(d.cdl_expiry, d.medical_card_expiry) AS soonest_expiry
     FROM hub.drivers d WHERE d.carrier_id = $1 AND d.deleted_at IS NULL
     ORDER BY d.status, d.last_name, d.first_name`,
    [carrierId]
  )
}

/**
 * Dispatch legality (Phase 3): CDL valid + medical card valid + truck not in shop.
 * Warn-only items (expiring soon) are separate from hard stops (expired).
 */
export interface LegalityCheck {
  legal: boolean
  warnings: string[]
  stops: string[]
}

export function dispatchLegality(
  driver: Pick<Driver, "cdl_expiry" | "medical_card_expiry" | "first_name" | "last_name"> | null,
  truck: { status: string; unit_number: string } | null,
  now = new Date()
): LegalityCheck {
  const warnings: string[] = []
  const stops: string[] = []
  const soon = new Date(now.getTime() + 14 * 86400000)

  if (driver) {
    const name = `${driver.first_name} ${driver.last_name}`
    if (driver.cdl_expiry) {
      const expiry = new Date(driver.cdl_expiry)
      if (expiry < now) stops.push(`${name}: CDL expired`)
      else if (expiry < soon) warnings.push(`${name}: CDL expires soon`)
    } else {
      warnings.push(`${name}: CDL expiry not on file`)
    }
    if (driver.medical_card_expiry) {
      const expiry = new Date(driver.medical_card_expiry)
      if (expiry < now) stops.push(`${name}: medical card expired`)
      else if (expiry < soon) warnings.push(`${name}: medical card expires soon`)
    } else {
      warnings.push(`${name}: medical card not on file`)
    }
  }
  if (truck) {
    if (truck.status === "shop") stops.push(`Truck #${truck.unit_number} is in the shop`)
    if (truck.status === "retired") stops.push(`Truck #${truck.unit_number} is retired`)
  }
  return { legal: stops.length === 0, warnings, stops }
}
