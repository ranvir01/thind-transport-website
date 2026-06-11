"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, X } from "lucide-react"
import { decideAdvanceAction } from "@/app/hub/_actions/money"

/** Approve/deny a driver-requested advance (pending → outstanding/cancelled). */
export function AdvanceDecideButtons({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const decide = (decision: "approve" | "deny") =>
    startTransition(async () => {
      const result = await decideAdvanceAction(id, decision)
      if (result.ok) {
        toast.success(decision === "approve" ? "Approved — deducts on the next settlement" : "Denied")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  return (
    <span className="flex gap-1.5">
      <button
        onClick={() => decide("approve")}
        disabled={pending}
        aria-label="Approve advance"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        onClick={() => decide("deny")}
        disabled={pending}
        aria-label="Deny advance"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-steel-300 hover:bg-white/5 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  )
}
