"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { dismissIntakeDraftAction } from "@/app/hub/_actions/intake"
import { Button } from "@/components/hub/ui"

/**
 * Dismiss is deliberately not a confirm dialog. The draft is not deleted — it
 * moves to `dismissed` and the attachment stays in the carrier vault — so the
 * cost of a mis-tap is low, and a modal on every junk email would make the
 * queue slower than filing by hand.
 */
export function InboxDismiss({ draftId }: { draftId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await dismissIntakeDraftAction(draftId)
          if (result.ok) {
            toast.success("Dismissed")
            router.refresh()
          } else {
            toast.error(result.error ?? "Could not dismiss that draft")
          }
        })
      }
    >
      Dismiss
    </Button>
  )
}
