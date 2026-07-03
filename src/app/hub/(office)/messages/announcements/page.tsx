import Link from "next/link"
import { requireOfficeUser } from "@/lib/hub/session"
import { listAnnouncements, audienceUserIds } from "@/lib/hub/announcements"
import { PageHeader, BackLink, Panel, EmptyState } from "@/components/hub/ui"
import { AnnouncementComposer } from "@/components/hub/AnnouncementComposer"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
  const user = await requireOfficeUser()
  const announcements = await listAnnouncements(user.carrierId)
  // Resolve audience sizes for the progress pills (cheap: few announcements).
  const withTargets = await Promise.all(
    announcements.map(async (a) => ({
      ...a,
      audience_count: (await audienceUserIds(user.carrierId, a.audience ?? { all: true })).length,
    }))
  )

  return (
    <div>
      <BackLink href="/hub/messages" label="Messages" />
      <PageHeader
        title="Announcements"
        subtitle="Safety bulletins, policy changes, holiday schedules — with proof everyone saw them."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnnouncementComposer />
        <div>
          {withTargets.length === 0 ? (
            <EmptyState title="Nothing sent yet" hint="Your first announcement lands on every targeted phone with a push alert." />
          ) : (
            <Panel className="divide-y divide-border">
              {withTargets.map((a) => {
                const complete = a.requires_ack && (a.ack_count ?? 0) >= a.audience_count
                return (
                  <Link key={a.id} href={`/hub/messages/announcements/${a.id}`} className="block p-4 hover:bg-hover">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-fg truncate">{a.title}</p>
                      {a.requires_ack ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                            complete
                              ? "border-green-500/40 bg-green-500/10 text-green-400"
                              : "border-warn/40 bg-warn-soft text-warn"
                          )}
                        >
                          {a.ack_count ?? 0}/{a.audience_count} signed
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-border-strong bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-fg-3">
                          FYI only
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-body-xs text-fg-3 truncate">{a.body}</p>
                    <p className="mt-1 text-[11px] text-fg-3">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {a.created_by_name ? ` · ${a.created_by_name}` : ""}
                    </p>
                  </Link>
                )
              })}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
