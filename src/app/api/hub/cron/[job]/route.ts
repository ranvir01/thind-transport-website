import { NextResponse } from "next/server"
import { query } from "@/lib/hub/db"
import { complianceEntries } from "@/lib/hub/compliance"
import { runOverdueReminders } from "@/lib/hub/invoices"
import { getCarrierSettings } from "@/lib/hub/settings"
import { createMailTransport, mailFrom } from "@/lib/mailer"
import { cronAuthorized } from "@/lib/hub/cron-auth"

/**
 * Vercel Cron entrypoints (secret-protected):
 *   /api/hub/cron/compliance-scan — daily 60/30/7-day expiry alerts per carrier
 *   /api/hub/cron/ar-reminders    — daily overdue invoice dunning (skips factored)
 * Health lands in hub.integration_syncs either way.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ job: string }> }
) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  if (!cronAuthorized(auth, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { job } = await params

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
