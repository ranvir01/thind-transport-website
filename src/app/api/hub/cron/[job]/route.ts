import { NextResponse } from "next/server"
import { query } from "@/lib/hub/db"
import { complianceEntries } from "@/lib/hub/compliance"
import { runOverdueReminders } from "@/lib/hub/invoices"
import { runDetentionAlerts } from "@/lib/hub/detention"
import { runTaskAutomations } from "@/lib/hub/tasks"
import { recomputeLanes } from "@/lib/hub/lanes"
import { runRecurringRebooks } from "@/lib/hub/recurring"
import { computeDriverScores } from "@/lib/hub/recruiting"
import { recheckActiveCustomers } from "@/lib/hub/vetting"
import { runTelematicsSync } from "@/lib/hub/telematics"
import { runEfsSync } from "@/lib/hub/integrations/efs"
import { runComdataSync } from "@/lib/hub/integrations/comdata"
import { runWexSync } from "@/lib/hub/integrations/wex"
import { runQboSync } from "@/lib/hub/integrations/qbo"
import { pollDocsMailbox } from "@/lib/hub/mailbox"
import { notifyRandomTestPool, selectRandomTestPool } from "@/lib/hub/random-testing"
import { sendOwnerDigest } from "@/lib/hub/digest"
import { getCarrierSettings } from "@/lib/hub/settings"
import { createMailTransport, mailFrom } from "@/lib/mailer"
import { runMigrations } from "@/lib/hub/migrate"

// Migrations on a cold backlog can outlive the default limit; 60s is the cap
// on Hobby and a no-op run finishes in well under a second.
export const maxDuration = 60

