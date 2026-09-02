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
import { ShieldCheck,
  Camera, Check, ChevronRight, Clock, Loader2, MapPin, MessageSquarePlus, Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  driverAcknowledgeDispatch, driverAddFacilityNote, driverAdvanceStatus,
  driverStopTimestamp, driverUploadDocument, driverVerifyPickup,
} from "@/app/hub/_actions/driver"
import { openThread } from "@/app/hub/_actions/messages"
import { BottomSheet } from "@/components/hub/BottomSheet"
import { runOrQueue, type PendingIntent } from "@/components/hub/driver/offline-queue"
import {
  btnDriverPrimaryCls, btnDriverSecondaryCls, fieldDarkCls, fieldDarkTextareaCls,
} from "@/components/hub/ui"
import { FACILITY_NOTE_TAGS, fmtCentsExact, type Stop } from "@/lib/hub/types"

interface LoadForDriver {
  /** Newest pickup verification result (driver-app.ts). Hides the verify panel once verified. */
  pickup_verification?: "verified" | "mismatch" | "unverified" | null
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

/**
 * Outline action tinted with the carrier's accent (acknowledge, camera).
 * Inline color-mix on purpose: Tailwind drops `bg-<var>/NN` on CSS-var colours
 * (AGENTS.md), and the class-level `--driver-accent` fill is the PRIMARY rung.
 */
const ACCENT_OUTLINE_STYLE = {
  borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--driver-accent) 12%, transparent)",
} as const

