import Link from "next/link"
import { requireOfficeUser } from "@/lib/hub/session"
import { listAnnouncements, audienceUserIds } from "@/lib/hub/announcements"
import { PageHeader, BackLink, Panel, EmptyState, Pill, btnPrimaryCls } from "@/components/hub/ui"
import { AnnouncementComposer } from "@/components/hub/AnnouncementComposer"

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
        <div id="new-announcement">
          <AnnouncementComposer />
        </div>
        <div>
          {withTargets.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              hint="Your first announcement lands on every targeted phone with a push alert."
              action={
                <a href="#new-announcement" className={btnPrimaryCls}>
                  Write the first one
                </a>
              }
            />
          ) : (
            <Panel className="divide-y divide-border">
              {withTargets.map((a) => {
                const complete = a.requires_ack && (a.ack_count ?? 0) >= a.audience_count
                return (
                  <Link key={a.id} href={`/hub/messages/announcements/${a.id}`} className="block p-4 hover:bg-hover">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-fg truncate">{a.title}</p>
                      {a.requires_ack ? (
                        <Pill tone={complete ? "ok" : "warn"} size="xs" className="shrink-0">
                          {a.ack_count ?? 0}/{a.audience_count} signed
                        </Pill>
                      ) : (
                        <Pill tone="neutral" size="xs" className="shrink-0">
                          FYI only
                        </Pill>
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
