import { requireOwner } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { isSimulation } from "@/lib/hub/mode"
import { PageHeader, Panel } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function OutboxPage() {
  const user = await requireOwner()
  const sim = await isSimulation()
  const rows = await query<{
    id: string
    to_addr: string
    subject: string | null
    body_text: string | null
    attachments_meta: { filename?: string }[]
    created_at: string
  }>(
    `SELECT id, to_addr, subject, body_text, attachments_meta, created_at
     FROM hub.email_outbox
     WHERE carrier_id = $1 OR carrier_id IS NULL
     ORDER BY created_at DESC LIMIT 50`,
    [user.carrierId]
  )

  return (
    <div>
      <PageHeader
        title="Simulated outbox"
        subtitle="Nothing on this page was delivered. In SIMULATION every send lands here."
      />
      {!sim ? (
        <p className="text-sm text-fg-3">LEGIT mode — live email uses SMTP, not this echo.</p>
      ) : null}
      {rows.length === 0 ? (
        <Panel className="p-6 text-sm text-fg-3">No simulated mail yet. Send an invoice, settlement, or packet — or submit apply / pre-qualify / the calculator — to see a preview.</Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Panel key={row.id} className="p-4">
              <p className="text-[11px] text-fg-3">{new Date(row.created_at).toLocaleString("en-US")}</p>
              <p className="mt-1 text-sm font-semibold text-fg">{row.subject ?? "(no subject)"}</p>
              <p className="text-body-xs text-fg-3">To {row.to_addr}</p>
              {row.body_text ? (
                <pre className="mt-2 whitespace-pre-wrap text-[12px] text-fg-2">{row.body_text.slice(0, 800)}</pre>
              ) : null}
              {Array.isArray(row.attachments_meta) && row.attachments_meta.length > 0 ? (
                <p className="mt-2 text-[11px] text-fg-3">
                  Attachments: {row.attachments_meta.map((a) => a.filename ?? "file").join(", ")}
                </p>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
