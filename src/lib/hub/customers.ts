import { query, queryOne } from "./db"
import type { Contact, Customer } from "./types"

export interface CustomerWithStats extends Customer {
  load_count: number
  total_revenue_cents: string
  avg_days_to_pay: string | null
}

export async function listCustomers(carrierId: string): Promise<CustomerWithStats[]> {
  return query<CustomerWithStats>(
    `SELECT c.*,
       COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL)::int AS load_count,
       COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents) FILTER (WHERE l.deleted_at IS NULL AND l.status <> 'cancelled'), 0) AS total_revenue_cents,
       (SELECT AVG(p.paid_on - i.issued_on)
          FROM hub.invoices i JOIN hub.payments p ON p.invoice_id = i.id AND p.carrier_id = i.carrier_id
          WHERE i.customer_id = c.id AND i.carrier_id = c.carrier_id) AS avg_days_to_pay
     FROM hub.customers c
     LEFT JOIN hub.loads l ON l.customer_id = c.id AND l.carrier_id = c.carrier_id
     WHERE c.carrier_id = $1 AND c.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY c.name`,
    [carrierId]
  )
}

export async function getCustomer(carrierId: string, id: string): Promise<Customer | null> {
  return queryOne<Customer>(
    `SELECT * FROM hub.customers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, id]
  )
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
  credit_limit_cents?: number | null
  factored: boolean
  status: "active" | "on_hold" | "blacklisted"
  notes?: string | null
}

export async function createCustomer(carrierId: string, input: CustomerInput): Promise<Customer> {
  const rows = await query<Customer>(
    `INSERT INTO hub.customers (
       carrier_id, name, type, mc_number, dot_number, billing_email, billing_address, phone,
       payment_terms_days, credit_limit_cents, factored, status, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      carrierId, input.name, input.type, input.mc_number ?? null, input.dot_number ?? null,
      input.billing_email ?? null, input.billing_address ?? null, input.phone ?? null,
      input.payment_terms_days, input.credit_limit_cents ?? null, input.factored, input.status,
      input.notes ?? null,
    ]
  )
  return rows[0]
}

export async function updateCustomer(carrierId: string, id: string, input: CustomerInput): Promise<Customer | null> {
  const rows = await query<Customer>(
    `UPDATE hub.customers SET
       name=$3, type=$4, mc_number=$5, dot_number=$6, billing_email=$7, billing_address=$8,
       phone=$9, payment_terms_days=$10, credit_limit_cents=$11, factored=$12, status=$13, notes=$14,
       updated_at=NOW()
     WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      carrierId, id, input.name, input.type, input.mc_number ?? null, input.dot_number ?? null,
      input.billing_email ?? null, input.billing_address ?? null, input.phone ?? null,
      input.payment_terms_days, input.credit_limit_cents ?? null, input.factored, input.status,
      input.notes ?? null,
    ]
  )
  return rows[0] ?? null
}

/** Find a customer by exact (case-insensitive) name — used by the importer & parser. */
export async function findCustomerByName(carrierId: string, name: string): Promise<Customer | null> {
  return queryOne<Customer>(
    `SELECT * FROM hub.customers WHERE carrier_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL`,
    [carrierId, name]
  )
}

// ---- Contacts ----

export async function listContacts(customerId: string): Promise<Contact[]> {
  return query<Contact>(
    `SELECT * FROM hub.contacts WHERE customer_id = $1 ORDER BY name`,
    [customerId]
  )
}

export async function createContact(carrierId: string, input: {
  customer_id: string
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
}): Promise<Contact> {
  const rows = await query<Contact>(
    `INSERT INTO hub.contacts (carrier_id, customer_id, name, role, phone, email)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [carrierId, input.customer_id, input.name, input.role ?? null, input.phone ?? null, input.email ?? null]
  )
  return rows[0]
}

export async function deleteContact(carrierId: string, id: string): Promise<void> {
  await query(`DELETE FROM hub.contacts WHERE carrier_id = $1 AND id = $2`, [carrierId, id])
}
