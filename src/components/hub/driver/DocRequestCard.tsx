"use client"

/** Document request pinned to the driver home until satisfied (E3). */
import { useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, FileQuestion, Loader2 } from "lucide-react"
import { driverUploadDocument } from "@/app/hub/_actions/driver"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { DOCUMENT_KIND_LABELS, type DocumentKind } from "@/lib/hub/types"

export function DocRequestCard({
  request,
}: {
  request: {
    id: string
    kind: string
    note: string | null
    load_id: string | null
    load_reference?: string | null
    requested_by_name: string | null
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const kindLabel = DOCUMENT_KIND_LABELS[request.kind as DocumentKind] ?? request.kind

  const upload = (file: File | undefined) => {
    if (!file || !request.load_id) return
    const loadId = request.load_id
    const kind = ["pod", "bol", "receipt"].includes(request.kind) ? request.kind : "other"
    startTransition(async () => {
      const buffer = await file.arrayBuffer()
      const result = await runOrQueue(
        {
          kind: "upload",
          payload: { loadId, kind, requestId: request.id },
          file: { name: file.name, type: file.type, buffer },
        },
        () => {
          const formData = new FormData()
          formData.set("load_id", loadId)
          formData.set("kind", kind)
          formData.set("request_id", request.id)
          formData.set("file", file)
          return driverUploadDocument(formData)
        }
      )
      if ("queued" in result && result.queued) {
        toast.success("No signal — saved on your phone, sends automatically")
      } else if (result.ok) {
        toast.success("Sent — request cleared")
        router.refresh()
      } else toast.error(("error" in result && result.error) || "Upload failed")
    })
  }

  return (
    <section className="rounded-2xl border border-orange/30 bg-orange/[0.06] p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-orange">
        <FileQuestion className="h-4 w-4" /> The office needs something
      </p>
      <p className="mt-1 font-semibold text-white">
        {kindLabel}
        {request.load_reference ? ` for ${request.load_reference}` : ""}
      </p>
      {request.note ? <p className="text-body-sm text-steel-200">{request.note}</p> : null}
      {request.load_id ? (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Snap & send it
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </>
      ) : (
        <p className="mt-2 text-body-xs text-steel-400">
          Bring this to the office or send it in your messages.
        </p>
      )}
    </section>
  )
}
