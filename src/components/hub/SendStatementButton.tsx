"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"
import { sendCustomerStatementAction } from "@/app/hub/_actions/money"

/** One-click AR statement: emails every open invoice for a customer as one PDF. */
export function SendStatementButton({ customerId, disabled }: { customerId: string; disabled?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await sendCustomerStatementAction(customerId)
          if (!result.ok) {
            toast.error(result.error ?? "Could not send statement")
            return
          }
          if (result.emailed) {
            toast.success(`Statement sent to ${result.to} — ${result.invoiceCount} open invoice${result.invoiceCount === 1 ? "" : "s"}`)
          } else {
            toast.error(result.error ?? "Statement not sent")
          }
          router.refresh()
        })
      }
      disabled={disabled || pending}
      title={disabled ? "No billing email on file for this customer" : undefined}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Send statement
    </button>
  )
}
