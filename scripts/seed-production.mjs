#!/usr/bin/env node
/**
 * Production-safe HaulDesk seed.
 *
 * Imports only known owner-provided facts. It never wipes, never creates sample
 * go-live data, and refuses to run without CONFIRM_PRODUCTION_SEED=yes.
 */
import { connect } from "./sandbox-reset.mjs"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const THIND = "11111111-1111-1111-1111-111111111111"
const ATS = "22222222-2222-2222-2222-222222222222"

const templates = {
  "drivers.csv": [
    "company,name,mobile,email,cdl_number,cdl_state,cdl_expiry,medical_card_expiry,pay_tariff,truck_unit,contractor_type,advance_balance,escrow_held,notes",
    "Thind Transport LLC,Example Driver,(206) 555-0000,driver@example.com,SAMPLE123,WA,2027-12-31,2027-06-30,OO-88,TT-101,owner_operator_1099,0.00,0.00,replace this example row",
  ].join("\n"),
  "trucks.csv": [
    "company,unit_number,vin,year,make,model,type,eld_device_id,fuel_card_last4,tank_gallons,ownership,current_odometer,registration_expiry,inspection_due,insurance_expiry,notes",
    "Thind Transport LLC,TT-101,SAMPLEVIN123,2024,Freightliner,Cascadia,reefer,ELD-SAMPLE,1234,240,company,100000,2027-12-31,2027-06-30,2027-09-30,replace this example row",
  ].join("\n"),
  "trailers.csv": [
    "company,unit_number,vin,year,make,type,registration_expiry,inspection_due,notes",
    "Thind Transport LLC,TTR-101,SAMPLETRL123,2022,Utility,reefer,2027-12-31,2027-06-30,replace this example row",
  ].join("\n"),
  "customers.csv": [
    "company,name,type,mc_number,dot_number,billing_email,billing_address,phone,payment_terms_days,credit_limit,factored,status,primary_contact,tracking_app,notes",
    "Thind Transport LLC,Example Broker,broker,123456,,ap@examplebroker.com,\"123 AP St, Seattle WA\",(206) 555-0100,30,25000.00,Y,active,Jane Broker,MacroPoint,replace this example row",
  ].join("\n"),
  "pay-tariffs.csv": [
    "company,name,contractor_type,pay_type,percent_rate,loaded_rate,empty_rate,fsc_passthrough_percent,plain_english,recurring_deductions,accessorial_rules",
    "Thind Transport LLC,OO-88,owner_operator_1099,percentage,88,,,100,\"Owner-operator gets 88% of linehaul + 100% FSC.\",\"$312 insurance weekly; $45 ELD weekly\",\"Detention/lumper pass through when broker pays\"",
  ].join("\n"),
  "recurring-transactions.csv": [
    "company,driver_name,category,label,amount,cadence,starts_on,ends_on,notes",
    "Thind Transport LLC,Example Driver,Insurance,Weekly insurance,312.00,weekly,2026-01-01,,replace this example row",
  ].join("\n"),
  "open-ar.csv": [
    "company,broker,invoice_number,load_reference,amount,issued_on,due_on,status,factored,notes",
    "Thind Transport LLC,Example Broker,TT-2026-0001,LOAD-123,2500.00,2026-06-01,2026-07-01,sent,Y,replace this example row",
  ].join("\n"),
  "loadboard.csv": [
    "company,reference,broker,broker_ref,status,equipment,origin_city,origin_state,dest_city,dest_state,pickup_at,delivery_at,linehaul,fuel_surcharge,loaded_miles,deadhead_miles,driver,truck,trailer,source,notes",
    "Thind Transport LLC,TT-LOAD-1,Example Broker,BR-1,booked,reefer,Kent,WA,Fresno,CA,2026-06-20 08:00,2026-06-22 14:00,3200.00,350.00,870,25,Example Driver,TT-101,TTR-101,DAT,replace this example row",
  ].join("\n"),
  "fuel.csv": [
    "company,transaction_id,date_time,truck_unit,driver_name,merchant,city,jurisdiction,gallons,fuel_type,unit_price,total,odometer,card_program",
    "Thind Transport LLC,FUEL-1,2026-06-01 10:30,TT-101,Example Driver,Example Fuel Stop,Kent,WA,95.123,diesel,4.35,413.79,100500,EFS",
  ].join("\n"),
  "tolls.csv": [
    "company,transaction_id,date_time,truck_unit,transponder,plaza,jurisdiction,total",
    "Thind Transport LLC,TOLL-1,2026-06-01 12:30,TT-101,SAMPLE-TX,Tacoma Narrows,WA,18.50",
  ].join("\n"),
}

