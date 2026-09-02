import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { ensureDirectThread, listThreadsForDriver } from "@/lib/hub/messages"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DriverMessagesPage() {
  const user = await requireDriverUser()
  // The direct line to the office always exists.
  await ensureDirectThread(user.carrierId, user.driverId)
  const threads = await listThreadsForDriver(user.carrierId, user.driverId, user.id)

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-white">Messages</h1>
      <p className="text-body-sm text-steel-300 mb-4">Dispatch and your loads — no phone numbers needed.</p>

      {threads.length === 0 ? (
        <EmptyStateDark
          title="No messages yet"
          hint="Dispatch and your loads show up here as soon as the office opens a thread."
          icon={<MessageSquare className="h-5 w-5" />}
        />
      ) : (
        <ul className="hub-stagger space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/hub/driver/messages/${t.id}`}
                className="driver-card flex min-h-[64px] items-center gap-3 p-4 transition-colors hover:bg-driver-surface-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/[0.06] text-[color:var(--driver-accent)]">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white truncate">
                    {t.kind === "direct" ? "Dispatch / office" : `Load ${t.load_reference ?? ""}`}
                  </span>
                  <span className={cn("block text-[13px] truncate", (t.unread_count ?? 0) > 0 ? "text-white font-semibold" : "text-steel-300")}>
                    {t.last_body ?? "No messages yet — tap to start"}
                  </span>
                </span>
                {(t.unread_count ?? 0) > 0 ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-pill bg-orange-600 px-1.5 text-[11px] font-bold tabular-nums text-white">
                    {t.unread_count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
