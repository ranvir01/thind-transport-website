import { query, queryOne } from "./db"
import type { Contact, Customer } from "./types"

export interface CustomerWithStats extends Customer {
  load_count: number
  total_revenue: string
}

export async function listCustomers(): Promise<CustomerWithStats[]> {
  return query<CustomerWithStats>(
    `SELECT c.*,
       COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL)::int AS load_count,
       COALESCE(SUM(l.linehaul + l.fuel_surcharge) FILTER (WHERE l.deleted_at IS NULL AND l.status <> 'cancelled'), 0) AS total_revenue
     FROM hub.customers c
     LEFT JOIN hub.loads l ON l.customer_id = c.id
     WHERE c.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY c.name`
  )
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return queryOne<Customer>(`SELECT * FROM hub.customers WHERE id = $1 AND deleted_at IS NULL`, [id])
}

export interface CustomerInput {
  name: string
  type: "broker" | "shipper"
  mc_number?: string | null
  dot_number?: string | null
  billing_email?: string | null
  billing_address?: string | null
  phone?: string | null
  payment_terms_days: number
  credit_limit?: number | null
  factored: boolean
  status: "active" | "on_hold" | "blacklisted"
  notes?: string | null
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const rows = await query<Customer>(
    `INSERT INTO hub.customers (
       name, type, mc_number, dot_number, billing_email, billing_address, phone,
       payment_terms_days, credit_limit, factored, status, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.name, input.type, input.mc_number ?? null, input.dot_number ?? null,
      input.billing_email ?? null, input.billing_address ?? null, input.phone ?? null,
      input.payment_terms_days, input.credit_limit ?? null, input.factored, input.status,
      input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer | null> {
  const rows = await query<Customer>(
    `UPDATE hub.customers SET
       name=$2, type=$3, mc_number=$4, dot_number=$5, billing_email=$6, billing_address=$7,
       phone=$8, payment_terms_days=$9, credit_limit=$10, factored=$11, status=$12, notes=$13,
       updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id, input.name, input.type, input.mc_number ?? null, input.dot_number ?? null,
      input.billing_email ?? null, input.billing_address ?? null, input.phone ?? null,
      input.payment_terms_days, input.credit_limit ?? null, input.factored, input.status,
      input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

/** Find a customer by exact (case-insensitive) name — used by the importer. */
export async function findCustomerByName(name: string): Promise<Customer | null> {
  return queryOne<Customer>(
    `SELECT * FROM hub.customers WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
    [name]
  )
}

// ---- Contacts ----

export async function listContacts(customerId: string): Promise<Contact[]> {
  return query<Contact>(
    `SELECT * FROM hub.contacts WHERE customer_id = $1 ORDER BY name`,
    [customerId]
  )
}

export async function createContact(input: {
  customer_id: string
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
}): Promise<Contact> {
  const rows = await query<Contact>(
    `INSERT INTO hub.contacts (customer_id, name, role, phone, email)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [input.customer_id, input.name, input.role ?? null, input.phone ?? null, input.email ?? null]
  )
  return rows[0]
}

export async function deleteContact(id: string): Promise<void> {
  await query(`DELETE FROM hub.contacts WHERE id = $1`, [id])
}
