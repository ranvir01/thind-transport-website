"use client"

/** Office side: invite customer contacts into the portal, see who has access. */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Globe, Loader2, Send } from "lucide-react"
import { invitePortalUserAction } from "@/app/hub/_actions/portal"
import { fieldCls, Panel } from "@/components/hub/ui"

export function PortalAccessPanel({
  customerId,
  customerType,
  users,
}: {
  customerId: string
  customerType: "broker" | "shipper"
  users: { id: string; email: string; name: string; active: boolean }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [lastLink, setLastLink] = useState<string | null>(null)

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await invitePortalUserAction({ customerId, email, role: customerType })
      if (result.ok) {
        toast.success("Invitation emailed — link valid 7 days")
        setLastLink(result.acceptUrl ?? null)
        setEmail("")
        router.refresh()
      } else toast.error(result.error ?? "Could not invite")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-1">
        <Globe className="h-4 w-4 text-accent-text" /> Portal access
      </h2>
      <p className="text-body-xs text-fg-3 mb-3">
        They track their own freight, download PODs and invoices, and stop calling dispatch.
      </p>
      <form onSubmit={invite} className="flex gap-2">
        <input
          aria-label="Contact email" required type="email" placeholder="ops@theircompany.com"
          className={fieldCls} value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit" disabled={pending || !email}
          className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-control bg-accent px-4 font-display text-sm font-bold uppercase tracking-[0.06em] text-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invite
        </button>
      </form>
      {lastLink ? (
        <p className="mt-2 break-all rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg-3">
          Backup link (if the email doesn&apos;t land): <span className="text-accent-text">{lastLink}</span>
        </p>
      ) : null}
      {users.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {users.map((portalUser) => (
            <li key={portalUser.id} className="flex items-center justify-between py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold text-fg">{portalUser.name}</span>
                <span className="text-fg-3"> · {portalUser.email}</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold uppercase text-ok">has access</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}
