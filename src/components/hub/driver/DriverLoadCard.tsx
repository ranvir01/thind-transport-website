"use client"

/**
 * The driver's load card: everything about the run, one thumb.
 * - Big status button ("I'm at the pickup" → "Rolling" → "Delivered")
 * - Arrive/depart taps per stop (detention math starts here)
 * - Camera upload for POD/BOL/receipts
 * - Facility heads-up (slow receiver warning) + two-tap note after departure
 */
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Camera, Check, ChevronRight, Clock, Loader2, MapPin, MessageSquarePlus, Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  driverAcknowledgeDispatch, driverAddFacilityNote, driverAdvanceStatus,
  driverStopTimestamp, driverUploadDocument,
} from "@/app/hub/_actions/driver"
import { openThread } from "@/app/hub/_actions/messages"
import { runOrQueue, type PendingIntent } from "@/components/hub/driver/offline-queue"
import { FACILITY_NOTE_TAGS, type Stop } from "@/lib/hub/types"

interface LoadForDriver {
  id: string
  reference: string
  status: string
  customer_name?: string | null
  commodity: string | null
  equipment: string
  truck_unit?: string | null
  trailer_unit?: string | null
  acknowledged_at: string | null
  doc_kinds?: string[] | null
  notes: string | null
  stops?: Stop[]
}

const ADVANCE_LABEL: Record<string, string> = {
  dispatched: "I'm heading to the pickup",
  at_pickup: "Loaded — rolling now",
  in_transit: "Delivered",
}

const STATUS_BANNER: Record<string, string> = {
  dispatched: "New dispatch",
  at_pickup: "At the pickup",
  in_transit: "On the road",
  delivered: "Delivered — send the POD",
}

