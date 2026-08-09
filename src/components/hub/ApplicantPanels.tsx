"use client"

/** Applicant detail panels (E5): offer + e-sign, orientation gate, conversion, referral. */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, FileSignature, Loader2, UserCheck, UserPlus } from "lucide-react"
import {
  attachReferralAction, convertApplicantAction, createOfferAction,
  signOfferAction, toggleOrientationAction,
} from "@/app/hub/_actions/recruiting"
import { SignaturePad } from "@/components/hub/SignaturePad"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

interface OfferShape {
  id: string
  pay_summary: string
  start_date: string | null
  body: string
  status: string
  signed_name: string | null
  signed_at: string | null
}

export function OfferPanel({
  applicantId,
  applicantName,
  offer,
}: {
  applicantId: string
  applicantName: string
  offer: OfferShape | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    paySummary: "",
    startDate: "",
    body: `We're glad to offer you a driving position. Pay as summarized above, weekly settlements, home time honored through the planner. This offer is contingent on a clean pre-employment drug screen and the DOT qualification file.`,
  })
  const [signature, setSignature] = useState<string | null>(null)

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createOfferAction(applicantId, form)
      if (result.ok) {
        toast.success("Offer created — hand them the screen to sign")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }

  const sign = () =>
    startTransition(async () => {
      if (!offer || !signature) return
      const result = await signOfferAction(applicantId, offer.id, signature, applicantName)
      if (result.ok) {
        toast.success("Signed — orientation unlocked")
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-3">
        <FileSignature className="h-4 w-4 text-accent-text" /> Offer letter
      </h2>

      {!offer ? (
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="offer-pay" className={labelCls}>Pay summary</label>
              <input
                id="offer-pay" required className={fieldCls}
                placeholder="$0.63/mile loaded, weekly settlements"
                value={form.paySummary}
                onChange={(e) => setForm({ ...form, paySummary: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="offer-start" className={labelCls}>Start date</label>
              <input
                id="offer-start" type="date" className={fieldCls}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label htmlFor="offer-body" className={labelCls}>Letter</label>
            <textarea
              id="offer-body" rows={4} required className={fieldCls}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button
            type="submit" disabled={pending}
            className="flex min-h-[48px] items-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Extend the offer
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <p className="text-sm font-semibold text-accent-text">{offer.pay_summary}</p>
            {offer.start_date ? (
              <p className="text-body-xs text-fg-3">
                Starts {new Date(offer.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </p>
            ) : null}
            <p className="mt-2 text-body-sm text-fg-2 whitespace-pre-wrap">{offer.body}</p>
          </div>

          {offer.status === "signed" ? (
            <p className="flex items-center gap-2 rounded-control border border-ok-soft bg-ok-soft px-3 py-2.5 text-sm font-semibold text-ok">
              <Check className="h-4 w-4" />
              Signed by {offer.signed_name}
              {offer.signed_at
                ? ` on ${new Date(offer.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : ""}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-body-xs text-fg-3">
                Hand them the screen — they sign with a finger, no DocuSign account needed.
              </p>
              <SignaturePad onChange={setSignature} height={120} />
              <button
                onClick={sign}
                disabled={pending || !signature}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept & sign as {applicantName}
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

export function OrientationPanel({
  applicantId,
  items,
  offerSigned,
}: {
  applicantId: string
  items: { key: string; label: string; done: boolean }[]
  offerSigned: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const doneCount = items.filter((i) => i.done).length

  const toggle = (key: string, done: boolean) =>
    startTransition(async () => {
      const result = await toggleOrientationAction(applicantId, key, done)
      if (result.ok) router.refresh()
      else toast.error(result.error ?? "Failed")
    })

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-1">
        Orientation checklist
      </h2>
      <p className="text-body-xs text-fg-3 mb-3">
        {doneCount}/{items.length} done — all of it, plus a signed offer, unlocks hiring.
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <label className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-2 -mx-2 hover:bg-hover min-h-[44px]">
              <input
                type="checkbox"
                checked={item.done}
                disabled={pending}
                onChange={(e) => toggle(item.key, e.target.checked)}
                className="h-5 w-5 rounded border-border-strong accent-accent"
              />
              <span className={cn("text-sm", item.done ? "text-fg-3 line-through" : "text-fg-2")}>
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {!offerSigned ? (
        <p className="mt-2 text-body-xs text-warn">Waiting on the signed offer.</p>
      ) : null}
    </Panel>
  )
}

export function ConvertPanel({
  applicantId,
  ready,
  alreadyDriverId,
}: {
  applicantId: string
  ready: boolean
  alreadyDriverId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    payType: "per_mile" as "per_mile" | "percentage",
    payRate: "0.63",
    hireDate: new Date().toISOString().slice(0, 10),
  })

  if (alreadyDriverId) {
    return (
      <Panel className="p-4 md:p-5 border-ok-soft">
        <p className="flex items-center gap-2 text-sm font-semibold text-ok">
          <UserCheck className="h-4 w-4" /> Hired — driver record created.
        </p>
        <button
          onClick={() => router.push(`/hub/drivers/${alreadyDriverId}`)}
          className="mt-3 min-h-[44px] rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
        >
          Open the driver file
        </button>
      </Panel>
    )
  }

  const convert = () =>
    startTransition(async () => {
      const result = await convertApplicantAction(applicantId, form)
      if (result.ok) {
        toast.success("Welcome aboard — driver file created with the DQ checklist ready")
        router.refresh()
      } else toast.error(result.error ?? "Not yet")
    })

  return (
    <Panel className={cn("p-4 md:p-5", ready ? "border-accent" : "opacity-80")}>
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg mb-3">
        <UserPlus className="h-4 w-4 text-accent-text" /> Convert to driver
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="conv-type" className={labelCls}>Pay type</label>
          <select
            id="conv-type" className={fieldCls} value={form.payType}
            onChange={(e) => {
              const payType = e.target.value as "per_mile" | "percentage"
              setForm({ ...form, payType, payRate: payType === "per_mile" ? "0.63" : "0.9" })
            }}
          >
            <option value="per_mile">Per mile (company)</option>
            <option value="percentage">Percentage (O/O)</option>
          </select>
        </div>
        <div>
          <label htmlFor="conv-rate" className={labelCls}>
            {form.payType === "per_mile" ? "Rate $/mile" : "Share (0.90 = 90%)"}
          </label>
          <input
            id="conv-rate" className={fieldCls} inputMode="decimal"
            value={form.payRate}
            onChange={(e) => setForm({ ...form, payRate: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="conv-date" className={labelCls}>Hire date</label>
          <input
            id="conv-date" type="date" className={fieldCls}
            value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
          />
        </div>
      </div>
      <button
        onClick={convert}
        disabled={pending || !ready}
        className="mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
        {ready ? "Hire — create the driver file" : "Finish orientation + signed offer first"}
      </button>
      <p className="mt-2 text-body-xs text-fg-3">
        Creates the driver with the DQ-file checklist (391.51) pre-loaded, moves their documents
        over, sets up pay rules, and releases any referral bonus to the next settlement.
      </p>
    </Panel>
  )
}

export function ReferralPanel({
  applicantId,
  drivers,
  referrerName,
}: {
  applicantId: string
  drivers: { id: string; name: string }[]
  referrerName: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ driverId: "", bonus: "500" })

  if (referrerName) {
    return (
      <p className="rounded-control border border-accent-soft bg-accent-soft px-3 py-2.5 text-sm text-fg-2">
        Referred by <span className="font-semibold text-accent-text">{referrerName}</span> — bonus pays
        through their settlement when this applicant is hired.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Referring driver" className={`${fieldCls} !w-52`} value={form.driverId}
        onChange={(e) => setForm({ ...form, driverId: e.target.value })}
      >
        <option value="">Referred by a driver?</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <input
        aria-label="Bonus" className={`${fieldCls} !w-28`} inputMode="decimal" placeholder="Bonus $"
        value={form.bonus}
        onChange={(e) => setForm({ ...form, bonus: e.target.value })}
      />
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await attachReferralAction(applicantId, form.driverId, form.bonus)
            if (result.ok) {
              toast.success("Referral attached — bonus releases at hire")
              router.refresh()
            } else toast.error(result.error ?? "Failed")
          })
        }
        disabled={pending || !form.driverId}
        className="min-h-[48px] rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        Attach referral
      </button>
    </div>
  )
}
