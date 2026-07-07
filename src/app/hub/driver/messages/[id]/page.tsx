import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { getThread, listMessages, threadReads } from "@/lib/hub/messages"
import { queryOne } from "@/lib/hub/db"
import { ChatThread } from "@/components/hub/ChatThread"

export const dynamic = "force-dynamic"

export default async function DriverThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDriverUser()
  const { id } = await params
  const thread = await getThread(user.carrierId, id)
  if (!thread) notFound()

  // Ownership: my direct thread or my load's thread (query layer, not UI).
  if (thread.kind === "direct" && thread.driver_id !== user.driverId) notFound()
  if (thread.kind === "load" && thread.load_id) {
    const owns = await queryOne(
      `SELECT id FROM hub.loads WHERE carrier_id = $1 AND id = $2 AND driver_id = $3`,
      [user.carrierId, thread.load_id, user.driverId]
    )
    if (!owns) notFound()
  }

  const [messages, reads] = await Promise.all([
    listMessages(user.carrierId, id),
    threadReads(user.carrierId, id),
  ])
  const readUpTo: Record<string, number> = {}
  for (const r of reads) {
    if (r.user_id !== user.id) readUpTo[r.name] = Number(r.last_read_message_id)
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/hub/driver/messages"
          aria-label="Back to messages"
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 text-steel-100 hover:bg-white/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-extrabold uppercase tracking-wide text-white">
          {thread.kind === "direct" ? "Dispatch / office" : `Load ${thread.load_reference ?? ""}`}
        </h1>
      </div>
      <ChatThread threadId={id} messages={messages} meId={user.id} readUpTo={readUpTo} variant="dark" />
    </div>
  )
}
