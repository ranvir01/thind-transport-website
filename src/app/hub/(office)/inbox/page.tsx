import Link from "next/link"
import { Mail } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { listIntakeDrafts, type IntakeConfidence } from "@/lib/hub/intake-drafts"
import { buildDocSummary } from "@/lib/hub/doc-intake"
import { EmptyState, PageHeader, Panel, Pill, type PillTone } from "@/components/hub/ui"
import { InboxDismiss } from "@/components/hub/InboxDismiss"

export const dynamic = "force-dynamic"

const CONFIDENCE_TONE: Record<IntakeConfidence, PillTone> = {
  high: "ok",
  medium: "warn",
  low: "bad",
  unreadable: "neutral",
}

const CONFIDENCE_LABEL: Record<IntakeConfidence, string> = {
  high: "Reads clean",
  medium: "Check the details",
  low: "Check everything",
  unreadable: "Couldn't read the file",
}

function whenLabel(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default async function InboxPage() {
  const user = await requireOfficeUser()
  const drafts = await listIntakeDrafts(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Rate cons that arrived by email and don't match a load yet. Nothing here is booked until you say so."
      />

      {drafts.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-5 w-5" />}
          title="Nothing waiting"
          hint="When a broker emails a rate con to your docs mailbox for freight you haven't booked, it lands here already read and pre-filled. Connect the mailbox under Integrations."
          action={
            <Link href="/hub/settings/integrations" className="text-sm font-semibold text-accent-text hover:underline">
              Docs mailbox settings
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => {
            const summary =
              draft.confidence === "unreadable"
                ? ["Attachment saved — open it to enter the load by hand"]
                : buildDocSummary("rate_con", { kind: "rate_con", data: draft.parsed })
            return (
              <li key={draft.id}>
                <Panel className="p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{draft.subject || "(no subject)"}</p>
                      <p className="mt-0.5 truncate text-body-sm text-fg-3">
                        {draft.from_address || "unknown sender"} · {whenLabel(draft.created_at)}
                      </p>
                    </div>
                    <Pill tone={CONFIDENCE_TONE[draft.confidence]}>{CONFIDENCE_LABEL[draft.confidence]}</Pill>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {summary.map((chip) => (
                      <Pill key={chip}>{chip}</Pill>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/hub/inbox/${draft.id}`}
                      className="press-sink inline-flex h-10 items-center justify-center rounded-control bg-accent px-3.5 text-sm font-semibold text-accent-fg shadow-card hover:bg-accent-hover"
                    >
                      Review &amp; book
                    </Link>
                    <InboxDismiss draftId={draft.id} />
                    {draft.document_url ? (
                      <a
                        href={draft.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto truncate text-sm font-semibold text-accent-text hover:underline"
                      >
                        {draft.document_name || "Open attachment"}
                      </a>
                    ) : null}
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
