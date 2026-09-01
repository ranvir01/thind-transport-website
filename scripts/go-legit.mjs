/**
 * Wipe the generated SIMULATION world and enter LEGIT mode.
 *
 * Leaves hub.platform_state in place (mode=legit). Operational tables are
 * truncated. Thind's carrier row is re-inserted empty so a later sim:seed
 * can reuse the fixed UUID. Then visit /hub/signup to create the real workspace.
 *
 *   npm run go-legit          (interactive confirm)
 *   npm run go-legit -- --yes (scripts / CI)
 */
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import pg from "pg"
import { loadEnvLocal } from "./env-local.mjs"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

async function confirm() {
  if (process.argv.includes("--yes") || process.env.GO_LEGIT_YES === "1") return true
  const rl = readline.createInterface({ input, output })
  try {
    const answer = await rl.question(
      "This DELETES the generated Thind + ATS simulation (loads, invoices, users).\nType DELETE SIMULATION to continue: "
    )
    return answer.trim() === "DELETE SIMULATION"
  } finally {
    rl.close()
  }
}

async function main() {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL required")
  if (
    !process.env.GO_LEGIT_OK &&
    (process.env.VERCEL_ENV === "production" || /thindtransport|prod/i.test(url))
  ) {
    throw new Error(
      "Refusing to wipe what looks like production. Set GO_LEGIT_OK=1 to override."
    )
  }
  if (!(await confirm())) {
    console.log("Aborted.")
    process.exit(1)
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  try {
    const operational = [
      "audit_log", "integration_syncs", "api_credentials", "integration_events",
      "claims", "incidents", "maintenance_records", "maintenance_schedules",
      "compliance_items", "ifta_reports", "jurisdiction_miles", "toll_transactions",
      "fuel_transactions", "escrow_ledger", "advances", "settlement_lines",
      "expenses", "settlements", "payments", "invoices", "crm_activities",
      "position_pings", "documents", "share_links", "import_templates",
      "load_events", "stops", "loads", "contacts", "users", "trucks", "trailers",
      "drivers", "customers", "facility_notes", "facilities", "pay_rules",
      "notifications", "push_subscriptions", "tasks", "message_reads",
      "messages", "message_threads", "message_templates", "announcement_acks",
      "announcements", "document_requests", "lanes", "time_off_requests",
      "email_outbox",
    ]
    const { rows: existing } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'hub'`
    )
    const have = new Set(existing.map((r) => r.tablename))
    const list = operational.filter((t) => have.has(t)).map((t) => `hub.${t}`)
    if (list.length === 0) throw new Error("No hub tables found — run npm run db:migrate first")
    await client.query(`TRUNCATE ${list.join(", ")} RESTART IDENTITY CASCADE`)

    await client.query(`DELETE FROM hub.carriers WHERE id <> $1`, [
      "11111111-1111-1111-1111-111111111111",
    ])

    await client.query(
      `INSERT INTO hub.carriers (id, name, dot_number, mc_number, phone, email, address)
       VALUES (
         '11111111-1111-1111-1111-111111111111',
         'Thind Transport', '2523064', '876103', '(206) 765-6300',
         'thindcarrier@gmail.com', 'PO Box 5114, Kent, WA 98064'
       )
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, dot_number = EXCLUDED.dot_number, mc_number = EXCLUDED.mc_number,
         phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, status = 'active'`
    )
    await client.query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES (
         '11111111-1111-1111-1111-111111111111',
         '{"invoice":{"prefix":"THD-INV-","nextNumber":1001,"defaultTermsDays":30}}'
       )
       ON CONFLICT (carrier_id) DO UPDATE SET settings = EXCLUDED.settings`
    )

    await client.query(
      `INSERT INTO hub.platform_state (id, mode, sim_seed, sim_clock_date, generated_at, updated_at)
       VALUES (1, 'legit', NULL, NULL, NULL, NOW())
       ON CONFLICT (id) DO UPDATE SET
         mode = 'legit',
         sim_seed = NULL,
         sim_clock_date = NULL,
         generated_at = NULL,
         updated_at = NOW()`
    )
  } finally {
    await client.end()
  }

  console.log("LEGIT mode. The generated world is gone.")
  console.log("  Next: npm run dev → http://localhost:3000/hub/signup")
  console.log("  Guards (email, ELD, fuel, QBO) lift as credentials land.")
  console.log("  To restore the sim: npm run sim:seed")
}

main().catch((err) => {
  console.error("go-legit failed:", err)
  process.exit(1)
})
