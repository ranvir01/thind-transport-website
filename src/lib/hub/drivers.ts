import { query, queryOne } from "./db"
import type { Driver } from "./types"

export async function listDrivers(): Promise<Driver[]> {
  return query<Driver>(
    `SELECT * FROM hub.drivers WHERE deleted_at IS NULL ORDER BY last_name, first_name`
  )
}

export async function getDriver(id: string): Promise<Driver | null> {
  return queryOne<Driver>(`SELECT * FROM hub.drivers WHERE id = $1 AND deleted_at IS NULL`, [id])
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
  status: "active" | "inactive" | "applicant"
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
}

export async function createDriver(input: DriverInput): Promise<Driver> {
  const rows = await query<Driver>(
    `INSERT INTO hub.drivers (
       first_name, last_name, phone, email, cdl_number, cdl_state, cdl_expiry,
       medical_card_expiry, hire_date, pay_type, pay_rate, status,
       emergency_contact_name, emergency_contact_phone, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      input.first_name, input.last_name, input.phone ?? null, input.email ?? null,
      input.cdl_number ?? null, input.cdl_state ?? null, input.cdl_expiry ?? null,
      input.medical_card_expiry ?? null, input.hire_date ?? null, input.pay_type,
      input.pay_rate, input.status, input.emergency_contact_name ?? null,
      input.emergency_contact_phone ?? null, input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateDriver(id: string, input: DriverInput): Promise<Driver | null> {
  const rows = await query<Driver>(
    `UPDATE hub.drivers SET
       first_name=$2, last_name=$3, phone=$4, email=$5, cdl_number=$6, cdl_state=$7,
       cdl_expiry=$8, medical_card_expiry=$9, hire_date=$10, pay_type=$11, pay_rate=$12,
       status=$13, emergency_contact_name=$14, emergency_contact_phone=$15, notes=$16,
       updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id, input.first_name, input.last_name, input.phone ?? null, input.email ?? null,
      input.cdl_number ?? null, input.cdl_state ?? null, input.cdl_expiry ?? null,
      input.medical_card_expiry ?? null, input.hire_date ?? null, input.pay_type,
      input.pay_rate, input.status, input.emergency_contact_name ?? null,
      input.emergency_contact_phone ?? null, input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

/** Drivers plus expiring-document summary for the compliance-aware roster. */
export interface DriverWithExpiry extends Driver {
  soonest_expiry: string | null
}

export async function listDriversWithExpiry(): Promise<DriverWithExpiry[]> {
  return query<DriverWithExpiry>(
    `SELECT d.*, LEAST(d.cdl_expiry, d.medical_card_expiry) AS soonest_expiry
     FROM hub.drivers d WHERE d.deleted_at IS NULL
     ORDER BY d.status, d.last_name, d.first_name`
  )
}