function writeImportTemplates() {
  const dir = path.join(process.cwd(), "docs", "production-intake", "templates")
  mkdirSync(dir, { recursive: true })
  for (const [file, csv] of Object.entries(templates)) {
    writeFileSync(path.join(dir, file), `${csv}\n`)
  }
  console.log(`✓ Wrote ${Object.keys(templates).length} production import template(s) to docs/production-intake/templates`)
}

async function main() {
  if (process.env.CONFIRM_PRODUCTION_SEED !== "yes") {
    throw new Error("Refusing to seed production without CONFIRM_PRODUCTION_SEED=yes")
  }
  writeImportTemplates()

  const client = await connect()
  if (!client) {
    throw new Error("POSTGRES_URL is required for production seed. Built-in fallback is sandbox-only and never writes go-live records.")
  }
  const q = (text, params = []) => client.query(text, params)
  try {
    await q("BEGIN")
    await q(
      `INSERT INTO hub.carriers (
        id, name, legal_name, display_name, dot_number, mc_number, phone, email,
        address, environment, invoice_prefix
      ) VALUES (
        $1,'Thind Transport LLC','Thind Transport LLC','Thind','2523064','876103',
        '(206) 765-6300','thindcarrier@gmail.com','PO Box 5114, Kent, WA 98064','production','TT-'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        dot_number = EXCLUDED.dot_number,
        mc_number = EXCLUDED.mc_number,
        phone = EXCLUDED.phone,
        environment = 'production'`,
      [THIND]
    )
    await q(
      `INSERT INTO hub.carriers (
        id, name, legal_name, display_name, phone, environment, invoice_prefix
      ) VALUES (
        $1,'ATS Transport LLC','ATS Transport LLC','ATS','(253) 410-7259','production','ATS-'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        phone = EXCLUDED.phone,
        environment = 'production'`,
      [ATS]
    )

    await q(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = hub.carrier_settings.settings || EXCLUDED.settings,
         updated_at = NOW()`,
      [
        THIND,
        JSON.stringify({
          knownFacts: { dot: "2523064", mc: "876103", phone: "(206) 765-6300" },
          invoice: { prefix: "TT-", nextNumber: 1001, defaultTermsDays: 30 },
          factoring: { company: null, remitName: null, remitAddress: null, email: null, feeBps: null, reserveBps: null },
          notifications: { officeEmail: null },
        }),
      ]
    )
    await q(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = hub.carrier_settings.settings || EXCLUDED.settings,
         updated_at = NOW()`,
      [
        ATS,
        JSON.stringify({
          knownFacts: { dot: null, mc: null, phone: "(253) 410-7259" },
          invoice: { prefix: "ATS-", nextNumber: 1001, defaultTermsDays: 30 },
          factoring: { company: null, remitName: null, remitAddress: null, email: null, feeBps: null, reserveBps: null },
          notifications: { officeEmail: null },
        }),
      ]
    )

    const blockers = [
      ["smtp", "SMTP app password", "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL in Vercel Production env."],
      ["factoring", "Factoring remit-to + fee %", "Open Hub → Onboarding → Invoice branding & factoring for each company."],
      ["pay-tariffs", "Driver pay rules", "Open Hub → Onboarding → Pay tariffs and enter each rule in plain English."],
      ["fuel-csvs", "Last full quarter fuel CSVs", "Open Hub → Import → Fuel and upload EFS/WEX/Comdata CSVs."],
    ]
    for (const carrierId of [THIND, ATS]) {
      for (const [key, label, note] of blockers) {
        await q(
          `INSERT INTO hub.onboarding_items (carrier_id, data_mode, section, item_key, label, status, note, app_path, env_var)
           VALUES ($1,'production','Launch blockers',$2,$3,'blocked',$4,$5,$6)
           ON CONFLICT (carrier_id, item_key) DO UPDATE SET
             label = EXCLUDED.label,
             note = EXCLUDED.note,
             app_path = EXCLUDED.app_path,
             env_var = EXCLUDED.env_var,
             updated_at = NOW()`,
          [
            carrierId,
            key,
            label,
            note,
            key === "fuel-csvs" ? "/hub/import" : "/hub/onboarding",
            key === "smtp" ? "SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/FROM_EMAIL" : null,
          ]
        )
      }
    }

    await q("COMMIT")
    console.log("✓ Production carrier settings upserted safely.")
    console.log("  No loads, drivers, customers, invoices, or settlements were fabricated.")
  } catch (error) {
    await q("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`Production seed failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
