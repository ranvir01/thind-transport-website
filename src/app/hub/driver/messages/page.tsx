import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { ensureDirectThread, listThreadsForDriver } from "@/lib/hub/messages"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DriverMessagesPage() {
  const user = await requireDriverUser()
  // The direct line to the office always exists.
  await ensureDirectThread(user.carrierId, user.driverId)
  const threads = await listThreadsForDriver(user.carrierId, user.driverId, user.id)

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">Messages</h1>
      <p className="text-body-sm text-steel-300 mb-4">Dispatch and your loads — no phone numbers needed.</p>

      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              href={`/hub/driver/messages/${t.id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-800/80 p-4 hover:bg-white/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[color:var(--driver-accent)]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white truncate">
                  {t.kind === "direct" ? "Dispatch / office" : `Load ${t.load_reference ?? ""}`}
                </span>
                <span className={cn("block text-body-xs truncate", (t.unread_count ?? 0) > 0 ? "text-white font-semibold" : "text-steel-300")}>
                  {t.last_body ?? "No messages yet — tap to start"}
                </span>
              </span>
              {(t.unread_count ?? 0) > 0 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white">
                  {t.unread_count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
