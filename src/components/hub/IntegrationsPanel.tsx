"use client"

/**
 * Integrations admin (Phase 6): every provider behind an internal interface,
 * the CSV import path always shown as the working fallback, and honest
 * "pending activation" states — nothing fake, nothing blocked.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Cable, Check, Copy, Loader2, RefreshCw, Unplug } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  disconnectIntegrationAction, retryIntegrationEventsAction, saveIntegrationCredentialsAction, syncIntegrationNowAction,
} from "@/app/hub/_actions/integrations"
import { fieldCls, Panel } from "@/components/hub/ui"
import type { IntegrationProvider } from "@/lib/hub/credentials"
import type { CredentialField, ProviderStatus } from "@/lib/hub/integrations/registry"

export interface ProviderCard {
  provider: IntegrationProvider
  title: string
  blurb: string
  fallback: string
  fields: CredentialField[]
  connected: boolean
  canSync?: boolean
  status: ProviderStatus
  /** Copy-paste inbound URL, present when the provider pushes via webhook. */
  webhookUrl?: string
  /** Count of hub.integration_events stuck unprocessed — undefined for providers with no event processor. */
  pendingEvents?: number
  /** Credential-lifetime note (e.g. QBO's 5-year refresh-token cap) — warn styling when action is needed soon. */
  credentialNotice?: { text: string; warn: boolean }
}

const STATUS_BADGE: Record<ProviderStatus, { label: string; cls: string }> = {
  live: { label: "not connected", cls: "border-border-strong bg-surface-2 text-fg-3" },
  stub: { label: "coming soon", cls: "border-warn-soft bg-warn-soft text-warn" },
  planned: { label: "planned", cls: "border-border-strong bg-surface-2 text-fg-3" },
}

export function IntegrationCard({ card, encryptionReady }: { card: ProviderCard; encryptionReady: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveIntegrationCredentialsAction(card.provider, values)
      if (result.ok) {
        toast.success(card.connected ? `${card.title} credentials updated` : `${card.title} connected — credentials encrypted at rest`)
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
      setConfirmingDisconnect(false)
    })

  const syncNow = () =>
    startTransition(async () => {
      const result = await syncIntegrationNowAction(card.provider)
      if (result.ok) toast.success(`Synced: ${result.summary}`)
      else toast.error(result.error ?? "Sync failed")
      router.refresh()
    })

  const retryEvents = () =>
    startTransition(async () => {
      const result = await retryIntegrationEventsAction(card.provider)
      if (result.ok) toast.success(result.summary ?? "Retried")
      else toast.error(result.error ?? "Retry failed")
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
            card.connected ? "border-ok-soft bg-ok-soft text-ok" : STATUS_BADGE[card.status].cls
          )}
        >
          {card.connected ? "connected" : STATUS_BADGE[card.status].label}
        </span>
      </div>

      <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg-3">
        Always works without it: {card.fallback}
      </p>

      {card.status === "stub" ? (
        <p className="mt-2 text-[11px] text-fg-3">
          The sync client is still being built — credentials you save now are stored encrypted and
          activate automatically when it ships. The fallback above works today.
        </p>
      ) : null}

      {card.status === "planned" ? (
        <p className="mt-2 text-[11px] text-fg-3">
          Not built yet — nothing to connect. The fallback above works today.
        </p>
      ) : null}

      {card.webhookUrl ? <WebhookUrl url={card.webhookUrl} /> : null}

      {card.connected && card.credentialNotice ? (
        <p
          className={cn(
            "mt-2 rounded-lg px-2.5 py-1.5 text-[11px]",
            card.credentialNotice.warn ? "border border-warn-soft bg-warn-soft text-warn" : "bg-surface-2 text-fg-3"
          )}
        >
          {card.credentialNotice.text}
        </p>
      ) : null}

      {card.connected && card.pendingEvents ? (
        <p className="mt-2 rounded-lg border border-warn-soft bg-warn-soft px-2.5 py-1.5 text-[11px] text-warn">
          {/* Explicit {" "} — the compiler drops a bare space between an
              expression container and entity text (rendered "1 eventcouldn't"). */}
          {card.pendingEvents} event{card.pendingEvents === 1 ? "" : "s"}{" "}
          couldn&rsquo;t be matched yet (e.g. webhook arrived before the invoice existed) — retry below.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {card.connected && !open ? (
          <>
            {card.canSync ? (
              <button
                onClick={syncNow} disabled={pending}
                className="flex min-h-[40px] items-center gap-1.5 rounded-control bg-accent px-4 text-sm font-bold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
              </button>
            ) : null}
            {card.pendingEvents ? (
              <button
                onClick={retryEvents} disabled={pending}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-warn-soft px-4 text-sm font-semibold text-warn hover:bg-warn-soft disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Retry {card.pendingEvents} event{card.pendingEvents === 1 ? "" : "s"}
              </button>
            ) : null}
            <button
              onClick={() => { setOpen(true); setConfirmingDisconnect(false) }} disabled={pending}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-60"
            >
              Edit
            </button>
            {confirmingDisconnect ? (
              <>
                <button
                  onClick={disconnect} disabled={pending}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-bad px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} Disconnect it
                </button>
                <button
                  onClick={() => setConfirmingDisconnect(false)} disabled={pending}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-60"
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmingDisconnect(true)} disabled={pending}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-60"
              >
                <Unplug className="h-4 w-4" /> Disconnect
              </button>
            )}
          </>
        ) : card.status === "planned" ? null : open ? (
          <form onSubmit={save} className="w-full space-y-2">
            {!encryptionReady ? (
              <p className="rounded-lg border border-warn-soft bg-warn-soft px-2.5 py-1.5 text-[11px] text-warn">
                Set <code>CREDENTIALS_KEY</code> in the environment first — credentials are encrypted at rest.
              </p>
            ) : card.connected ? (
              <p className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg-3">
                Leave a field blank to keep its saved value — only fields you fill in here get updated.
              </p>
            ) : null}
            {card.fields.map((field) => (
              <input
                key={field.key}
                aria-label={field.label}
                placeholder={card.connected ? `${field.label} (unchanged if left blank)` : field.label}
                type={field.secret ? "password" : "text"}
                className={fieldCls}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setOpen(false); setValues({}) }}
                className="flex-1 min-h-[40px] rounded-xl border border-border-strong text-sm font-semibold text-fg-2 hover:bg-hover">
                Cancel
              </button>
              <button type="submit" disabled={pending || !encryptionReady}
                className="flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-control bg-accent text-sm font-bold text-fg hover:bg-accent-hover disabled:opacity-50">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {card.connected ? "Save changes" : "Connect"}
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

/** Copy-paste inbound endpoint for push-style providers. */
function WebhookUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copy failed — select the URL manually")
    }
  }
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-2 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-fg-3">Your webhook URL</span>
        <button
          type="button" onClick={copy}
          className="flex items-center gap-1 rounded-lg border border-border-strong px-2 py-0.5 text-[11px] font-semibold text-fg-2 hover:bg-hover"
        >
          {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="mt-1 block break-all text-[11px] text-fg-2">{url}</code>
      <p className="mt-1 text-[11px] text-fg-3">
        Give this to the provider. Requests must be HMAC-SHA256 signed with your{" "}
        <span className="font-semibold">webhook signing secret</span> (saved above) in the{" "}
        <code>X-Loadoff-Signature</code> header.
      </p>
    </div>
  )
}
