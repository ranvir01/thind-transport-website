import Link from "next/link"
import { Megaphone, MessageSquare, Package } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { ensureDefaultTemplates, listThreadsForOffice } from "@/lib/hub/messages"
import { listDrivers } from "@/lib/hub/drivers"
import { PageHeader, Panel, EmptyState, btnSecondaryCls } from "@/components/hub/ui"
import { NewDirectThread } from "@/components/hub/NewDirectThread"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const user = await requireOfficeUser()
  await ensureDefaultTemplates(user.carrierId)
  const [threads, drivers] = await Promise.all([
    listThreadsForOffice(user.carrierId, user.id),
    listDrivers(user.carrierId),
  ])

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Every driver conversation in one place — no personal phone numbers."
        action={
          <Link
            href="/hub/messages/announcements"
            className={btnSecondaryCls}
          >
            <Megaphone className="h-4 w-4" /> Announcements
          </Link>
        }
      />

      <div className="mb-4 max-w-md">
        <NewDirectThread
          drivers={drivers
            .filter((d) => d.status === "active")
            .map((d) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` }))}
        />
      </div>

      {threads.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          hint="Message a driver above, or open any load and hit the chat button — drivers reply from their phones."
        />
      ) : (
        <Panel className="divide-y divide-border">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/hub/messages/${t.id}`}
              className="flex items-center gap-3 p-3.5 hover:bg-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-text">
                {t.kind === "load" ? <Package className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg truncate">
                  {t.kind === "load"
                    ? `${t.load_reference ?? "Load"}${t.driver_name ? ` · ${t.driver_name}` : ""}`
                    : t.driver_name ?? "Driver"}
                </span>
                <span
                  className={cn(
                    "block text-body-xs truncate",
                    (t.unread_count ?? 0) > 0 ? "text-fg font-semibold" : "text-fg-3"
                  )}
                >
                  {t.last_body ?? "No messages yet"}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1 shrink-0">
                {t.last_message_at ? (
                  <span className="text-[11px] text-fg-3">
                    {new Date(t.last_message_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                ) : null}
                {(t.unread_count ?? 0) > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-fg">
                    {t.unread_count}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  )
}
