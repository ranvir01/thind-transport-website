"use client"

import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { submitPreQualification } from "@/app/actions/submit-pre-qualification"
import { HONEYPOT_FIELD, readHoneypotValue } from "@/lib/honeypot"
import { track } from "@vercel/analytics"
import { HoneypotField } from "@/components/shared/HoneypotField"
import { AttributionField } from "@/components/shared/AttributionField"
import Link from "next/link"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"

/**
 * The /pre-qualify form — a paper island on the dark page ground.
 *
 * DOM ORDER OF THE TEN RADIX SELECTS IS PINNED: scripts/e2e-apply-smoke.mjs
 * drives them by index (ownSleeperTruck, canDriveManual, paidBiMonthly,
 * runLower40, runWaToAnywhere, hasRiderOrPet, isSapDriver, hasFelony,
 * accident5Year, movingViolations5Year). So are the #cityState,
 * #cdlExperience and #homeTimeDuration ids and the four result strings
 * ("Driver Pre-Qualification", "Submit Pre-Qualification", "Congratulations!
 * You Pre-Qualify", "Thank You for Your Interest") — all verbatim.
 */

const formSchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(2, "Last Name is required"),
  phone: z.string().min(14, "Please enter a valid 10-digit phone number"),
  email: z.string().email("Invalid email address"),
  cityState: z.string().min(2, "City / State is required"),

  ownSleeperTruck: z.string().min(1, "Required"),
  cdlExperience: z.string().min(1, "Required"),
  canDriveManual: z.string().min(1, "Required"),
  paidBiMonthly: z.string().min(1, "Required"),
  runLower40: z.string().min(1, "Required"),
  runWaToAnywhere: z.string().min(1, "Required"),
  homeTimeDuration: z.string().min(1, "Required"),
  jobsInLast3Years: z.string().min(1, "Required"),
  suspensionDetails: z.string().optional(),

  hasRiderOrPet: z.string().min(1, "Required"),
  isSapDriver: z.string().min(1, "Required"),
  hasFelony: z.string().min(1, "Required"),
  accident5Year: z.string().min(1, "Required"),
  movingViolations5Year: z.string().min(1, "Required"),
})

type FormData = z.infer<typeof formSchema>

const YES_NO = ["Yes", "No"] as const
const NO_YES = ["No", "Yes"] as const
const COUNTS = ["None", "1", "2", "3+"] as const

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-m-micro font-semibold text-signal">
      {children}
    </p>
  )
}

/**
 * One Radix select with a visible caption. The caption is a <p>, not a
 * <label>: the trigger is a button Radix owns, so the association is made with
 * aria-labelledby rather than a label that wraps nothing.
 */
function ChoiceField({
  id,
  caption,
  options,
  error,
  onValueChange,
}: {
  id: string
  caption: string
  options: readonly string[]
  error?: string
  onValueChange: (value: string) => void
}) {
  const captionId = `${id}-caption`
  return (
    <div className="space-y-2">
      <p id={captionId} className="text-label-lg text-ink">
        {caption}
      </p>
      <Select onValueChange={onValueChange}>
        <SelectTrigger id={id} aria-labelledby={captionId} aria-invalid={error ? true : undefined}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </div>
  )
}

const paperIsland = "rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8"

