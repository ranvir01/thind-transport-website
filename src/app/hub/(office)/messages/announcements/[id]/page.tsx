import { notFound } from "next/navigation"
import { Check, Clock } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { ackReport, getAnnouncement } from "@/lib/hub/announcements"
import { PageHeader, BackLink, Panel } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function AnnouncementReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const announcement = await getAnnouncement(user.carrierId, id)
  if (!announcement) notFound()
  const report = await ackReport(user.carrierId, id)

  return (
    <div>
      <BackLink href="/hub/messages/announcements" label="Announcements" />
      <PageHeader title={announcement.title} subtitle={`Sent ${new Date(announcement.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${announcement.created_by_name ? ` by ${announcement.created_by_name}` : ""}`} />

      <Panel className="p-4 md:p-5 mb-4 max-w-2xl">
        <p className="text-body-sm text-fg-2 whitespace-pre-wrap">{announcement.body}</p>
      </Panel>

      {announcement.requires_ack ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-3">
              <Check className="h-4 w-4 text-green-400" /> Acknowledged ({report.acked.length})
            </h2>
            {report.acked.length === 0 ? (
              <p className="text-body-sm text-fg-3">Nobody yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.acked.map((a) => (
                  <li key={a.name} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold text-fg">{a.name}</span>
                    <span className="text-body-xs text-fg-3">
                      {a.signed ? "✍ signed · " : ""}
                      {new Date(a.acked_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-3">
              <Clock className="h-4 w-4 text-warn" /> Still waiting ({report.pending.length})
            </h2>
            {report.pending.length === 0 ? (
              <p className="text-body-sm text-green-400 font-semibold">Everyone has signed. 100%.</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.pending.map((p) => (
                  <li key={p.name} className="py-2 text-sm font-semibold text-fg">{p.name}</li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : (
        <p className="text-body-sm text-fg-3">This was informational — no acknowledgement required.</p>
      )}
    </div>
  )
}