/**
 * Vercel Cron entrypoints (secret-protected):
 *   /api/hub/cron/compliance-scan  — daily 60/30/7-day expiry alerts per carrier
 *   /api/hub/cron/ar-reminders     — daily overdue invoice dunning (skips factored)
 *   /api/hub/cron/detention-alerts — daily dwelling-past-free-time alerts (Hobby: once/day)
 *   /api/hub/cron/recurring-rebook — daily "rebook every <weekday>" lane rules → fresh Booked loads
 * Health lands in hub.integration_syncs either way.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ job: string }> }
) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { job } = await params

  // Schema first: migrate runs before the carriers query below can assume any
  // table exists, and applies exactly the migrations bundled with this deploy.
  if (job === "migrate") {
    const started = new Date()
    try {
      const result = await runMigrations()
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES (NULL, 'cron:migrate', $1, NOW(), TRUE, $2)`,
        [started.toISOString(), JSON.stringify(result)]
      ).catch(() => undefined)
      return NextResponse.json({ ok: true, job, ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown"
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES (NULL, 'cron:migrate', $1, NOW(), FALSE, $2)`,
        [started.toISOString(), message]
      ).catch(() => undefined)
      return NextResponse.json({ ok: false, job, error: message }, { status: 500 })
    }
  }

  const carriers = await query<{ id: string; name: string }>(
    `SELECT id, name FROM hub.carriers WHERE status = 'active'`
  )

  const results: Record<string, unknown> = {}
  for (const carrier of carriers) {
    const started = new Date()
    try {
      if (job === "compliance-scan") {
        const entries = await complianceEntries(carrier.id)
        const alerts = entries.filter((entry) => {
          if (!entry.due) return false
          const days = Math.ceil((new Date(entry.due).getTime() - Date.now()) / 86400000)
          return days === 60 || days === 30 || days === 7 || days < 0
        })
        const settings = await getCarrierSettings(carrier.id)
        if (alerts.length > 0 && settings.notifications.officeEmail) {
          const transport = createMailTransport()
          await transport.sendMail({
            from: mailFrom(`${carrier.name} Compliance`),
            to: settings.notifications.officeEmail,
            subject: `Compliance alerts: ${alerts.length} item(s) need attention`,
            text: alerts
              .map((a) => `• ${a.name} — ${a.kind}: due ${a.due}${a.color === "red" ? " (EXPIRED)" : ""}`)
              .join("\n"),
          })
        }
        results[carrier.id] = { alerts: alerts.length }
      } else if (job === "ar-reminders") {
        results[carrier.id] = await runOverdueReminders(carrier.id)
      } else if (job === "detention-alerts") {
        // Roadmap: alert dispatcher/owner the moment a stop crosses free time
        // dwelling, instead of waiting for someone to notice on the board.
        results[carrier.id] = await runDetentionAlerts(carrier.id)
      } else if (job === "task-automations") {
        // E4: every condition needing office action becomes a deep-linked task.
        results[carrier.id] = await runTaskAutomations(carrier.id)
      } else if (job === "recurring-rebook") {
        // Roadmap: dedicated weekly lanes book themselves — every enabled
        // "rebook every <weekday>" rule due today lands as a fresh Booked load.
        results[carrier.id] = await runRecurringRebooks(carrier.id)
      } else if (job === "recompute-lanes") {
        // E1: lane history powers backhaul hints on the planner.
        results[carrier.id] = await recomputeLanes(carrier.id)
      } else if (job === "driver-scorecards") {
        // E5: monthly scorecards feed reviews and scorecard_bonus pay rules.
        results[carrier.id] = await computeDriverScores(carrier.id)
      } else if (job === "fmcsa-recheck") {
        // Phase 5: nightly authority re-check — alert before the next booking.
        results[carrier.id] = await recheckActiveCustomers(carrier.id)
      } else if (job === "telematics-sync") {
        // Phase 6: positions/odometer/HOS from the ELD aggregator (when connected).
        results[carrier.id] = await runTelematicsSync(carrier.id)
      } else if (job === "docs-mailbox") {
        // Phase 6: forwarded rate cons auto-file to their loads.
        results[carrier.id] = await pollDocsMailbox(carrier.id)
      } else if (job === "efs-sync") {
        // Integrations lane: daily EFS fuel-card feed → hub.fuel_transactions.
        results[carrier.id] = await runEfsSync(carrier.id)
      } else if (job === "wex-sync") {
        // Integrations lane: daily WEX fuel-card feed → hub.fuel_transactions.
        results[carrier.id] = await runWexSync(carrier.id)
      } else if (job === "comdata-sync") {
        // Integrations lane: daily Comdata fuel-card feed → hub.fuel_transactions.
        results[carrier.id] = await runComdataSync(carrier.id)
      } else if (job === "qbo-sync") {
        // Integrations lane: daily QBO payment pull → hub.payments via recordPayment.
        results[carrier.id] = await runQboSync(carrier.id)
      } else if (job === "owner-digest") {
        // Phase 6: the Monday-morning numbers email.
        results[carrier.id] = await sendOwnerDigest(carrier.id)
      } else if (job === "random-testing") {
        // Roadmap: 49 CFR 382.305 quarterly random drug/alcohol pool — daily
        // no-op once each quarter's pool is full (selectRandomTestPool is
        // idempotent), so this is safe on a daily schedule.
        const drugSelected = await selectRandomTestPool(carrier.id, "drug")
        const alcoholSelected = await selectRandomTestPool(carrier.id, "alcohol")
        const drugNotified = await notifyRandomTestPool(carrier.id, "drug")
        const alcoholNotified = await notifyRandomTestPool(carrier.id, "alcohol")
        results[carrier.id] = {
          drugSelected: drugSelected.length, alcoholSelected: alcoholSelected.length,
          drugNotified: drugNotified.notified, alcoholNotified: alcoholNotified.notified,
        }
      } else {
        return NextResponse.json({ error: "Unknown job" }, { status: 404 })
      }
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES ($1, $2, $3, NOW(), TRUE, $4)`,
        [carrier.id, `cron:${job}`, started.toISOString(), JSON.stringify(results[carrier.id])]
      )
    } catch (err) {
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES ($1, $2, $3, NOW(), FALSE, $4)`,
        [carrier.id, `cron:${job}`, started.toISOString(), err instanceof Error ? err.message : "unknown"]
      )
      results[carrier.id] = { error: err instanceof Error ? err.message : "unknown" }
    }
  }

  return NextResponse.json({ ok: true, job, results })
}
