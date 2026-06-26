import Link from "next/link"
import { notFound } from "next/navigation"
import { requireOfficeUser } from "@/lib/hub/session"
import { getThread, listMessages, listTemplates, threadReads } from "@/lib/hub/messages"
import { PageHeader, BackLink, Panel } from "@/components/hub/ui"
import { ChatThread } from "@/components/hub/ChatThread"

export const dynamic = "force-dynamic"

export default async function OfficeThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const thread = await getThread(user.carrierId, id)
  if (!thread) notFound()

  const [messages, templates, reads] = await Promise.all([
    listMessages(user.carrierId, id),
    listTemplates(user.carrierId),
    threadReads(id),
  ])
  const readUpTo: Record<string, number> = {}
  for (const r of reads) {
    if (r.user_id !== user.id) readUpTo[r.name] = Number(r.last_read_message_id)
  }

  return (
    <div>
      <BackLink href="/hub/messages" label="Messages" />
      <PageHeader
        title={
          thread.kind === "load"
            ? `${thread.load_reference ?? "Load"} — ${thread.driver_name ?? "no driver yet"}`
            : thread.driver_name ?? "Driver"
        }
        action={
          thread.load_id ? (
            <Link
              href={`/hub/loads/${thread.load_id}`}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Open the load
            </Link>
          ) : undefined
        }
      />
      <Panel className="p-4 max-w-3xl">
        <ChatThread threadId={id} messages={messages} meId={user.id} templates={templates} readUpTo={readUpTo} />
      </Panel>
    </div>
  )
}
