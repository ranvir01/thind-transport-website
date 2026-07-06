"use client"

/**
 * Integrations admin (Phase 6): every provider behind an internal interface,
 * the CSV import path always shown as the working fallback, and honest
 * "pending activation" states — nothing fake, nothing blocked.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Cable, Check, Loader2, RefreshCw, Unplug } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  disconnectIntegrationAction, saveIntegrationCredentialsAction,
  syncEfsNowAction, syncTelematicsNowAction,
} from "@/app/hub/_actions/integrations"
import { fieldCls, Panel } from "@/components/hub/ui"

export interface ProviderCard {
  provider: "terminal" | "truckercloud" | "dat" | "efs" | "wex" | "comdata" | "mailbox"
  title: string
  blurb: string
  fallback: string
  fields: { key: string; label: string; type?: string }[]
  connected: boolean
  canSync?: boolean
}

/** One "sync now" action per provider that has a real adapter behind it. */
const SYNC_ACTIONS: Partial<Record<ProviderCard["provider"], () => Promise<{ ok: boolean; error?: string; summary?: string }>>> = {
  terminal: syncTelematicsNowAction,
  efs: syncEfsNowAction,
}

export function IntegrationCard({ card, encryptionReady }: { card: ProviderCard; encryptionReady: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveIntegrationCredentialsAction(card.provider, values)
      if (result.ok) {
        toast.success(`${card.title} connected — credentials encrypted at rest`)
        setOpen(false)
        setValues({})
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }

  const disconnect = () =>
    startTransition(async () => {
      const result = await disconnectIntegrationAction(card.provider)
      if (result.ok) {
        toast.success("Disconnected — the CSV import path keeps working")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  const syncNow = () =>
    startTransition(async () => {
      const action = SYNC_ACTIONS[card.provider]
      if (!action) return
      const result = await action()
      if (result.ok) toast.success(`Synced: ${result.summary}`)
      else toast.error(result.error ?? "Sync failed")
      router.refresh()
    })

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-fg">
            <Cable className="h-4 w-4 text-accent-text" /> {card.title}
          </h3>
          <p className="mt-0.5 text-body-xs text-fg-3">{card.blurb}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            card.connected
              ? "border-ok-soft bg-ok-soft text-ok"
              : "border-border-strong bg-surface-2 text-fg-3"
          )}
        >
          {card.connected ? "connected" : "not connected"}
        </span>
      </div>

      <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg-3">
        Always works without it: {card.fallback}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {card.connected ? (
          <>
            {card.canSync ? (
              <button
                onClick={syncNow} disabled={pending}
                className="flex min-h-[40px] items-center gap-1.5 rounded-control bg-accent px-4 text-sm font-bold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
              </button>
            ) : null}
            <button
              onClick={disconnect} disabled={pending}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-60"
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          </>
        ) : open ? (
          <form onSubmit={save} className="w-full space-y-2">
            {!encryptionReady ? (
              <p className="rounded-lg border border-warn-soft bg-warn-soft px-2.5 py-1.5 text-[11px] text-warn">
                Set <code>CREDENTIALS_KEY</code> in the environment first — credentials are encrypted at rest.
              </p>
            ) : null}
            {card.fields.map((field) => (
              <input
                key={field.key}
                aria-label={field.label}
                placeholder={field.label}
                type={field.type ?? "text"}
                className={fieldCls}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 min-h-[40px] rounded-xl border border-border-strong text-sm font-semibold text-fg-2 hover:bg-hover">
                Cancel
              </button>
              <button type="submit" disabled={pending || !encryptionReady}
                className="flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-control bg-accent text-sm font-bold text-fg hover:bg-accent-hover disabled:opacity-50">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Connect
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Connect
          </button>
        )}
      </div>
    </Panel>
  )
}