function fmtAppt(start: string | null, end: string | null, fcfs: boolean): string {
  if (fcfs) return "First come, first served"
  if (!start) return "No appointment set"
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  return end ? `${fmt(start)} – ${new Date(end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : fmt(start)
}

export function DriverLoadCard({ load, detentionFreeMinutes }: { load: LoadForDriver; detentionFreeMinutes: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadKind, setUploadKind] = useState<"pod" | "receipt" | "bol">("pod")
  const [osdFlag, setOsdFlag] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [notingStop, setNotingStop] = useState<Stop | null>(null)

  // Every tap runs through the offline queue: no signal, no lost updates.
  const run = (
    intent: Extract<PendingIntent, { kind: "status" | "stop" | "ack" }>,
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string
  ) =>
    startTransition(async () => {
      const result = await runOrQueue(intent, action)
      if ("queued" in result && result.queued) {
        toast.success("No signal — saved on your phone, sends automatically")
      } else if (result.ok) {
        toast.success(success)
        router.refresh()
      } else toast.error(("error" in result && result.error) || "Something went wrong")
    })

  const upload = (file: File | undefined) => {
    if (!file) return
    startTransition(async () => {
      const buffer = await file.arrayBuffer()
      const result = await runOrQueue(
        {
          kind: "upload",
          payload: {
            loadId: load.id, kind: uploadKind,
            osd: uploadKind === "pod" && osdFlag ? 1 : undefined,
            amount: uploadKind === "receipt" && receiptAmount ? receiptAmount : undefined,
          },
          file: { name: file.name, type: file.type, buffer },
        },
        () => {
          const formData = new FormData()
          formData.set("load_id", load.id)
          formData.set("kind", uploadKind)
          if (uploadKind === "pod" && osdFlag) formData.set("osd", "1")
          if (uploadKind === "receipt" && receiptAmount) formData.set("amount", receiptAmount)
          formData.set("file", file)
          return driverUploadDocument(formData)
        }
      )
      if ("queued" in result && result.queued) {
        toast.success("No signal — photo saved, sends automatically")
      } else if (result.ok) {
        toast.success(
          uploadKind === "pod" && osdFlag
            ? "POD sent with exceptions noted — the office opened a claim file"
            : `${uploadKind.toUpperCase()} sent to the office`
        )
        setOsdFlag(false)
        setReceiptAmount("")
        router.refresh()
      } else toast.error(("error" in result && result.error) || "Upload failed")
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  const message = () =>
    startTransition(async () => {
      const result = await openThread({ loadId: load.id })
      if (result.ok && result.threadId) router.push(`/hub/driver/messages/${result.threadId}`)
      else toast.error(result.error ?? "Could not open the chat")
    })

  const advance = ADVANCE_LABEL[load.status]
  const hasPod = (load.doc_kinds ?? []).includes("pod")

  return (
    <section className="rounded-2xl border border-white/10 bg-navy-800/80 overflow-hidden">
      {/* Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">{STATUS_BANNER[load.status] ?? load.status}</p>
          <p className="font-semibold text-lg text-white">{load.reference}</p>
        </div>
        <button
          onClick={message}
          aria-label="Message dispatch about this load"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-steel-200 hover:bg-white/5"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* What you're hauling */}
        <p className="text-body-sm text-steel-200">
          {load.commodity ?? "Freight"} · {load.equipment.replace("_", " ")}
          {load.truck_unit ? ` · Truck #${load.truck_unit}` : ""}
          {load.trailer_unit ? ` · Trailer #${load.trailer_unit}` : ""}
        </p>
        {load.notes ? (
          <p className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-body-sm text-steel-200">
            Dispatch notes: {load.notes}
          </p>
        ) : null}

        {/* Acknowledge */}
        {!load.acknowledged_at && load.status === "dispatched" ? (
          <button
            onClick={() => run({ kind: "ack", payload: { loadId: load.id } }, () => driverAcknowledgeDispatch(load.id), "Dispatch confirmed — drive safe")}
            disabled={pending}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border font-display text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--driver-accent)] hover:bg-white/5 disabled:opacity-60"
            style={{
              borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--driver-accent) 15%, transparent)",
            }}
          >
            <Check className="h-5 w-5" /> Got it — confirm this dispatch
          </button>
        ) : null}

        {/* Stops */}
        <ol className="space-y-3">
          {(load.stops ?? []).map((stop) => {
            const slow = stop.facility_avg_dwell != null && stop.facility_avg_dwell >= detentionFreeMinutes
            const canArrive = !stop.arrived_at
            const canDepart = stop.arrived_at && !stop.departed_at
            const done = Boolean(stop.departed_at)
            const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
              [stop.address, stop.city, stop.state, stop.zip].filter(Boolean).join(", ")
            )}`
            return (
              <li key={stop.id} className={cn("rounded-xl border p-3", done ? "border-white/10 bg-white/[0.02] opacity-70" : "border-white/10 bg-white/[0.04]")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-steel-400">
                      {stop.type === "pickup" ? "Pick up" : "Deliver"}
                    </p>
                    <p className="font-semibold text-white">
                      {stop.facility || `${stop.city}, ${stop.state}`}
                    </p>
                    <p className="text-body-xs text-steel-400">
                      {stop.city}, {stop.state}
                      {stop.pickup_number ? ` · PU# ${stop.pickup_number}` : ""}
                      {stop.po_number ? ` · PO# ${stop.po_number}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-body-xs text-steel-200">
                      <Clock className="h-3.5 w-3.5 text-[color:var(--driver-accent)]" /> {fmtAppt(stop.appt_start, stop.appt_end, stop.fcfs)}
                    </p>
                    {slow ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5 text-[11px] font-bold text-orange">
                        Heads up: usually slow here (~{Math.round((stop.facility_avg_dwell ?? 0) / 60 * 10) / 10}h at the dock)
                      </p>
                    ) : null}
                    {stop.notes ? <p className="mt-1 text-body-xs text-steel-400">{stop.notes}</p> : null}
                    {(stop.facility_notes ?? []).length > 0 ? (
                      <div className="mt-1.5 space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">Driver tips</p>
                        {(stop.facility_notes ?? []).map((note, i) => (
                          <p key={i} className="text-body-xs text-steel-200">
                            “{note.body}”{note.author ? <span className="text-steel-400"> — {note.author}</span> : null}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Navigate"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-steel-200 hover:bg-white/5"
                  >
                    <Navigation className="h-5 w-5" />
                  </a>
                </div>

                {/* Arrive / depart taps */}
                <div className="mt-2 flex gap-2">
                  {canArrive ? (
                    <button
                      onClick={() => run({ kind: "stop", payload: { stopId: stop.id, loadId: load.id, field: "arrived_at" } }, () => driverStopTimestamp(stop.id, load.id, "arrived_at"), "Arrival recorded")}
                      disabled={pending}
                      className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                    >
                      <MapPin className="h-4 w-4" /> I&apos;m here
                    </button>
                  ) : null}
                  {canDepart ? (
                    <button
                      onClick={() => run({ kind: "stop", payload: { stopId: stop.id, loadId: load.id, field: "departed_at" } }, () => driverStopTimestamp(stop.id, load.id, "departed_at"), "Departure recorded")}
                      disabled={pending}
                      className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                    >
                      <ChevronRight className="h-4 w-4" /> Leaving now
                    </button>
                  ) : null}
                  {done ? (
                    <p className="flex items-center gap-1.5 text-body-xs text-steel-400">
                      <Check className="h-3.5 w-3.5 text-[color:var(--driver-accent)]" />
                      In {new Date(stop.arrived_at!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })},
                      out {new Date(stop.departed_at!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  ) : null}
                </div>

                {/* Two-tap facility note after departure (E2) */}
                {done && stop.facility_id ? (
                  <button
                    onClick={() => setNotingStop(stop)}
                    className="mt-2 flex items-center gap-1.5 text-body-xs font-semibold text-[color:var(--driver-accent)] hover:opacity-80 min-h-[44px]"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Leave a tip about this place for other drivers
                  </button>
                ) : null}
              </li>
            )
          })}
        </ol>

        {/* Big advance button */}
        {advance ? (
          <button
            onClick={() => run({ kind: "status", payload: { loadId: load.id } }, () => driverAdvanceStatus(load.id), "Status updated — dispatch can see it")}
            disabled={pending}
            className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-control bg-accent font-display text-base font-bold uppercase tracking-[0.08em] text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
            {advance}
          </button>
        ) : null}

        {/* Camera upload */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-steel-400 mb-2">
            Send paperwork {load.status === "delivered" && !hasPod ? "— the office needs the POD to bill this load" : ""}
          </p>
          <div className="flex gap-2">
            <select
              aria-label="What is the photo"
              className="min-h-[48px] w-[132px] shrink-0 truncate rounded-xl border border-white/15 bg-navy-600 px-3 text-sm font-semibold text-white"
              value={uploadKind}
              onChange={(e) => setUploadKind(e.target.value as "pod" | "receipt" | "bol")}
            >
              <option value="pod">Signed POD</option>
              <option value="bol">BOL</option>
              <option value="receipt">Receipt (lumper/scale)</option>
            </select>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="flex flex-1 min-w-0 min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border font-display text-sm font-bold uppercase tracking-[0.06em] text-[color:var(--driver-accent)] hover:bg-white/5 disabled:opacity-60"
              style={{
                borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
              }}
            >
              <Camera className="h-5 w-5 shrink-0" /> Snap & send
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
          {uploadKind === "pod" ? (
            <label className="mt-2 flex items-start gap-2.5 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={osdFlag}
                onChange={(e) => setOsdFlag(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-white/15 accent-orange"
              />
              <span>
                <span className="block text-sm font-semibold text-white">Exceptions noted on the POD (OS&D)</span>
                <span className="block text-body-xs text-steel-400">
                  Shortages, damage, overages — checking this starts the claim file right now.
                </span>
              </span>
            </label>
          ) : null}
          {uploadKind === "receipt" ? (
            <input
              aria-label="Receipt amount"
              placeholder="Amount on the receipt ($) — makes it a reimbursement"
              inputMode="decimal"
              className="mt-2 w-full min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-steel-400"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
            />
          ) : null}
        </div>
      </div>

      {/* Facility note sheet */}
      {notingStop ? (
        <FacilityNoteSheet
          stop={notingStop}
          pending={pending}
          onClose={() => setNotingStop(null)}
          onSave={(body, tags) =>
            startTransition(async () => {
              const facilityId = notingStop.facility_id!
              const result = await runOrQueue(
                { kind: "facility-note", payload: { facilityId, body, tags } },
                () => driverAddFacilityNote({ facilityId, body, tags })
              )
              if ("queued" in result && result.queued) {
                toast.success("No signal — tip saved on your phone, sends automatically")
                setNotingStop(null)
              } else if (result.ok) {
                toast.success("Thanks — every driver after you sees this")
                setNotingStop(null)
                router.refresh()
              } else toast.error(("error" in result && result.error) || "Could not save")
            })
          }
        />
      ) : null}
    </section>
  )
}

function FacilityNoteSheet({
  stop,
  pending,
  onClose,
  onSave,
}: {
  stop: Stop
  pending: boolean
  onClose: () => void
  onSave: (body: string, tags: string[]) => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [body, setBody] = useState("")

  const toggle = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-white/10 bg-navy-600 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[13.5px] font-semibold text-white">
          How was {stop.facility || `${stop.city}, ${stop.state}`}?
        </p>
        <p className="text-body-xs text-steel-400 mb-3">Tap what applies — that&apos;s all it takes.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {FACILITY_NOTE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold capitalize min-h-[44px]",
                tags.includes(tag) ? "text-[color:var(--driver-accent)]" : "border-white/15 bg-white/5 text-steel-200"
              )}
              style={
                tags.includes(tag)
                  ? {
                      borderColor: "color-mix(in srgb, var(--driver-accent) 60%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--driver-accent) 20%, transparent)",
                    }
                  : undefined
              }
            >
              {tag}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          placeholder="Anything else? (optional)"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-steel-400"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-white/15 font-display text-sm font-bold uppercase tracking-[0.06em] text-steel-200 hover:bg-white/5"
          >
            Skip
          </button>
          <button
            onClick={() => onSave(body, tags)}
            disabled={pending || (tags.length === 0 && !body.trim())}
            className="flex-1 min-h-[48px] rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            Save tip
          </button>
        </div>
      </div>
    </div>
  )
}
