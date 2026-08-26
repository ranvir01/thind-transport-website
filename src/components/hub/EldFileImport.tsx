"use client"

/**
 * ELD output-file upload — the one import on this page that is NOT a CSV.
 *
 * It lives beside the wizard rather than inside it because the wizard's whole
 * flow is "parse CSV → map columns", and an Appendix A file has fixed
 * sections defined by federal regulation — there is nothing for a human to
 * map. One file input, one action, an honest per-driver summary.
 *
 * Every FMCSA-registered ELD can export this file from its own menu (it is
 * what a roadside inspection transfers), which is why this box works for a
 * driver whose ELD brand no aggregator on the integrations page covers.
 */
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { FileUp, Loader2, ShieldCheck } from "lucide-react"
import { importEldFileAction, type EldImportActionResult } from "@/app/hub/_actions/import"
import { Panel } from "@/components/hub/ui"

export function EldFileImport() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<EldImportActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const onFile = (file: File | undefined) => {
    if (!file) return
    startTransition(async () => {
      const text = await file.text()
      const r = await importEldFileAction(text)
      setResult(r)
      if (r.ok) toast.success(`${r.eventsImported} duty-status events imported`)
      else toast.error(r.error ?? "Could not read that file")
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <Panel className="mt-6 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg">ELD output file (any ELD brand)</h2>
          <p className="mt-1 text-sm text-fg-2">
            Every registered ELD can export the standard FMCSA file — the one an inspector
            receives at roadside. Upload it here and it becomes duty logs and HOS clocks for
            matching drivers. No ELD account or integration needed. Duty status only — live GPS
            still comes from a connected ELD or the Positions import.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface-2 px-4 py-2 text-sm font-medium text-fg hover:bg-hover">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}
              {pending ? "Reading file…" : "Upload ELD output file"}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.eld,text/plain,text/csv"
                className="sr-only"
                disabled={pending}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <span className="text-xs text-fg-3">
              On the device: Menu → Roadside Inspection / Data Transfer → export file.
            </span>
          </div>

          {result?.ok && (
            <div className="mt-3 rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-fg-2">
              <span className="font-medium text-fg">{result.eventsImported} events</span> across{" "}
              {result.matchedDrivers} driver{result.matchedDrivers === 1 ? "" : "s"}
              {result.skippedDuplicates > 0 && <> · {result.skippedDuplicates} already imported</>}
              {result.skippedLines > 0 && <> · {result.skippedLines} unreadable lines skipped</>}
              {result.unmatchedDrivers.length > 0 && (
                <p className="mt-1 text-warn">
                  No roster match for: {result.unmatchedDrivers.join(", ")} — add them under
                  Drivers (same first + last name as the ELD) and re-upload; already-imported
                  events won&apos;t double.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
