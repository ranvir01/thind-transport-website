#!/usr/bin/env node
/**
 * Production-safe HaulDesk seed.
 *
 * Imports only known owner-provided facts. It never wipes, never creates sample
 * go-live data, and refuses to run without CONFIRM_PRODUCTION_SEED=yes.
 */
import { connect } from "./sandbox-reset.mjs"

const THIND = "11111111-1111-1111-1111-111111111111"
const ATS = "22222222-2222-2222-2222-222222222222"

async function main() {
  if (process.env.CONFIRM_PRODUCTION_SEED !== "yes") {
    throw new Error("Refusing to seed production without CONFIRM_PRODUCTION_SEED=yes")
  }

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
