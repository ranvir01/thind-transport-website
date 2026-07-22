"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"
import { Button } from "@/components/hub/ui"
import { importProspectsAction } from "@/app/hub/_actions/outreach"
import type { Audience } from "@/lib/hub/outreach/draft"

/**
 * Paste-to-import. Accepts a CSV/TSV with a header row (name, company, email,
 * phone, mc, lane, equipment, notes) or plain one-per-line lists; the parser
 * auto-detects emails so column order is forgiving.
 */
export function OutreachImport({ audience }: { audience: Audience }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const res = await importProspectsAction(audience, text)
      if (res.ok) {
        toast.success(`Imported ${res.inserted} new, updated ${res.updated}${res.skipped ? `, skipped ${res.skipped}` : ""}.`)
        setText("")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="mr-1.5 h-4 w-4" /> Import {audience}s
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-fg-3">
        Paste prospects (CSV or one per line)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"name, company, email, phone, lane\nJane Doe, ACME Logistics, jane@acme.com, 555-1212, PNW ↔ CA"}
        className="w-full rounded-lg border border-border-strong bg-surface-2 p-2 font-mono text-body-xs text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={submit} disabled={pending || !text.trim()}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Import
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); setText("") }}>Cancel</Button>
      </div>
    </div>
  )
}
