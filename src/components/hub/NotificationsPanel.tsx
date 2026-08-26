"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { updateOfficeEmailAction } from "@/app/hub/_actions/company"
import { Panel, fieldCls, labelCls } from "@/components/hub/ui"

/**
 * Owner edit form for the office alert email — where the Monday owner
 * digest, compliance expiry alerts, and 20-day overdue-invoice CCs go.
 * Seeded with the owner's email at signup; blank turns those emails off.
 */
export function NotificationsPanel({ officeEmail }: { officeEmail: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState(officeEmail ?? "")
  const [lastSynced, setLastSynced] = useState(officeEmail)

  // router.refresh() after a save delivers the canonical server value
  // (trimmed + lowercased) — re-sync the field so it shows what was stored.
  if (officeEmail !== lastSynced) {
    setLastSynced(officeEmail)
    setEmail(officeEmail ?? "")
  }

  const saved = email.trim().toLowerCase() === (officeEmail ?? "")

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateOfficeEmailAction(email)
      if (result.ok) {
        toast.success(email.trim() ? "Notification email saved" : "Office alert emails turned off")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save")
      }
    })
  }

  return (
    <Panel className="max-w-3xl p-4 md:p-5">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-body-sm text-fg-2">
          Where LoadOff emails the office: the Monday owner digest, compliance expiry
          alerts, and a copy of invoice reminders once they hit 20 days past due.
        </p>

        <div className="max-w-sm">
          <label htmlFor="office_email" className={labelCls}>Office alert email</label>
          <input
            id="office_email" type="email" autoComplete="email"
            placeholder="office@yourcompany.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls}
          />
          <p className="mt-1.5 text-body-xs text-fg-3">
            Leave blank to turn these emails off.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || saved}
          className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saved ? "Saved" : "Save notification email"}
        </button>
      </form>
    </Panel>
  )
}
