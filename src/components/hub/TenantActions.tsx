"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { setTenantStatusAction } from "@/app/hub/_actions/admin"

export function TenantActions({ tenantId, status }: { tenantId: string; status: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const next = status === "active" ? "suspended" : "active"

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await setTenantStatusAction(tenantId, next as "active" | "suspended")
          if (result.ok) {
            toast.success(next === "suspended" ? "Tenant suspended — logins keep working, crons stop" : "Tenant reactivated")
            router.refresh()
          } else toast.error(result.error ?? "Failed")
        })
      }
      disabled={pending}
      className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-body-xs font-semibold text-steel-200 hover:bg-white/5 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {next === "suspended" ? "Suspend" : "Reactivate"}
    </button>
  )
}
