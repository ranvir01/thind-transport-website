"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, Loader2 } from "lucide-react"
import { duplicateLoadAction } from "@/app/hub/_actions/loads"

/** One-click rebook for recurring lanes: copies lane, rate, and assignment onto a fresh booked load. */
export function DuplicateLoadButton({ loadId }: { loadId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await duplicateLoadAction(loadId)
          if (!result.ok || !result.id) {
            toast.error(result.error ?? "Could not duplicate load")
            return
          }
          toast.success("Load duplicated — set the appointment dates before dispatch")
          router.push(`/hub/loads/${result.id}`)
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      Duplicate
    </button>
  )
}
