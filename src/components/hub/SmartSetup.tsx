"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight, Check, FileUp, Loader2, ScanLine, Sparkles, Trash2, Upload,
} from "lucide-react"
import { toast } from "sonner"
import { analyzeDocument, type DocAnalysis } from "@/lib/hub/doc-intake"
import type { DocKind, ParsedDocPayload } from "@/lib/hub/doc-intake/types"
import { extractTextFromFile, stashRateConForPaste } from "@/lib/hub/doc-intake/extract-text-client"
import { analyzeSmartSetupAction, applySmartScanAction } from "@/app/hub/_actions/setup"
import { fieldCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

interface QueuedScan {
  id: string
  fileName: string
  file: File | null
  analysis: DocAnalysis
  aiEnhanced?: boolean
  text: string
  applied: boolean
  edits: Record<string, string>
}

function payloadFromScan(scan: QueuedScan): Record<string, unknown> {
  const e = scan.edits
  const p = scan.analysis.payload

  switch (p.kind) {
    case "customer":
      return {
        name: e.name ?? p.data.name?.value ?? "",
        mc_number: e.mc_number ?? p.data.mcNumber?.value ?? "",
        dot_number: e.dot_number ?? p.data.dotNumber?.value ?? "",
        billing_email: e.billing_email ?? p.data.billingEmail?.value ?? "",
        payment_terms_days: Number(e.payment_terms_days ?? p.data.paymentTermsDays?.value ?? 30),
        phone: e.phone ?? p.data.phone?.value ?? "",
        type: p.data.type?.value ?? "broker",
        factored: e.factored === "true",
      }
    case "registration":
      return {
        unit_number: e.unit_number ?? p.data.unitNumber?.value ?? "",
        vin: e.vin ?? p.data.vin?.value ?? "",
        plate: e.plate ?? p.data.plate?.value ?? "",
        plate_state: e.plate_state ?? p.data.plateState?.value ?? "",
        registration_expiry: e.registration_expiry ?? p.data.registrationExpiry?.value ?? "",
        year: p.data.year?.value ?? null,
      }
    case "cdl":
      return {
        first_name: e.first_name ?? p.data.firstName?.value ?? "",
        last_name: e.last_name ?? p.data.lastName?.value ?? "",
        cdl_number: e.cdl_number ?? p.data.cdlNumber?.value ?? "",
        cdl_state: e.cdl_state ?? p.data.cdlState?.value ?? "",
        cdl_expiry: e.cdl_expiry ?? p.data.cdlExpiry?.value ?? "",
      }
    case "med_card":
      return {
        first_name: e.first_name ?? p.data.firstName?.value ?? "",
        last_name: e.last_name ?? p.data.lastName?.value ?? "",
        medical_card_expiry: e.medical_card_expiry ?? p.data.medicalCardExpiry?.value ?? "",
      }
    case "w9":
      return { businessName: e.business_name ?? p.data.businessName?.value ?? "" }
    case "coi":
      return { expiry: e.expiry ?? p.data.expiry?.value ?? "" }
    case "spreadsheet":
      return { hint: p.data.hint }
    default:
      return {}
  }
}

function defaultEdits(payload: ParsedDocPayload): Record<string, string> {
  const edits: Record<string, string> = {}
  const set = (key: string, val?: { value: unknown }) => {
    if (val?.value != null && val.value !== "") edits[key] = String(val.value)
  }

  switch (payload.kind) {
    case "customer":
      set("name", payload.data.name)
      set("mc_number", payload.data.mcNumber)
      set("dot_number", payload.data.dotNumber)
      set("billing_email", payload.data.billingEmail)
      if (payload.data.paymentTermsDays) edits.payment_terms_days = String(payload.data.paymentTermsDays.value)
      set("phone", payload.data.phone)
      break
    case "registration":
      set("unit_number", payload.data.unitNumber)
      set("vin", payload.data.vin)
      set("plate", payload.data.plate)
      set("plate_state", payload.data.plateState)
      set("registration_expiry", payload.data.registrationExpiry)
      break
    case "cdl":
      set("first_name", payload.data.firstName)
      set("last_name", payload.data.lastName)
      set("cdl_number", payload.data.cdlNumber)
      set("cdl_state", payload.data.cdlState)
      set("cdl_expiry", payload.data.cdlExpiry)
      break
    case "med_card":
      set("first_name", payload.data.firstName)
      set("last_name", payload.data.lastName)
      set("medical_card_expiry", payload.data.medicalCardExpiry)
      break
    case "coi":
      set("expiry", payload.data.expiry)
      break
    case "w9":
      set("business_name", payload.data.businessName)
      break
    default:
      break
  }
  return edits
}

const APPLYABLE: DocKind[] = [
  "customer", "registration", "cdl", "med_card", "w9", "coi", "spreadsheet", "rate_con",
]

function ScanCard({
  scan,
  onApply,
  onRemove,
  onEdit,
  pending,
}: {
  scan: QueuedScan
  onApply: () => void
  onRemove: () => void
  onEdit: (key: string, value: string) => void
  pending: boolean
}) {
  const p = scan.analysis.payload
  const canApply = APPLYABLE.includes(scan.analysis.kind) && !scan.applied

  const fields: { key: string; label: string; show: boolean }[] =
    p.kind === "customer"
      ? [
          { key: "name", label: "Company name", show: true },
          { key: "mc_number", label: "MC # (FMCSA lookup)", show: true },
          { key: "dot_number", label: "DOT #", show: true },
          { key: "billing_email", label: "Billing email", show: true },
          { key: "payment_terms_days", label: "Net days", show: true },
        ]
      : p.kind === "registration"
        ? [
            { key: "unit_number", label: "Unit #", show: true },
            { key: "vin", label: "VIN", show: true },
            { key: "plate", label: "Plate", show: true },
            { key: "plate_state", label: "State", show: true },
            { key: "registration_expiry", label: "Expires (YYYY-MM-DD)", show: true },
          ]
        : p.kind === "cdl" || p.kind === "med_card"
          ? [
              { key: "first_name", label: "First name", show: true },
              { key: "last_name", label: "Last name", show: true },
              ...(p.kind === "cdl"
                ? [
                    { key: "cdl_number", label: "CDL #", show: true },
                    { key: "cdl_state", label: "State", show: true },
                    { key: "cdl_expiry", label: "CDL expires", show: true },
                  ]
                : [{ key: "medical_card_expiry", label: "Med card expires", show: true }]),
            ]
          : []

  return (
    <Panel className={cn("p-4", scan.applied && "border-ok-soft opacity-80")}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-label text-accent-text uppercase flex items-center gap-1.5">
            {scan.analysis.label}
            {scan.aiEnhanced ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-accent-soft bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-text">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </span>
            ) : null}
          </p>
          <p className="text-body-sm text-fg-2 truncate max-w-[240px]">{scan.fileName}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={scan.applied}
          className="rounded-lg p-2 text-fg-3 hover:bg-hover hover:text-fg min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {scan.analysis.summary.map((chip) => (
          <span key={chip} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-fg-2">
            {chip}
          </span>
        ))}
      </div>

      {scan.analysis.kind === "customer" ? (
        <p className="text-body-xs text-fg-3 mb-3">
          Enter MC or DOT — LoadOff pulls authority and legal name from FMCSA when you apply.
        </p>
      ) : null}

      {fields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {fields.filter((f) => f.show).map((f) => (
            <label key={f.key} className="block">
              <span className="text-label text-fg-3 uppercase text-[10px]">{f.label}</span>
              <input
                className={`${fieldCls} mt-1`}
                value={scan.edits[f.key] ?? ""}
                onChange={(e) => onEdit(f.key, e.target.value)}
                disabled={scan.applied}
              />
            </label>
          ))}
        </div>
      ) : null}

      {scan.analysis.kind === "rate_con" ? (
        <p className="text-body-sm text-fg-2 mb-3">
          Opens the paste-intake flow with this rate con pre-loaded so you can book in one minute.
        </p>
      ) : null}

      {scan.analysis.kind === "spreadsheet" ? (
        <p className="text-body-sm text-fg-2 mb-3">
          Sends you to the column-mapping import wizard — map once, reuse forever.
        </p>
      ) : null}

      {canApply ? (
        <button
          type="button"
          onClick={onApply}
          disabled={pending}
          className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {scan.analysis.kind === "rate_con" ? "Book this load" : "Apply to LoadOff"}
        </button>
      ) : scan.applied ? (
        <p className="text-sm font-semibold text-ok flex items-center gap-2">
          <Check className="h-4 w-4" /> Applied
        </p>
      ) : (
        <p className="text-body-sm text-fg-3">Could not classify — paste clearer text below and re-scan.</p>
      )}
    </Panel>
  )
}

