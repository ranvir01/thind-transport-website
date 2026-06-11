"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MessageSquare } from "lucide-react"
import { openThread } from "@/app/hub/_actions/messages"

/** One click from a load to its chat thread (driver + office, on the record). */
export function MessageLoadButton({ loadId }: { loadId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await openThread({ loadId })
          if (result.ok && result.threadId) router.push(`/hub/messages/${result.threadId}`)
          else toast.error(result.error ?? "Could not open the chat")
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      Chat
    </button>
  )
}
