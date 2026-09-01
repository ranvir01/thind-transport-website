"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Copy, Link2, Loader2, RefreshCw, XCircle } from "lucide-react"
import { createShareLinkAction, revokeShareLinkAction, renewShareLinkAction } from "@/app/hub/_actions/loads"
import { Panel } from "@/components/hub/ui"

export interface ShareLinkRow {
  id: string
  token: string
  revoked_at: string | null
  expires_at: string | null
  created_at: string
}

const RENEW_WINDOW_DAYS = 7

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function expiryLabel(expiresAt: string | null): { text: string; expired: boolean; soon: boolean } {
  if (!expiresAt) return { text: "No expiry", expired: false, soon: false }
  const days = daysUntil(expiresAt)
  if (days <= 0) return { text: "Expired", expired: true, soon: false }
  if (days === 1) return { text: "Expires tomorrow", expired: false, soon: true }
  return { text: `Expires in ${days} days`, expired: false, soon: days <= RENEW_WINDOW_DAYS }
}

export function ShareLinkPanel({ loadId, links }: { loadId: string; links: ShareLinkRow[] }) {
  const [pending, startTransition] = useTransition()
  const [latestToken, setLatestToken] = useState<string | null>(null)
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null)

  const create = () =>
    startTransition(async () => {
      const result = await createShareLinkAction(loadId)
      if (result.ok && result.token) {
        setLatestToken(result.token)
        toast.success("Tracking link created")
      } else {
        toast.error(result.error ?? "Could not create link")
      }
    })

  const revoke = (id: string) =>
    startTransition(async () => {
      const result = await revokeShareLinkAction(id, loadId)
      if (result.ok) toast.success("Link revoked")
      else toast.error(result.error ?? "Could not revoke link")
      setConfirmingRevokeId(null)
    })

  const renew = (id: string) =>
    startTransition(async () => {
      const result = await renewShareLinkAction(id, loadId)
      if (result.ok) toast.success("Link renewed for 30 more days")
      else toast.error(result.error ?? "Could not renew link")
    })

  const copy = (token: string) => {
    const url = `${window.location.origin}/track/${token}`
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied — send it to the broker"),
      () => toast.error("Could not copy")
    )
  }

  // Not-revoked links stay listed even past expiry so office can renew one
  // instead of it silently going dead and a dispatcher minting a duplicate.
  const active = links.filter((l) => !l.revoked_at)

  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13.5px] font-semibold text-fg">
          Tracking links
        </h2>
        <button
          onClick={create}
          disabled={pending}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          New link
        </button>
      </div>
      <p className="text-body-xs text-fg-3 mb-3">
        Public, revocable status page for the broker — kills check calls. Shows status, stops, and city-level position only.
      </p>
      {active.length === 0 ? (
        <p className="text-body-sm text-fg-3">No active links.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((link) => {
            const expiry = expiryLabel(link.expires_at)
            return (
            <li key={link.id} className="rounded-lg border border-border/60 p-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-2 text-body-xs text-fg-2">
                /track/{link.token.slice(0, 12)}…
              </code>
              <button
                aria-label="Copy link"
                onClick={() => copy(link.token)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-fg-2 hover:bg-hover"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={`/track/${link.token}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center rounded-lg border border-border px-3 text-xs font-semibold text-fg-2 hover:bg-hover"
              >
                Open
              </a>
              {confirmingRevokeId === link.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => revoke(link.id)}
                    disabled={pending}
                    aria-label="Confirm revoke link"
                    className="flex h-8 items-center gap-1 rounded-lg bg-bad px-2 text-[11px] font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Revoke
                  </button>
                  <button
                    onClick={() => setConfirmingRevokeId(null)}
                    disabled={pending}
                    aria-label="Keep link"
                    className="flex h-8 items-center rounded-lg px-2 text-[11px] font-semibold text-fg-3 hover:bg-hover"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  aria-label="Revoke link"
                  onClick={() => setConfirmingRevokeId(link.id)}
                  disabled={pending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-bad hover:bg-bad-soft disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between pl-0.5">
              <span className={`text-[11px] font-semibold ${expiry.expired ? "text-bad" : expiry.soon ? "text-warn" : "text-fg-3"}`}>
                {expiry.text}
              </span>
              {expiry.expired || expiry.soon ? (
                <button
                  onClick={() => renew(link.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent-text hover:bg-accent-soft disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Renew 30 days
                </button>
              ) : null}
            </div>
            </li>
            )
          })}
        </ul>
      )}
      {latestToken ? (
        <p className="mt-3 rounded-lg border border-accent-soft bg-accent-soft p-2.5 text-body-xs text-accent-text break-all">
          {typeof window !== "undefined" ? `${window.location.origin}/track/${latestToken}` : `/track/${latestToken}`}
        </p>
      ) : null}
    </Panel>
  )
}