export function SmartSetup({
  progress,
}: {
  progress: { trucks: number; drivers: number; customers: number; packetDocs: number }
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedScan[]>([])
  const [pasteText, setPasteText] = useState("")
  const [scanning, setScanning] = useState(false)
  const [pending, startTransition] = useTransition()

  const processText = useCallback(async (text: string, fileName: string, file: File | null) => {
    let analysis = analyzeDocument(text, fileName)
    let aiEnhanced = false
    try {
      const enhanced = await analyzeSmartSetupAction(text, fileName)
      analysis = enhanced.analysis
      aiEnhanced = enhanced.aiEnhanced
    } catch {
      // Offline or unauthenticated preview — heuristic only
    }
    setQueue((q) => [
      ...q,
      {
        id: crypto.randomUUID(),
        fileName,
        file,
        analysis,
        aiEnhanced,
        text,
        applied: false,
        edits: defaultEdits(analysis.payload),
      },
    ])
  }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setScanning(true)
    try {
      for (const file of Array.from(files)) {
        const { text, warning } = await extractTextFromFile(file)
        if (warning) toast.warning(warning)
        if (text.trim()) {
          await processText(text, file.name, file)
        } else if (!warning) {
          toast.error(`No text in ${file.name}`)
        }
      }
    } finally {
      setScanning(false)
    }
  }

  const handlePasteScan = () => {
    if (!pasteText.trim()) return
    void processText(pasteText, "Pasted text", null)
    setPasteText("")
  }

  const applyScan = (scan: QueuedScan) => {
    startTransition(async () => {
      if (scan.analysis.kind === "rate_con") {
        stashRateConForPaste(scan.text)
        router.push("/hub/loads/paste")
        return
      }

      const formData = new FormData()
      formData.set("kind", scan.analysis.kind)
      formData.set("payload", JSON.stringify(payloadFromScan(scan)))
      if (scan.file) formData.set("file", scan.file)

      const result = await applySmartScanAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not apply")
        return
      }
      toast.success(result.message ?? "Saved")
      setQueue((q) => q.map((s) => (s.id === scan.id ? { ...s, applied: true } : s)))
      if (result.href) router.push(result.href)
      else router.refresh()
    })
  }

  const totalSteps = 4
  const doneSteps = [
    progress.trucks > 0,
    progress.drivers > 0,
    progress.customers > 0,
    progress.packetDocs > 0,
  ].filter(Boolean).length

  return (
    <div className="space-y-5">
      <Panel className="p-4 md:p-5 border-accent-soft">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-fg flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-accent-text" /> Smart Setup
            </h2>
            <p className="text-body-sm text-fg-2 mt-1 max-w-xl">
              Drop your paperwork — rate cons, registrations, CDLs, W-9s, broker MC letters, fuel CSVs.
              LoadOff reads them, you confirm, it creates the records. Brokers only need MC/DOT; FMCSA fills the rest.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-label text-fg-3 uppercase">Setup progress</p>
            <p className="font-mono text-2xl font-medium text-fg tabular-nums">{doneSteps}/{totalSteps}</p>
            <p className="text-body-xs text-fg-3">trucks · drivers · brokers · packet</p>
          </div>
        </div>
      </Panel>

      <div
        className={cn(
          "rounded-2xl border-2 border-dashed border-border-strong p-6 text-center cursor-pointer hover:border-accent transition-colors",
          scanning && "opacity-60 pointer-events-none"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => {
          e.preventDefault()
          void handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.csv,.txt,.tsv,image/*,application/pdf,text/csv"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {scanning ? (
          <Loader2 className="h-10 w-10 text-accent-text animate-spin mx-auto mb-3" />
        ) : (
          <Upload className="h-10 w-10 text-accent-text mx-auto mb-3" />
        )}
        <p className="text-[15px] font-semibold text-fg">
          Drop files here or tap to upload
        </p>
        <p className="text-body-sm text-fg-3 mt-1">
          PDF, CSV, photos · batch upload OK · phone camera works
        </p>
      </div>

      <Panel className="p-4">
        <h3 className="text-[15px] font-semibold text-fg mb-2 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-accent-text" /> Or paste text from an email / PDF
        </h3>
        <textarea
          rows={4}
          className={`${fieldCls} h-auto py-3 font-mono text-xs`}
          placeholder="Paste rate con, broker letter, registration text…"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <button
          type="button"
          onClick={handlePasteScan}
          disabled={!pasteText.trim()}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-control border border-border-strong px-5 text-sm font-semibold text-fg hover:bg-hover disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-accent-text" /> Scan pasted text
        </button>
      </Panel>

      {queue.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-fg-2">
            Review &amp; apply ({queue.filter((s) => !s.applied).length} waiting)
          </h3>
          {queue.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              pending={pending}
              onApply={() => applyScan(scan)}
              onRemove={() => setQueue((q) => q.filter((s) => s.id !== scan.id))}
              onEdit={(key, value) =>
                setQueue((q) =>
                  q.map((s) => (s.id === scan.id ? { ...s, edits: { ...s.edits, [key]: value } } : s))
                )
              }
            />
          ))}
        </div>
      ) : null}

      <Panel className="p-4 bg-surface-2">
        <p className="text-body-sm text-fg-3">
          <strong className="text-fg-2">What Smart Setup handles:</strong> brokers (MC/DOT + FMCSA),
          trucks (VIN decode), drivers (CDL/med card), carrier packet (W-9/COI), load history CSV,
          rate cons → book load. Still type pay rules yourself — one paragraph per driver on their profile.
        </p>
        <LinkRow href="/hub/import" label="Spreadsheet import (loads, fuel, tolls)" />
        <LinkRow href="/hub/settings/packet" label="Carrier packet vault" />
      </Panel>
    </div>
  )
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="mt-2 flex items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-accent-text hover:bg-hover min-h-[44px]"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  )
}
