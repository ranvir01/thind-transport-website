"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Clock, Loader2 } from "lucide-react"
import { addDetentionAction } from "@/app/hub/_actions/loads"

/**
 * Fallback detention trigger — marking a stop departed already auto-applies
 * detention, so this only shows up for loads that closed before that shipped
 * or whose detention settings changed after the fact (Phase 6 §9).
 */
export function DetentionButton({
  loadId,
  estimateCents,
  recompute,
}: {
  loadId: string
  estimateCents: number
  recompute?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await addDetentionAction(loadId)
          if (result.ok) {
            toast.success(`Detention ${recompute ? "updated" : "added"}: $${((result.amountCents ?? 0) / 100).toFixed(2)} — it rides on the invoice`)
            router.refresh()
          } else toast.error(result.error ?? "Could not add detention")
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
      {recompute ? "Recompute" : "Add"} detention (~${(estimateCents / 100).toFixed(0)})
    </button>
  )
}
