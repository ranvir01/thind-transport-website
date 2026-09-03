"use client"

/**
 * Schedule-a-meeting request — the one interactive island on /schedule-meeting.
 *
 * Extracted from the route so the page itself can be a server component with a
 * real <h1> in the shared asphalt hero; only this form ships JavaScript.
 *
 * The wire contract is unchanged: it still POSTs the same seven fields
 * (name, email, phone, preferredDate, preferredTime, meetingType, notes) plus
 * the honeypot to /api/schedule-meeting, and the eight preferredTime option
 * values are byte-identical, because the API validates them and the owner's
 * notification email prints them.
 *
 * Every state (form, success) renders as one paper island on the dark page
 * ground — the BrokerPacketForm grammar — with fields through the shared
 * Input / Textarea / Select primitives retinted for paper, one red submit, and
 * failures announced through role="alert" instead of a toast the driver may
 * have already scrolled past.
 */
import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, Loader2, Phone, Video } from "lucide-react"
import { toast } from "sonner"
import { COMPANY_INFO } from "@/lib/constants"
import { HONEYPOT_FIELD, readHoneypotValue } from "@/lib/honeypot"
import { HoneypotField } from "@/components/shared/HoneypotField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** The Input/Textarea primitives retinted for paper: twMerge swaps their
 *  neutral tokens for ink, so nothing is left for the page shell to remap. */
const FIELD =
  "border-ink/20 bg-paper text-ink shadow-none placeholder:text-ink-3 hover:border-ink/40"
const LABEL = "mb-1.5 block text-m-body font-semibold text-ink"

/** Owner-confirmed call slots. Values travel to the API verbatim. */
const TIMES = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
] as const

const MEETING_TYPES = [
  { value: "phone", label: "Phone call", icon: Phone },
  { value: "video", label: "Video call", icon: Video },
] as const

export function ScheduleMeetingForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    meetingType: "phone",
    notes: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // The time is a Select, not a native required field, so it is checked here
    // rather than left to the browser.
    if (!formData.preferredTime) {
      setError("Pick a preferred time so we know when to call.")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, [HONEYPOT_FIELD]: readHoneypotValue() }),
      })

      if (!response.ok) {
        throw new Error("Failed to schedule meeting")
      }

      setIsSubmitted(true)
      toast.success("Meeting request sent! We'll confirm shortly.")
    } catch {
      setError(
        `That didn't send. Call ${COMPANY_INFO.phone} and we'll set the meeting up on the spot.`
      )
      toast.error("Failed to schedule meeting. Please call us instead.")
    } finally {
      setIsSending(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-m-3 border border-ink/15 bg-ink/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-ink" aria-hidden />
        <p className="mt-3 font-display text-m-h4 font-bold text-ink">Meeting request received</p>
        <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
          {`Thank you for your interest in joining ${COMPANY_INFO.name}. We'll review your request and email you a confirmation. After the meeting you'll get a secure link to complete your full DOT driver application.`}
        </p>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-ink underline-offset-4 hover:text-signal hover:underline"
          >
            Back to home
          </Link>
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-signal underline-offset-4 hover:underline"
          >
            <span>or call</span>
            <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
          </a>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative grid gap-5 sm:grid-cols-2">
      <HoneypotField />

      <div>
        <label className={LABEL} htmlFor="name">
          Full name <span aria-hidden="true" className="text-signal">*</span>
        </label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          className={FIELD}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="phone">
          Phone <span aria-hidden="true" className="text-signal">*</span>
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          className={FIELD}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor="email">
          Email <span aria-hidden="true" className="text-signal">*</span>
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={FIELD}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="preferredDate">
          Preferred date <span aria-hidden="true" className="text-signal">*</span>
        </label>
        <Input
          id="preferredDate"
          name="preferredDate"
          type="date"
          required
          min={new Date().toISOString().split("T")[0]}
          className={FIELD}
          value={formData.preferredDate}
          onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
        />
      </div>

      <div>
        {/* The trigger is a Radix <button>, so its accessible name would come
            from SelectValue ("Select time...") and swallow the caption — and
            label/for on a button is unreliable across AT. Named through
            aria-labelledby instead, the PreQualificationForm pattern. The
            visible * is aria-hidden, so required-ness is carried by
            aria-required, and the hand-validated empty-time error is wired
            through aria-invalid + aria-describedby. */}
        <label id="preferredTime-label" className={LABEL} htmlFor="preferredTime">
          Preferred time <span aria-hidden="true" className="text-signal">*</span>
        </label>
        <Select
          value={formData.preferredTime}
          onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
        >
          <SelectTrigger
            id="preferredTime"
            aria-labelledby="preferredTime-label"
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "schedule-error" : undefined}
            className={`${FIELD} data-[placeholder]:text-ink-3`}
          >
            <SelectValue placeholder="Select time..." />
          </SelectTrigger>
          <SelectContent>
            {TIMES.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className={LABEL}>
          Meeting type <span aria-hidden="true" className="text-signal">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-4">
          {MEETING_TYPES.map(({ value, label, icon: Icon }) => {
            const selected = formData.meetingType === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFormData({ ...formData, meetingType: value })}
                className={`inline-flex min-h-[48px] items-center justify-center gap-3 rounded-fleet border px-4 text-m-body font-semibold transition-colors duration-fast ease-entrance ${
                  selected
                    ? "border-signal bg-signal/10 text-signal"
                    : "border-ink/20 text-ink hover:border-ink/40"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor="notes">
          Additional notes (optional)
        </label>
        <Textarea
          id="notes"
          name="notes"
          className={FIELD}
          placeholder="Any specific questions or topics you'd like to discuss?"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="flex gap-3 rounded-m-3 border border-ink/15 bg-ink/5 p-4 sm:col-span-2">
        <Clock className="mt-1 h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        <p className="text-m-body text-ink-2">
          <span className="font-semibold text-ink">Meeting duration:</span>
          <span> approximately 15–20 minutes</span>
          <br />
          <span className="font-semibold text-ink">Time zone:</span>
          <span> Pacific Time (PST/PDT)</span>
        </p>
      </div>

      {error ? (
        <p id="schedule-error" role="alert" className="text-m-body text-signal sm:col-span-2">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSending} className="w-full sm:col-span-2">
        {isSending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
        Request meeting
      </Button>

      <p className="text-center text-m-body text-ink-2 sm:col-span-2">
        <span>Need it sooner? Call </span>
        <a
          href={`tel:${COMPANY_INFO.phoneFormatted}`}
          className="font-semibold text-signal underline-offset-4 hover:underline"
        >
          <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
        </a>
        <span> and ask for the owner.</span>
      </p>
    </form>
  )
}
