"use client"

/**
 * "Suggest miles" — one tap fetches free drive miles for the load's lane, shows
 * the number + where it came from, and lets a writer save it onto the load.
 * Read-only users can still preview. No provider configured? The action falls
 * back to a distance estimate, so this always returns something usable.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Route, X } from "lucide-react"
import { suggestLoadMilesAction, applyLoadMilesAction } from "@/app/hub/_actions/routing"

export function SuggestMilesButton({ loadId, canWrite }: { loadId: string; canWrite: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [suggestion, setSuggestion] = useState<{ miles: number; label: string } | null>(null)

  const suggest = () =>
    startTransition(async () => {
      const r = await suggestLoadMilesAction(loadId)
      if (!r.ok || r.miles == null) {
        toast.error(r.error ?? "Couldn't route this lane")
        return
      }
      setSuggestion({ miles: r.miles, label: r.sourceLabel ?? "routing" })
    })

  const apply = () =>
    startTransition(async () => {
      if (!suggestion) return
      const r = await applyLoadMilesAction(loadId, suggestion.miles)
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't save miles")
        return
      }
      toast.success(`Saved ${suggestion.miles.toLocaleString()} loaded miles`)
      setSuggestion(null)
      router.refresh()
    })

  if (suggestion) {
    return (
      <span className="inline-flex items-center gap-2 text-body-xs">
        <span className="text-fg-2">
          ≈ <span className="font-semibold text-fg">{suggestion.miles.toLocaleString()} mi</span>
          <span className="text-fg-3"> · {suggestion.label}</span>
        </span>
        {canWrite ? (
          <button
            onClick={apply}
            disabled={pending}
            className="rounded-control bg-accent px-2 py-1 font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "…" : "Save"}
          </button>
        ) : null}
        <button
          onClick={() => setSuggestion(null)}
          disabled={pending}
          className="text-fg-3 hover:text-fg"
        >
          Dismiss
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={suggest}
      disabled={pending}
      className="inline-flex items-center gap-1 text-body-xs font-semibold text-accent-text hover:underline disabled:opacity-50"
    >
      <Route className="h-3.5 w-3.5" />
      {pending ? "Routing…" : "Suggest miles"}
    </button>
  )
}

/**
 * Compact variant for the load-board Miles cell: route icon → fetches the
 * suggestion → shows "≈N ✓ ✕" in place. Save confirms (never auto-writes)
 * and hands control back to the grid via onSaved (its refresh path).
 */
export function SuggestMilesInline({ loadId, onSaved }: { loadId: string; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition()
  const [suggestion, setSuggestion] = useState<{ miles: number; label: string } | null>(null)

  const suggest = () =>
    startTransition(async () => {
      const r = await suggestLoadMilesAction(loadId)
      if (!r.ok || r.miles == null) {
        toast.error(r.error ?? "Couldn't route this lane")
        return
      }
      setSuggestion({ miles: r.miles, label: r.sourceLabel ?? "routing" })
    })

  const apply = () =>
    startTransition(async () => {
      if (!suggestion) return
      const r = await applyLoadMilesAction(loadId, suggestion.miles)
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't save miles")
        return
      }
      toast.success(`Saved ${suggestion.miles.toLocaleString()} mi (${suggestion.label})`)
      setSuggestion(null)
      onSaved?.()
    })

  if (suggestion) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-body-xs">
        <span className="font-semibold text-fg" title={suggestion.label}>≈{suggestion.miles.toLocaleString()}</span>
        <button
          onClick={apply}
          disabled={pending}
          aria-label={`Save ${suggestion.miles} miles`}
          className="rounded p-0.5 text-emerald-400 hover:bg-hover disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setSuggestion(null)}
          disabled={pending}
          aria-label="Dismiss suggestion"
          className="rounded p-0.5 text-fg-3 hover:bg-hover"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={suggest}
      disabled={pending}
      title="Suggest miles from free routing"
      aria-label="Suggest miles"
      className="rounded p-1 text-fg-3 hover:bg-hover hover:text-accent-text disabled:opacity-50"
    >
      <Route className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} />
    </button>
  )
}
