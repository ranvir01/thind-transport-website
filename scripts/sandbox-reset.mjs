#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import pg from "pg"

export const SANDBOX_CARRIERS = [
  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
]

export function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

export async function connect() {
  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL is required. Run this against your local/dev Postgres, never production go-live data.")
  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  return client
}

export async function resetSandbox(client) {
  const carrierIds = SANDBOX_CARRIERS
  const q = (text, params = []) => client.query(text, params)

  await q("BEGIN")
  try {
    await q(`DELETE FROM hub.integration_syncs WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.claims WHERE data_mode = 'sandbox' OR load_id IN (SELECT id FROM hub.loads WHERE carrier_id = ANY($1::uuid[]))`, [carrierIds])
    await q(`DELETE FROM hub.incidents WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.maintenance_records WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.maintenance_schedules WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.compliance_items WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.ifta_reports WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.jurisdiction_miles WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.toll_transactions WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.fuel_transactions WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.escrow_ledger WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.advances WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.settlement_lines WHERE data_mode = 'sandbox' OR settlement_id IN (SELECT id FROM hub.settlements WHERE carrier_id = ANY($1::uuid[]))`, [carrierIds])
    await q(`DELETE FROM hub.expenses WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.settlements WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.payments WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.invoices WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.load_candidates WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.crm_activities WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.position_pings WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.documents WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.share_links WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.import_templates WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.load_events WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.stops WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.loads WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.contacts WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.user_carrier_access WHERE carrier_id = ANY($1::uuid[]) OR user_id IN (SELECT id FROM hub.users WHERE data_mode = 'sandbox')`, [carrierIds])
    await q(`DELETE FROM hub.recurring_transactions WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.revenue_categories WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.debit_categories WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`UPDATE hub.drivers SET pay_tariff_id = NULL WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.pay_tariffs WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.trucks WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.trailers WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.drivers WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.customers WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.users WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.onboarding_items WHERE data_mode = 'sandbox' OR carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.accessorial_types WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.carrier_settings WHERE carrier_id = ANY($1::uuid[])`, [carrierIds])
    await q(`DELETE FROM hub.carriers WHERE environment = 'sandbox' OR id = ANY($1::uuid[])`, [carrierIds])
    await q("COMMIT")
  } catch (error) {
    await q("ROLLBACK")
    throw error
  }
}

async function main() {
  const client = await connect()
  try {
    await resetSandbox(client)
    console.log("✓ Sandbox reset complete. Production carriers/data were not touched.")
  } finally {
    await client.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Sandbox reset failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