export function PreQualificationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean
    isQualified?: boolean
    isOwnerOperator?: boolean
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      suspensionDetails: "",
    },
  })

  // Phone Mask Logic
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 10) value = value.slice(0, 10)

    if (value.length > 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
    } else if (value.length > 3) {
      value = `(${value.slice(0, 3)}) ${value.slice(3)}`
    } else if (value.length > 0) {
      value = `(${value}`
    }

    setValue("phone", value, { shouldValidate: true })
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value)
        }
      })
      // react-hook-form only serializes registered fields, so carry the
      // honeypot's DOM value across by hand.
      const honeypot = readHoneypotValue()
      if (honeypot) formData.append(HONEYPOT_FIELD, honeypot)

      const result = await submitPreQualification({ success: false, message: "" }, formData)

      if (result.success) {
        track("prequalify_submit", { qualified: result.isQualified === true })
        setSubmissionResult({
          success: true,
          isQualified: result.isQualified,
          // "Own Sleeper Truck? Yes" is the O/O track — the sign-on bonus
          // promise on the success card must match the track (PAY_RATES has
          // different bonuses for owner-operators vs company drivers).
          isOwnerOperator: data.ownSleeperTruck === "Yes",
        })
        // Scroll the RESULT into view, not the document top: the page opens
        // with a full asphalt hero, so scrollTo(0) parked the driver back on
        // the headline with the verdict card below the fold.
        document.getElementById("pre-qualification")?.scrollIntoView({ behavior: "smooth" })
      } else {
        setServerError(result.message)
        toast.error(result.message)
      }
    } catch (error) {
      console.error(error)
      setServerError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submissionResult?.success) {
    if (submissionResult.isQualified) {
      const signOnBonus = submissionResult.isOwnerOperator
        ? PAY_RATES.ownerOperator.signOnBonus
        : PAY_RATES.companyDriver.signOnBonus
      return (
        <div className={paperIsland}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cedar/10 text-cedar">
            <CheckCircle2 className="h-10 w-10" aria-hidden />
          </span>
          {/* Pinned verbatim by scripts/e2e-apply-smoke.mjs. */}
          <h2 id="pre-qualification-heading" className="mt-6 font-display text-m-h2 font-bold text-ink text-balance">
            Congratulations! You Pre-Qualify
          </h2>
          <p className="mt-3 max-w-measure text-m-lede text-ink-2">
            Based on your answers, you match our requirements for top-tier pay and routes.
          </p>
          <div className="mt-6 rounded-m-3 border border-cedar/30 bg-cedar/10 p-5">
            <ul className="list-none space-y-3 text-m-body font-medium text-ink">
              {/* Only constants-backed facts here. The priority-processing and
                  same-day-orientation promises were removed 2026-08-04:
                  neither was sourced from anything, and a promise the office
                  can't keep costs the driver who showed up believing it. */}
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-cedar" aria-hidden />
                <span>{`Eligible for a ${signOnBonus} sign-on bonus`}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-cedar" aria-hidden />
                <span>Weekly direct deposit pay</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-cedar" aria-hidden />
                <span>No forced dispatch</span>
              </li>
            </ul>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            {/* hover:text-white is load-bearing: globals.css sets
                `a:hover { color: var(--brand-accent-strong) }` at (0,1,1),
                which beats the variant's bare `text-white` (0,1,0) and would
                paint #EC5A50 on the orange-700 fill (2.33:1). The `hover:`
                variant is (0,2,0), so it wins — same guard AsphaltHero uses. */}
            <Button asChild size="lg" className="hover:text-white">
              <Link href="/apply">Complete Full Application</Link>
            </Button>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-signal underline-offset-4 hover:text-signal hover:underline"
            >
              <span>or call</span>
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className={paperIsland}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-signal/10 text-signal">
          <AlertCircle className="h-10 w-10" aria-hidden />
        </span>
        {/* Pinned verbatim by scripts/e2e-apply-smoke.mjs. */}
        <h2 id="pre-qualification-heading" className="mt-6 font-display text-m-h2 font-bold text-ink text-balance">
          Thank You for Your Interest
        </h2>
        <p className="mt-3 max-w-measure text-m-lede text-ink-2">
          Based on your answers, we need to review your application manually to determine
          eligibility. A recruiter will review your details and contact you within 24 hours on
          business days.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Button asChild size="lg" className="hover:text-white">
            <a href={`tel:${COMPANY_INFO.phoneFormatted}`}>
              <span>Call</span>
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center font-semibold text-ink underline-offset-4 hover:text-ink hover:underline"
          >
            Return home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={paperIsland}>
      <div className="mb-10">
        {/* Pinned verbatim: the landing anchor of e2e-apply-smoke.mjs. */}
        <h2 id="pre-qualification-heading" className="font-display text-m-h2 font-bold text-ink text-balance">
          Driver Pre-Qualification
        </h2>
        <p className="mt-2 max-w-measure text-m-body text-ink-2">
          Complete this form to check your eligibility instantly.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-8 flex items-start gap-2 rounded-m-3 border border-signal/40 bg-signal/10 px-4 py-3 text-ink"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-signal" aria-hidden />
          <p className="text-m-body text-ink">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-10">
        <HoneypotField />
        <AttributionField />

        {/* Basic information */}
        <fieldset className="space-y-6">
          <legend className="mb-4 w-full border-b border-ink/15 pb-2 font-display text-m-h4 font-bold text-ink">
            Basic information
          </legend>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" size="lg" className="text-ink">First name</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                autoComplete="given-name"
                placeholder="Enter first name"
                variant={errors.firstName ? "error" : "default"}
              />
              <FieldError>{errors.firstName?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" size="lg" className="text-ink">Last name</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                autoComplete="family-name"
                placeholder="Enter last name"
                variant={errors.lastName ? "error" : "default"}
              />
              <FieldError>{errors.lastName?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" size="lg" className="text-ink">Phone number</Label>
              {/* lead-form-autofill.test.ts reads this line: id, type,
                  inputMode and autoComplete must stay on it together. */}
              <Input id="phone" {...register("phone")} onChange={handlePhoneChange} type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" className="font-mono tabular-nums" variant={errors.phone ? "error" : "default"} />
              <FieldError>{errors.phone?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" size="lg" className="text-ink">Email</Label>
              <Input
                id="email"
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="john@example.com"
                variant={errors.email ? "error" : "default"}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cityState" size="lg" className="text-ink">City / state</Label>
              <Input
                id="cityState"
                {...register("cityState")}
                placeholder={`e.g. ${COMPANY_INFO.location}`}
                variant={errors.cityState ? "error" : "default"}
              />
              <FieldError>{errors.cityState?.message}</FieldError>
            </div>
          </div>
        </fieldset>

        {/* Driver qualifications */}
        <fieldset className="space-y-6">
          <legend className="mb-4 w-full border-b border-ink/15 pb-2 font-display text-m-h4 font-bold text-ink">
            Driver qualifications
          </legend>
          <div className="grid gap-6 md:grid-cols-2">
            <ChoiceField
              id="ownSleeperTruck"
              caption="Own sleeper truck?"
              options={YES_NO}
              error={errors.ownSleeperTruck?.message}
              onValueChange={(val) => setValue("ownSleeperTruck", val, { shouldValidate: true })}
            />

            <div className="space-y-2">
              <Label htmlFor="cdlExperience" size="lg" className="text-ink">CDL experience (years)</Label>
              <Input
                id="cdlExperience"
                {...register("cdlExperience")}
                placeholder="e.g. 5 years"
                variant={errors.cdlExperience ? "error" : "default"}
              />
              <FieldError>{errors.cdlExperience?.message}</FieldError>
            </div>

            <ChoiceField
              id="canDriveManual"
              caption="Can drive manual?"
              options={YES_NO}
              error={errors.canDriveManual?.message}
              onValueChange={(val) => setValue("canDriveManual", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="paidBiMonthly"
              caption="Are you ok getting paid 1st and 15th every month?"
              options={YES_NO}
              error={errors.paidBiMonthly?.message}
              onValueChange={(val) => setValue("paidBiMonthly", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="runLower40"
              caption="Can run lower 40?"
              options={YES_NO}
              error={errors.runLower40?.message}
              onValueChange={(val) => setValue("runLower40", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="runWaToAnywhere"
              caption="Can run WA to anywhere?"
              options={YES_NO}
              error={errors.runWaToAnywhere?.message}
              onValueChange={(val) => setValue("runWaToAnywhere", val, { shouldValidate: true })}
            />

            <div className="space-y-2">
              <Label htmlFor="homeTimeDuration" size="lg" className="text-ink">Home time duration</Label>
              <Input
                id="homeTimeDuration"
                {...register("homeTimeDuration")}
                placeholder="e.g. Weekly, Bi-weekly"
                variant={errors.homeTimeDuration ? "error" : "default"}
              />
              <FieldError>{errors.homeTimeDuration?.message}</FieldError>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobsInLast3Years" size="lg" className="text-ink">Jobs in last 3 years</Label>
              <Input
                id="jobsInLast3Years"
                {...register("jobsInLast3Years")}
                placeholder="e.g. 2"
                className="font-mono tabular-nums"
                variant={errors.jobsInLast3Years ? "error" : "default"}
              />
              <FieldError>{errors.jobsInLast3Years?.message}</FieldError>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suspensionDetails" size="lg" className="text-ink">
              License suspension details (optional)
            </Label>
            <Textarea
              id="suspensionDetails"
              {...register("suspensionDetails")}
              placeholder="Explain if applicable..."
            />
          </div>
        </fieldset>

        {/* Safety and history */}
        <fieldset className="space-y-6">
          <legend className="mb-4 w-full border-b border-ink/15 pb-2 font-display text-m-h4 font-bold text-ink">
            Safety and history
          </legend>
          <div className="grid gap-6 md:grid-cols-2">
            <ChoiceField
              id="hasRiderOrPet"
              caption="Has rider or pet?"
              options={YES_NO}
              error={errors.hasRiderOrPet?.message}
              onValueChange={(val) => setValue("hasRiderOrPet", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="isSapDriver"
              caption="Are you a SAP driver?"
              options={NO_YES}
              error={errors.isSapDriver?.message}
              onValueChange={(val) => setValue("isSapDriver", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="hasFelony"
              caption="Ever felony charged?"
              options={NO_YES}
              error={errors.hasFelony?.message}
              onValueChange={(val) => setValue("hasFelony", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="accident5Year"
              caption="Accidents in the last 5 years?"
              options={COUNTS}
              error={errors.accident5Year?.message}
              onValueChange={(val) => setValue("accident5Year", val, { shouldValidate: true })}
            />

            <ChoiceField
              id="movingViolations5Year"
              caption="Moving violations in the last 5 years?"
              options={COUNTS}
              error={errors.movingViolations5Year?.message}
              onValueChange={(val) => setValue("movingViolations5Year", val, { shouldValidate: true })}
            />
          </div>
        </fieldset>

        <div className="space-y-4">
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Submitting...
              </>
            ) : (
              "Submit Pre-Qualification"
            )}
          </Button>
          <p className="text-center text-m-micro text-ink-2">
            <span>Prefer to talk it through? Call </span>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="font-semibold text-signal underline-offset-4 hover:text-signal hover:underline"
            >
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </p>
        </div>
      </form>
    </div>
  )
}
