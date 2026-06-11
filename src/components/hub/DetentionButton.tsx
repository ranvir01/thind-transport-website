"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Clock, Loader2 } from "lucide-react"
import { addDetentionAction } from "@/app/hub/_actions/loads"

/** One-click detention accessorial from real stop timestamps (Phase 6 §9). */
export function DetentionButton({ loadId, estimateCents }: { loadId: string; estimateCents: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await addDetentionAction(loadId)
          if (result.ok) {
            toast.success(`Detention added: $${((result.amountCents ?? 0) / 100).toFixed(2)} — it rides on the invoice`)
            router.refresh()
          } else toast.error(result.error ?? "Could not add detention")
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-bold text-gold hover:bg-gold/20 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
      Add detention (~${(estimateCents / 100).toFixed(0)})
    </button>
  )
}