function fmtAppt(start: string | null, end: string | null, fcfs: boolean): string {
  if (fcfs) return "First come, first served"
  if (!start) return "No appointment set"
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  return end ? `${fmt(start)} – ${new Date(end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : fmt(start)
}

/** What this run pays the driver — their own figure, never the linehaul. */
export interface RunPayForDriver {
  cents: number
  label: string
}

export function DriverLoadCard({
  load,
  detentionFreeMinutes,
  pay = null,
}: {
  load: LoadForDriver
  detentionFreeMinutes: number
  pay?: RunPayForDriver | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadKind, setUploadKind] = useState<"pod" | "receipt" | "bol">("pod")
  const [osdFlag, setOsdFlag] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  // Pickup verification (#14): its own input and its own submit. Deliberately
  // NOT routed through the offline queue — an offline "I'm here" must keep
  // recording exactly as before; the evidence is simply absent until signal.
  const verifyRef = useRef<HTMLInputElement>(null)
  const [verifyingStop, setVerifyingStop] = useState<string | null>(null)
  const [verifiedHere, setVerifiedHere] = useState<string | null>(null)

  const readFix = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      )
    })

  const verifyPickup = (stopId: string, file: File | undefined) => {
    if (!file) return
    startTransition(async () => {
      const fix = await readFix()
      const formData = new FormData()
      formData.set("load_id", load.id)
      formData.set("stop_id", stopId)
      if (fix) {
        formData.set("lat", String(fix.lat))
        formData.set("lng", String(fix.lng))
      }
      formData.set("file", file)
      const result = await driverVerifyPickup(formData)
      if (result.ok) {
        setVerifiedHere(stopId)
        toast.success(
          result.result === "verified"
            ? "Pickup verified — dispatch can see it"
            : result.result === "mismatch"
              ? "Sent — the location did not match, dispatch has been told"
              : fix
                ? "Sent — photo saved"
                : "Sent — no location on this phone, photo saved"
        )
        router.refresh()
      } else toast.error(result.error ?? "Could not verify the pickup")
      setVerifyingStop(null)
      if (verifyRef.current) verifyRef.current.value = ""
    })
  }
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
    <section className="driver-card overflow-hidden">
      {/* Banner — the glance tier: what state the run is in, then which run. */}
      <div className="flex items-center justify-between gap-3 border-b border-driver-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[20px] font-semibold leading-tight text-white">{STATUS_BANNER[load.status] ?? load.status}</p>
          <p className="mt-0.5 font-mono text-[13px] tabular-nums text-steel-300">{load.reference}</p>
        </div>
        <button
          onClick={message}
          aria-label="Message dispatch about this load"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-white/15 text-steel-200 hover:bg-white/10"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* What you're hauling */}
        <p className="text-body-sm text-steel-200">
          {load.commodity ?? "Freight"} · {load.equipment.replace("_", " ")}
          {load.truck_unit ? ` · Truck #${load.truck_unit}` : ""}
          {load.trailer_unit ? ` · Trailer #${load.trailer_unit}` : ""}
        </p>
        {/* What the run is worth to the person driving it. Computed on the
            server by the same engine that drafts settlements, so it is the
            number the office would actually pay — and it is the DRIVER's pay,
            never the rate the load billed for. */}
        {pay ? (
          <p className="driver-card driver-card--well flex flex-wrap items-baseline gap-x-2 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-steel-300">
              This run pays you
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums text-[color:var(--driver-accent)]">
              {fmtCentsExact(pay.cents)}
            </span>
            {pay.label ? <span className="text-[13px] text-steel-300">{pay.label}</span> : null}
          </p>
        ) : null}
        {load.notes ? (
          <p className="driver-card driver-card--well px-3 py-2 text-body-sm text-steel-200">
            Dispatch notes: {load.notes}
          </p>
        ) : null}

        {/* Acknowledge */}
        {!load.acknowledged_at && load.status === "dispatched" ? (
          <button
            onClick={() => run({ kind: "ack", payload: { loadId: load.id } }, () => driverAcknowledgeDispatch(load.id), "Dispatch confirmed — drive safe")}
            disabled={pending}
            className={cn(btnDriverSecondaryCls, "text-[color:var(--driver-accent)]")}
            style={ACCENT_OUTLINE_STYLE}
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
              <li key={stop.id} className={cn("driver-card driver-card--well p-3", done && "opacity-70")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">
                      {stop.type === "pickup" ? "Pick up" : "Deliver"}
                    </p>
                    <p className="text-xl font-semibold leading-snug text-white">
                      {stop.facility || `${stop.city}, ${stop.state}`}
                    </p>
                    <p className="text-[13px] text-steel-300">
                      {stop.city}, {stop.state}
                      {stop.pickup_number ? <> · PU# <span className="font-mono tabular-nums">{stop.pickup_number}</span></> : null}
                      {stop.po_number ? <> · PO# <span className="font-mono tabular-nums">{stop.po_number}</span></> : null}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[17px] text-steel-200">
                      <Clock className="h-4 w-4 shrink-0 text-[color:var(--driver-accent)]" /> {fmtAppt(stop.appt_start, stop.appt_end, stop.fcfs)}
                    </p>
                    {slow ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-orange-300/50 bg-orange/10 px-2.5 py-1 text-[13px] font-semibold text-orange-300">
                        Heads up: usually slow here (~{Math.round((stop.facility_avg_dwell ?? 0) / 60 * 10) / 10}h at the dock)
                      </p>
                    ) : null}
                    {stop.notes ? <p className="mt-1 text-[13px] text-steel-300">{stop.notes}</p> : null}
                    {(stop.facility_notes ?? []).length > 0 ? (
                      <div className="mt-2 space-y-1 rounded-control border border-white/10 bg-white/[0.03] p-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">Driver tips</p>
                        {(stop.facility_notes ?? []).map((note, i) => (
                          <p key={i} className="text-[13px] text-steel-200">
                            “{note.body}”{note.author ? <span className="text-steel-300"> — {note.author}</span> : null}
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
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-white/15 text-steel-200 hover:bg-white/10"
                  >
                    <Navigation className="h-5 w-5" />
                  </a>
                </div>

                {/* Arrive / depart taps */}
                <div className="mt-3 flex gap-3">
                  {canArrive ? (
                    <button
                      onClick={() => {
                        const at = new Date().toISOString()
                        run(
                          { kind: "stop", payload: { stopId: stop.id, loadId: load.id, field: "arrived_at", at } },
                          () => driverStopTimestamp(stop.id, load.id, "arrived_at", at),
                          "Arrival recorded"
                        )
                      }}
                      disabled={pending}
                      className={cn(btnDriverPrimaryCls, "flex-1")}
                    >
                      <MapPin className="h-5 w-5" /> I&apos;m here
                    </button>
                  ) : null}
                  {canDepart ? (
                    <button
                      onClick={() => {
                        const at = new Date().toISOString()
                        run(
                          { kind: "stop", payload: { stopId: stop.id, loadId: load.id, field: "departed_at", at } },
                          () => driverStopTimestamp(stop.id, load.id, "departed_at", at),
                          "Departure recorded"
                        )
                      }}
                      disabled={pending}
                      className={cn(btnDriverPrimaryCls, "flex-1")}
                    >
                      <ChevronRight className="h-5 w-5" /> Leaving now
                    </button>
                  ) : null}
                  {done ? (
                    <p className="flex min-h-[44px] items-center gap-1.5 text-[13px] text-steel-300">
                      <Check className="h-4 w-4 text-[color:var(--driver-accent)]" />
                      In {new Date(stop.arrived_at!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })},
                      out {new Date(stop.departed_at!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  ) : null}
                </div>

                {/* Pickup verification: after "I'm here" at a pickup, one photo of
                    the truck at the dock proves it is the truck that was dispatched. */}
                {stop.type === "pickup" && stop.arrived_at && !stop.departed_at &&
                 load.pickup_verification !== "verified" && verifiedHere !== stop.id ? (
                  <div className="driver-card driver-card--well mt-2 rounded-control p-3" data-testid="verify-pickup">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-steel-300">Verify this pickup</p>
                    <p className="mt-0.5 text-body-xs text-steel-300">
                      Snap the truck at the dock. Proves to the shipper and the broker it was us.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyingStop(stop.id)
                        verifyRef.current?.click()
                      }}
                      disabled={pending}
                      data-testid="verify-pickup-button"
                      className={cn(btnDriverSecondaryCls, "mt-2 text-[color:var(--driver-accent)]")}
                      style={ACCENT_OUTLINE_STYLE}
                    >
                      <ShieldCheck className="h-5 w-5 shrink-0" /> Snap the truck
                    </button>
                  </div>
                ) : null}
                {stop.type === "pickup" && (load.pickup_verification === "verified" || verifiedHere === stop.id) ? (
                  <p className="mt-2 flex items-center gap-1.5 text-body-xs font-semibold text-emerald-300" data-testid="pickup-verified-driver">
                    <ShieldCheck className="h-3.5 w-3.5" /> Pickup verified
                  </p>
                ) : null}

                {/* Two-tap facility note after departure (E2) */}
                {done && stop.facility_id ? (
                  <button
                    onClick={() => setNotingStop(stop)}
                    className="mt-1 flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[color:var(--driver-accent)] hover:opacity-80"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
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
            className={cn(btnDriverPrimaryCls, "min-h-[64px] text-lg")}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
            {advance}
          </button>
        ) : null}

        {/* Camera upload. The OS&D label stays a direct child of this div: the
            POD smokes walk from that label to its parent to find the file input. */}
        <div className="driver-card driver-card--well p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-steel-300">
            Send paperwork {load.status === "delivered" && !hasPod ? "— the office needs the POD to bill this load" : ""}
          </p>
          <div className="flex flex-col gap-3">
            <select
              aria-label="What is the photo"
              className={cn(fieldDarkCls, "h-12 md:h-12 font-semibold")}
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
              className={cn(btnDriverSecondaryCls, "text-[color:var(--driver-accent)]")}
              style={ACCENT_OUTLINE_STYLE}
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
            <input
              ref={verifyRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              data-testid="verify-pickup-file"
              onChange={(e) => {
                if (verifyingStop) verifyPickup(verifyingStop, e.target.files?.[0])
              }}
            />
          </div>
          {uploadKind === "pod" ? (
            <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={osdFlag}
                onChange={(e) => setOsdFlag(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-orange"
              />
              <span>
                <span className="block text-sm font-semibold text-white">Exceptions noted on the POD (OS&D)</span>
                <span className="block text-[13px] text-steel-300">
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
              className={cn(fieldDarkCls, "mt-3 h-12 md:h-12")}
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
    <BottomSheet
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={`How was ${stop.facility || `${stop.city}, ${stop.state}`}?`}
      description="Tap what applies — that's all it takes."
      variant="dark"
    >
      <div className="mb-4 flex flex-wrap gap-3">
        {FACILITY_NOTE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            aria-pressed={tags.includes(tag)}
            className={cn(
              "min-h-[44px] rounded-full border px-4 text-sm font-semibold capitalize",
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
        placeholder="Anything else? (optional)"
        className={fieldDarkTextareaCls}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onClose} className={cn(btnDriverSecondaryCls, "flex-1")}>
          Skip
        </button>
        <button
          type="button"
          onClick={() => onSave(body, tags)}
          disabled={pending || (tags.length === 0 && !body.trim())}
          className={cn(btnDriverPrimaryCls, "flex-1")}
        >
          Save tip
        </button>
      </div>
    </BottomSheet>
  )
}
