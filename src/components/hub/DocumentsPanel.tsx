"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import { uploadDocumentAction, deleteDocumentAction } from "@/app/hub/_actions/loads"
import { fieldCls, Panel } from "@/components/hub/ui"
import { DOCUMENT_KIND_LABELS, type DocumentKind, type HubDocument } from "@/lib/hub/types"

const ENTITY_DOC_KINDS: Record<string, DocumentKind[]> = {
  load: ["rate_confirmation", "bol", "pod", "receipt", "other"],
  truck: ["registration", "inspection", "insurance", "other"],
  trailer: ["registration", "inspection", "other"],
  driver: ["cdl", "medical_card", "other"],
  customer: ["w9", "insurance", "agreement", "other"],
  incident: ["incident_photo", "other"],
  facility: ["facility_photo", "other"],
  applicant: ["psp_report", "mvr", "cdl", "medical_card", "offer_letter", "drug_test", "road_test", "other"],
}

export function DocumentsPanel({
  entityType,
  entityId,
  documents,
}: {
  entityType: "load" | "truck" | "trailer" | "driver" | "customer" | "incident" | "facility" | "applicant"
  entityId: string
  documents: HubDocument[]
}) {
  const [kind, setKind] = useState<DocumentKind>(ENTITY_DOC_KINDS[entityType][0])
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const kinds = ENTITY_DOC_KINDS[entityType]

  const upload = (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error("Pick a file first")
      return
    }
    const formData = new FormData()
    formData.set("entity_type", entityType)
    formData.set("entity_id", entityId)
    formData.set("kind", kind)
    formData.set("file", file)
    startTransition(async () => {
      const result = await uploadDocumentAction(formData)
      if (result.ok) {
        toast.success(`${DOCUMENT_KIND_LABELS[kind]} uploaded`)
        if (fileRef.current) fileRef.current.value = ""
      } else {
        toast.error(result.error ?? "Upload failed")
      }
    })
  }

  const remove = (doc: HubDocument) =>
    startTransition(async () => {
      const result = await deleteDocumentAction(doc.id, entityType, entityId)
      if (result.ok) toast.success("Document removed")
      else toast.error(result.error ?? "Delete failed")
    })

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">
        Documents
      </h2>

      <form onSubmit={upload} className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          aria-label="Document type"
          className={`${fieldCls} sm:w-44`}
          value={kind}
          onChange={(e) => setKind(e.target.value as DocumentKind)}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>{DOCUMENT_KIND_LABELS[k]}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          aria-label="File"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className={`${fieldCls} h-auto py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-bold text-gold hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
      </form>

      {documents.length === 0 ? (
        <p className="text-body-sm text-steel-300">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-steel-300" />
              <div className="min-w-0 flex-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-semibold text-white hover:text-gold"
                >
                  {doc.file_name}
                </a>
                <p className="text-body-xs text-steel-400">
                  {DOCUMENT_KIND_LABELS[doc.kind]} ·{" "}
                  {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <button
                aria-label={`Delete ${doc.file_name}`}
                onClick={() => remove(doc)}
                disabled={pending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
