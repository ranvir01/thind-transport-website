"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input, inputVariants } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Loader2, Upload, FileText, CheckCircle2, Truck,
  FileCheck, ChevronDown, ChevronRight, ArrowLeft, ShieldCheck, Clock,
  Check, AlertCircle, Lock, Mail, Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { submitApplication } from "@/app/actions/submit-application"
import { PAY_RATES, COMPANY_INFO } from "@/lib/constants"
import { applyPrefFromSearch, applyProgressPercent } from "./apply-progress"
import { fireLeadCapture } from "./lead-capture"
import { HONEYPOT_FIELD, readHoneypotValue } from "@/lib/honeypot"
import { track } from "@vercel/analytics"
import { HoneypotField } from "@/components/shared/HoneypotField"

/**
 * The /apply wizard. Renders inside a PAPER ISLAND supplied by the caller
 * (`/apply` paints `bg-paper`, the homepage a white `[data-light]` panel), so
 * every colour here is an ink/paper/signal token and the component paints no
 * ground of its own.
 *
 * One filled red per viewport: on phones that red is the pinned command bar at
 * the bottom of the screen, so the inline step button is hidden below `md` and
 * only the Back control stays in the flow. From `md` up there is no pinned bar
 * and the inline button is the red. The bar itself only paints once the wizard
 * is in view — while the driver is still on /apply's hero, the hero's own
 * filled action is the page's single red (AsphaltHero always renders one).
 *
 * Strings pinned by scripts/e2e-apply-smoke.mjs and scripts/e2e-funnel-smoke.mjs
 * are verbatim and must stay so: "Step N of 4", "Continue Application",
 * "Submit Application", "You're Almost Done!", "Thank You for Submitting Your
 * Info", the "Company Driver" / "Class A" / "3-5 Years" radio labels and the
 * #firstName #lastName #email #phone #cdlNumber #previousEmployer #availability
 * field ids.
 */

// Combined Schema
const formSchema = z.object({
  // Step 1: The Hook
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(14, "Please enter a valid 10-digit phone number"), // (555) 555-5555 is 14 chars
  driverType: z.enum(["owner-operator-otr", "regional-company-driver"]),
  experienceYears: z.string().min(1, "Please select your years of experience"),
  cdlClass: z.string().min(1, "Please select your CDL class"),

  // Step 2: The Details
  cdlNumber: z.string().min(5, "CDL number must be at least 5 characters"),
  availability: z.string(),
  routeType: z.string(),
  businessAddress: z.string().optional(),
  previousEmployer: z.string().optional(),
  accidents: z.string().optional(),
  violations: z.string().optional(),

  // Step 3: The Docs
  comments: z.string().optional(),
  // Files handled separately in state
})

type FormData = z.infer<typeof formSchema>

const STEP_NAMES = ["Qualify", "Contact", "Details", "Docs"] as const

/** Preferred-route options. "Local" exists because PAY_RATES publishes a local
 *  lane and the homepage lane cards deep-link to it (?lane=local). */
const ROUTE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "otr", label: "OTR" },
] as const

const EXPERIENCE_OPTIONS = [
  { val: "1", label: "1 Year" },
  { val: "2", label: "2 Years" },
  { val: "3-5", label: "3-5 Years" },
  { val: "6-10", label: "6-10 Years" },
  { val: "10+", label: "10+ Years" },
] as const

/** One shape for every selectable row: 44px target, fleet radius, ink border. */
const choiceBase =
  "flex min-h-[44px] cursor-pointer items-center justify-center rounded-fleet border px-3 py-3 text-center text-m-body transition-colors duration-base"
const choiceOn = "border-signal bg-signal/10 font-semibold text-ink"
const choiceOff = "border-ink/20 bg-paper text-ink-2 hover:border-ink/40"

/**
 * One field-level error.
 *
 * role="alert" is the FORMS rule and it is load-bearing: aria-invalid alone is
 * announced only when the control is re-focused, so a driver on a screen
 * reader who tapped Continue with an empty required field heard nothing at
 * all. `id` pairs with the control's aria-describedby; `data-field-error` is
 * the hook onSubmit's scroll-to-first-error uses.
 */
function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" data-field-error="true" className="mt-1 text-m-micro font-semibold text-signal">
      {children}
    </p>
  )
}

export function ApplicationForm() {
  const pathname = usePathname()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])

  const [uploadedFiles, setUploadedFiles] = useState<{
    cdlLicense?: File
    medicalCard?: File
    drivingRecord?: File
  }>({})

  // ONE RED PER VIEWPORT. /apply opens with an asphalt hero whose own action
  // is a filled red, and the pinned command bar below is a second one — both
  // on screen at first paint on a phone. The bar is only useful once the
  // driver is actually at the form, so it stays MOUNTED (e2e clicks
  // "Continue Application" by DOM click straight after load, and a bar gated
  // on render would not be there) but paints nothing until the wizard itself
  // is in view. visibility:hidden, not opacity alone, so the button is also
  // out of the tab order while it is invisible.
  const wizardRef = useRef<HTMLDivElement>(null)
  const [wizardInView, setWizardInView] = useState(false)
  useEffect(() => {
    const el = wizardRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setWizardInView(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      driverType: "owner-operator-otr", // Pre-select O/O (higher value leads)
      availability: "immediate",
      routeType: "regional",
    },
  })

  const watchedFields = watch()

  // Deep links from /veterans, /load-board, and the homepage lane cards
  // (`?type=company|owner&lane=local|regional|otr`) used to be ignored — the
  // form always pre-selected owner-operator + regional. Honour them once on
  // mount. Read straight off window.location rather than useSearchParams():
  // that hook opts the whole route into a Suspense boundary, and this is a
  // client-only nicety, not render-blocking state.
  useEffect(() => {
    if (typeof window === "undefined") return
    const pref = applyPrefFromSearch(window.location.search)
    if (pref.driverType) {
      setValue("driverType", pref.driverType, { shouldValidate: false })
    }
    if (pref.routeType) {
      setValue("routeType", pref.routeType, { shouldValidate: false })
    }
  }, [setValue])

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

  // File upload handlers
  const handleFileUpload = (fieldName: keyof typeof uploadedFiles, file: File | undefined) => {
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [fieldName]: file }))
      toast.success(`${file.name} uploaded successfully`)
    }
  }

  // Drag and Drop Handlers
  const [dragActive, setDragActive] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(fieldName)
    } else if (e.type === "dragleave") {
      setDragActive(null)
    }
  }

  const handleDrop = (e: React.DragEvent, fieldName: keyof typeof uploadedFiles) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(fieldName, e.dataTransfer.files[0])
    }
  }

  // Navigation Handlers
  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (step === 1) {
      fieldsToValidate = ["driverType", "experienceYears", "cdlClass"]
    } else if (step === 2) {
      fieldsToValidate = ["firstName", "lastName", "email", "phone"]
    } else if (step === 3) {
      fieldsToValidate = ["cdlNumber", "availability", "routeType"]
    }

    const isStepValid = await trigger(fieldsToValidate)

    if (isStepValid) {
      if (step === 2) {
        // Fire the lead capture in the BACKGROUND — do not await it. The
        // insert (DB + notification email) is a full server round trip that
        // can take seconds on truck-stop cell service, and its result never
        // gates advancement (a failed capture still advances). Blocking the
        // Continue tap on it stalled drivers at the most abandonment-
        // sensitive moment of the funnel. Guarded by lead-capture.test.ts.
        const values = getValues()
        void fireLeadCapture(
          {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            driverType: values.driverType,
            experienceYears: values.experienceYears,
          },
          readHoneypotValue()
        ).then((captured) => {
          if (captured) track("apply_lead_captured")
        })
      }

      track("apply_step", { step: step + 1 })
      setStep((s) => s + 1)
      // Scroll to top of form container instead of window
      document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const prevStep = () => {
    setStep((s) => s - 1)
    document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setServerError(null)
    setErrorDetails([])

    try {
      const formData = new FormData()

      // Append text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string)
        }
      })

      // react-hook-form only serializes registered fields — carry the honeypot
      // across from the DOM so the server-side check still sees it.
      const honeypot = readHoneypotValue()
      if (honeypot) formData.append(HONEYPOT_FIELD, honeypot)

      // Append files
      if (uploadedFiles.cdlLicense) formData.append("cdlLicense", uploadedFiles.cdlLicense)
      if (uploadedFiles.medicalCard) formData.append("medicalCard", uploadedFiles.medicalCard)
      if (uploadedFiles.drivingRecord) formData.append("drivingRecord", uploadedFiles.drivingRecord)

      const result = await submitApplication({ success: false, message: "" }, formData)

      if (result.success) {
        track("apply_submit")
        toast.success(result.message)
        // Show success state with next steps
        setStep(5) // Show a success/next steps screen
      } else {
        const errorMessage = result.message || "Failed to submit application"
        toast.error(errorMessage)
        setServerError(errorMessage)

        if (result.errors) {
          // Store error details for display
          const details = Object.entries(result.errors).map(([field, msgs]) => {
            const friendlyField = field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
            return `${friendlyField}: ${msgs[0]}`
          })
          setErrorDetails(details)

          // Map server errors to form fields
          Object.entries(result.errors).forEach(([field, messages]) => {
            setError(field as keyof FormData, {
              type: "server",
              message: messages[0],
            })
          })

          // Navigate to step with error
          const step1Fields = ["driverType", "experienceYears", "cdlClass"]
          const step2Fields = ["firstName", "lastName", "email", "phone"]
          const step3Fields = ["cdlNumber", "availability", "routeType", "businessAddress", "previousEmployer", "accidents", "violations"]

          const hasStep1Error = step1Fields.some((field) => result.errors![field])
          const hasStep2Error = step2Fields.some((field) => result.errors![field])
          const hasStep3Error = step3Fields.some((field) => result.errors![field])

          if (hasStep1Error) {
            setStep(1)
          } else if (hasStep2Error) {
            setStep(2)
          } else if (hasStep3Error) {
            setStep(3)
          }

          setTimeout(() => {
            document.querySelector('[data-field-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" })
          }, 100)
        }
      }
    } catch (error) {
      console.error("Submission error:", error)
      const errorMsg = error instanceof Error
        ? `Error: ${error.message}`
        : `An unexpected error occurred. Please call ${COMPANY_INFO.phone} for immediate assistance.`
      toast.error(errorMsg)
      setServerError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Progress Bar — advances every step (25/50/75/100), see apply-progress.ts
  const progress = applyProgressPercent(step)

  // Only pin the continue bar on the dedicated apply page — on other pages the
  // site-wide mobile command bar already covers the CTA.
  const showStickyFooter = pathname === "/apply" && step < 5
  // The pinned bar IS the red on phones, so the inline twin steps back.
  const inlinePrimary = showStickyFooter ? "hidden md:inline-flex" : ""

  return (
    <div ref={wizardRef} className={cn("relative space-y-8", showStickyFooter && "pb-24 md:pb-0")}>
      {/* Mobile command bar — the one filled red on a phone viewport, and only
          once the hero (which carries its own red) is behind the driver. */}
      {showStickyFooter && (
        <div
          className={cn(
            "safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-navy-950 p-3 transition-opacity duration-base md:hidden",
            wizardInView ? "opacity-100" : "invisible opacity-0"
          )}
        >
          <div className="flex gap-3">
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              aria-label={`Call recruiting at ${COMPANY_INFO.phone}`}
              className="flex min-h-[48px] w-12 items-center justify-center rounded-fleet bg-white/10 text-white transition-colors duration-base hover:bg-white/20 hover:text-white"
            >
              <Phone className="h-5 w-5" aria-hidden />
            </a>
            <Button
              size="lg"
              onClick={() => {
                // If valid, go next, otherwise scroll to error
                if (step === 4) {
                  handleSubmit(onSubmit)()
                } else {
                  nextStep()
                }
              }}
              className="flex-1"
            >
              {step === 4 ? "Submit Application" : "Continue Application"}
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Progress Steps — wizard chrome only; the success screen (step 5) is not a step */}
      {step <= 4 && (
        <div className="mb-8">
          <p className="mb-2 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-signal md:hidden">
            {`Step ${step} of 4: ${STEP_NAMES[step - 1]}`}
          </p>
          <ol className="mb-2 hidden list-none justify-between gap-2 font-display text-m-micro font-bold uppercase tracking-[0.15em] md:flex">
            {STEP_NAMES.map((name, i) => (
              <li
                key={name}
                className={step >= i + 1 ? "text-signal" : "text-ink-2"}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                {`${i + 1}. ${name}`}
              </li>
            ))}
          </ol>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-ink/10"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Step ${step} of 4`}
          >
            <div className="h-full bg-signal" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-m-3 border border-signal/40 bg-signal/10 px-4 py-3 text-ink"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-signal" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-ink">Please fix the following errors:</p>
            <p className="mb-2 text-m-body text-ink-2">{serverError}</p>
            {errorDetails.length > 0 && (
              <ul className="list-inside list-disc space-y-1 text-m-body text-ink-2">
                {errorDetails.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <HoneypotField />
        {/* STEP 1: PREQUALIFICATION */}
        {step === 1 && (
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-slow">
            <div className="mb-8">
              <h3 className="font-display text-m-h4 font-bold text-ink">Let&apos;s check the basics</h3>
              <p className="mt-1 max-w-measure text-m-body text-ink-2">
                Three answers and you&apos;ll know which seat we&apos;re talking about.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p id="driverTypeLabel" className="text-label-lg text-ink">
                  Which best describes you? *
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="driverTypeLabel"
                  aria-describedby={errors.driverType ? "driverType-error" : undefined}
                  className="mt-2 flex flex-col gap-4 md:flex-row"
                >
                  <label
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-4 rounded-m-3 border p-5 transition-colors duration-base",
                      watchedFields.driverType === "owner-operator-otr"
                        ? "border-signal bg-signal/10"
                        : "border-ink/20 bg-paper hover:border-ink/40",
                      errors.driverType ? "border-signal" : ""
                    )}
                  >
                    <input type="radio" {...register("driverType")} value="owner-operator-otr" className="sr-only" />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display text-m-h4 font-bold text-ink">Owner Operator</span>
                        <span className="font-mono text-m-lede font-bold tabular-nums text-signal">
                          {`${PAY_RATES.ownerOperator.commission} gross`}
                        </span>
                      </span>
                      <span className="mt-1 block text-m-body text-ink-2">
                        {`${PAY_RATES.ownerOperator.annualGross} · ${PAY_RATES.requirements.otr}`}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-base",
                        watchedFields.driverType === "owner-operator-otr"
                          ? "border-signal bg-signal"
                          : "border-ink/30"
                      )}
                    >
                      {watchedFields.driverType === "owner-operator-otr" && (
                        <Check className="h-4 w-4 text-paper" aria-hidden />
                      )}
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-4 rounded-m-3 border p-5 transition-colors duration-base",
                      watchedFields.driverType === "regional-company-driver"
                        ? "border-signal bg-signal/10"
                        : "border-ink/20 bg-paper hover:border-ink/40",
                      errors.driverType ? "border-signal" : ""
                    )}
                  >
                    <input type="radio" {...register("driverType")} value="regional-company-driver" className="sr-only" />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display text-m-h4 font-bold text-ink">Company Driver</span>
                        <span className="font-mono text-m-lede font-bold tabular-nums text-signal">
                          {`${PAY_RATES.companyDriver.regional.perMile}/mi`}
                        </span>
                      </span>
                      <span className="mt-1 block text-m-body text-ink-2">
                        {`Home ${PAY_RATES.companyDriver.local.homeTime.toLowerCase()}, ${PAY_RATES.companyDriver.regional.homeTime.toLowerCase()}, or OTR · ${PAY_RATES.requirements.companyDriver}`}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-base",
                        watchedFields.driverType === "regional-company-driver"
                          ? "border-signal bg-signal"
                          : "border-ink/30"
                      )}
                    >
                      {watchedFields.driverType === "regional-company-driver" && (
                        <Check className="h-4 w-4 text-paper" aria-hidden />
                      )}
                    </span>
                  </label>
                </div>
                <FieldError id="driverType-error">{errors.driverType?.message}</FieldError>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  {/* A <label> may not wrap a group of controls, so the group
                      caption is a <p> the radiogroup points at. */}
                  <p id="cdlClassLabel" className="text-label-lg text-ink">CDL Class *</p>
                  <div
                    role="radiogroup"
                    aria-labelledby="cdlClassLabel"
                    aria-describedby={errors.cdlClass ? "cdlClass-error" : undefined}
                    className="grid grid-cols-3 gap-3"
                  >
                    {["Class A", "Class B", "Class C"].map((cls) => (
                      <label
                        key={cls}
                        className={cn(
                          choiceBase,
                          watchedFields.cdlClass === cls ? choiceOn : choiceOff,
                          errors.cdlClass ? "border-signal" : ""
                        )}
                      >
                        <input type="radio" {...register("cdlClass")} value={cls} className="sr-only" />
                        {cls}
                      </label>
                    ))}
                  </div>
                  <FieldError id="cdlClass-error">{errors.cdlClass?.message}</FieldError>
                </div>

                <div className="space-y-2">
                  <p id="experienceYearsLabel" className="text-label-lg text-ink">Years experience *</p>
                  <div
                    role="radiogroup"
                    aria-labelledby="experienceYearsLabel"
                    aria-describedby={errors.experienceYears ? "experienceYears-error" : undefined}
                    className="grid grid-cols-2 gap-3"
                  >
                    {EXPERIENCE_OPTIONS.map((exp) => (
                      <label
                        key={exp.val}
                        className={cn(
                          choiceBase,
                          watchedFields.experienceYears === exp.val ? choiceOn : choiceOff,
                          errors.experienceYears ? "border-signal" : ""
                        )}
                      >
                        <input type="radio" {...register("experienceYears")} value={exp.val} className="sr-only" />
                        {exp.label}
                      </label>
                    ))}
                  </div>
                  <FieldError id="experienceYears-error">{errors.experienceYears?.message}</FieldError>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button type="button" size="lg" onClick={nextStep} className={cn("w-full", inlinePrimary)}>
                  Check my eligibility
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </Button>

                {/* Security Assurance */}
                <p className="flex items-center justify-center gap-2 text-m-micro text-ink-2">
                  <Lock className="h-4 w-4" aria-hidden />
                  <span>Your information stays confidential.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT */}
        {step === 2 && (
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-slow">
            <div className="mb-8">
              <h3 className="font-display text-m-h4 font-bold text-ink">Where should we reach you?</h3>
              <p className="mt-1 max-w-measure text-m-body text-ink-2">
                Name, email, and the number to call.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="firstName" size="lg" className="text-ink">First name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    autoComplete="given-name"
                    placeholder="John"
                    variant={errors.firstName ? "error" : "default"}
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                  <FieldError id="firstName-error">{errors.firstName?.message}</FieldError>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lastName" size="lg" className="text-ink">Last name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    autoComplete="family-name"
                    placeholder="Doe"
                    variant={errors.lastName ? "error" : "default"}
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                  <FieldError id="lastName-error">{errors.lastName?.message}</FieldError>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" size="lg" className="text-ink">Email address *</Label>
                <Input
                  id="email"
                  {...register("email")}
                  placeholder="john@example.com"
                  type="email"
                  autoComplete="email"
                  variant={errors.email ? "error" : "default"}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                <FieldError id="email-error">{errors.email?.message}</FieldError>
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" size="lg" className="text-ink">Phone number *</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="font-mono tabular-nums"
                  variant={errors.phone ? "error" : "default"}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                <FieldError id="phone-error">{errors.phone?.message}</FieldError>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" size="lg" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Back
                </Button>
                <Button type="button" size="lg" onClick={nextStep} className={cn("flex-[2]", inlinePrimary)}>
                  Continue
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 3 && (
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-slow">
            <div className="mb-8">
              <h3 className="font-display text-m-h4 font-bold text-ink">A few more details</h3>
              <p className="mt-1 max-w-measure text-m-body text-ink-2">
                Licence, start date, and the lane you want.
              </p>
            </div>

            {/* Single Column for Mobile */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="cdlNumber" size="lg" className="text-ink">CDL number *</Label>
                <Input
                  id="cdlNumber"
                  {...register("cdlNumber")}
                  placeholder="Enter your CDL number"
                  className="font-mono tabular-nums"
                  variant={errors.cdlNumber ? "error" : "default"}
                  aria-invalid={errors.cdlNumber ? true : undefined}
                  aria-describedby={errors.cdlNumber ? "cdlNumber-error" : undefined}
                />
                <FieldError id="cdlNumber-error">{errors.cdlNumber?.message}</FieldError>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="businessAddress" size="lg" className="text-ink">City and state (optional)</Label>
                  <Input
                    id="businessAddress"
                    {...register("businessAddress")}
                    placeholder="e.g., Seattle, WA"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="previousEmployer" size="lg" className="text-ink">Previous employer (optional)</Label>
                  <Input
                    id="previousEmployer"
                    {...register("previousEmployer")}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="availability" size="lg" className="text-ink">When can you start?</Label>
                  {/* Native <select>, not the Radix one: it shares the Input
                      primitive's shape via inputVariants, and the phone's own
                      wheel picker beats a custom listbox in a truck.
                      appearance-none strips the OS dropdown arrow, so the
                      control draws its own — without one the select read as a
                      plain text input with dead space on the right. */}
                  <div className="relative">
                    <select
                      id="availability"
                      {...register("availability")}
                      aria-invalid={errors.availability ? true : undefined}
                      aria-describedby={errors.availability ? "availability-error" : undefined}
                      className={cn(
                        inputVariants({ variant: errors.availability ? "error" : "default" }),
                        "appearance-none bg-white pr-10"
                      )}
                    >
                      <option value="immediate">Immediately</option>
                      <option value="1week">Within 1 week</option>
                      <option value="2weeks">Within 2 weeks</option>
                      <option value="1month">Within 1 month</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2"
                      aria-hidden
                    />
                  </div>
                  <FieldError id="availability-error">{errors.availability?.message}</FieldError>
                </div>

                <div className="space-y-1">
                  <p id="routeTypeLabel" className="text-label-lg text-ink">Preferred route</p>
                  <div
                    role="radiogroup"
                    aria-labelledby="routeTypeLabel"
                    aria-describedby={errors.routeType ? "routeType-error" : undefined}
                    className="flex gap-2"
                  >
                    {ROUTE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={cn(
                          choiceBase,
                          "flex-1",
                          watchedFields.routeType === option.value ? choiceOn : choiceOff,
                          errors.routeType ? "border-signal" : ""
                        )}
                      >
                        <input type="radio" {...register("routeType")} value={option.value} className="sr-only" />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <FieldError id="routeType-error">{errors.routeType?.message}</FieldError>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-m-3 border border-ink/15 p-4">
              <h4 className="flex items-center gap-2 font-display text-m-h4 font-bold text-ink">
                <AlertCircle className="h-4 w-4 text-ink-2" aria-hidden />
                Safety record (last 3 years)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="accidents" size="lg" className="text-ink">Accidents</Label>
                  <Input
                    id="accidents"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register("accidents")}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="violations" size="lg" className="text-ink">Violations</Label>
                  <Input
                    id="violations"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register("violations")}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button type="button" variant="secondary" size="lg" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Back
                </Button>
                <Button type="button" size="lg" onClick={nextStep} className={cn("flex-[2]", inlinePrimary)}>
                  Continue
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </Button>
              </div>

              {/* Security Assurance */}
              <p className="flex items-center justify-center gap-2 text-m-micro text-ink-2">
                <Lock className="h-4 w-4" aria-hidden />
                <span>Your CDL details are never shared with other carriers.</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: DOCS & SUBMIT */}
        {step === 4 && (
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-slow">
            <div className="mb-8">
              {/* Pinned verbatim by e2e-apply-smoke.mjs. */}
              <h3 className="font-display text-m-h4 font-bold text-ink">You&apos;re Almost Done!</h3>
              <p className="mt-1 max-w-measure text-m-body text-ink-2">
                Upload documents to speed up approval (optional).
              </p>
            </div>

            <div className="space-y-4">
              {[
                { id: "cdlLicense", label: "CDL license", icon: FileText },
                { id: "medicalCard", label: "Medical card", icon: FileCheck },
                { id: "drivingRecord", label: "Driving record", icon: Truck },
              ].map((doc) => {
                const uploaded = uploadedFiles[doc.id as keyof typeof uploadedFiles]
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "group relative rounded-m-3 border border-dashed p-6 text-center transition-colors duration-base",
                      dragActive === doc.id || uploaded
                        ? "border-signal bg-signal/10"
                        : "border-ink/25 hover:border-signal"
                    )}
                    onDragEnter={(e) => handleDrag(e, doc.id)}
                    onDragLeave={(e) => handleDrag(e, doc.id)}
                    onDragOver={(e) => handleDrag(e, doc.id)}
                    onDrop={(e) => handleDrop(e, doc.id as keyof typeof uploadedFiles)}
                  >
                    <input
                      type="file"
                      id={doc.id}
                      aria-label={`Upload ${doc.label}`}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(doc.id as keyof typeof uploadedFiles, e.target.files?.[0])}
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-2">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
                        {uploaded ? <Check className="h-6 w-6" aria-hidden /> : <doc.icon className="h-6 w-6" aria-hidden />}
                      </span>
                      <span>
                        <span className="block font-semibold text-ink">
                          {uploaded ? uploaded.name : `Upload ${doc.label}`}
                        </span>
                        <span className="block text-m-body text-ink-2">
                          {uploaded ? "Ready to submit" : "Tap to upload or take a photo"}
                        </span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1">
              <Label htmlFor="comments" size="lg" className="text-ink">Anything else? (optional)</Label>
              <Textarea
                id="comments"
                {...register("comments")}
                placeholder="Questions, special requests, or additional info..."
              />
            </div>

            {/* What happens next — real process, no inflated promises */}
            <div className="rounded-m-3 border border-ink/15 bg-signal/[0.04] p-5">
              <h4 className="mb-3 font-display text-m-h4 font-bold text-ink">What happens after you submit</h4>
              <ul className="list-none space-y-2 text-m-body text-ink-2">
                <li className="flex items-start gap-2">
                  <Phone className="mt-1 h-4 w-4 flex-shrink-0 text-signal" aria-hidden />
                  <span>
                    {`A real person from our ${COMPANY_INFO.location} office reviews your application — no bots, no black holes.`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 flex-shrink-0 text-signal" aria-hidden />
                  <span>We call or text you back within one business day to talk pay, lanes, and equipment.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-1 h-4 w-4 flex-shrink-0 text-signal" aria-hidden />
                  <span>Your information stays with us — it&apos;s never sold or shared with other carriers.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={prevStep}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" size="lg" className={cn("flex-[2]", inlinePrimary)} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" aria-hidden />
                      Submit application
                    </>
                  )}
                </Button>
              </div>

              {/* Security Assurance */}
              <p className="flex items-center justify-center gap-2 text-m-micro text-ink-2">
                <Lock className="h-4 w-4" aria-hidden />
                <span>Your data is never sold to other carriers.</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS & NEXT STEPS */}
        {step === 5 && (
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-slow">
            <div className="py-8">
              <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cedar/10 text-cedar">
                <CheckCircle2 className="h-10 w-10" aria-hidden />
              </span>
              {/* Pinned verbatim by e2e-apply-smoke.mjs. */}
              <h3 className="font-display text-m-h3 font-bold text-ink">Thank You for Submitting Your Info</h3>
              <p className="mt-3 max-w-measure text-m-lede text-ink-2">
                We will get back to you within 24 hours on business days.
              </p>
              <p className="mt-3 max-w-measure text-m-body text-ink-2">
                We will give you a call, and you can always call us or email us &mdash; whatever you
                prefer to get in touch for further information.
              </p>

              {/* Portal account CTA — applicants can register without an
                  invitation code. The one filled red on this screen; calling
                  and emailing stay visible beside it as text links. */}
              <div className="mt-8 rounded-m-3 border border-ink/15 p-6">
                <h4 className="font-display text-m-h4 font-bold text-ink">
                  Get a head start: create your driver portal account
                </h4>
                <p className="mt-2 max-w-measure text-m-body text-ink-2">
                  Track your application status and complete the official DOT paperwork online —
                  no invitation code needed, just use the email you applied with.
                </p>
                {/* hover:text-white is load-bearing: globals.css sets
                    `a:hover { color: var(--brand-accent-strong) }` at (0,1,1),
                    which beats the variant's bare `text-white` (0,1,0) and
                    would paint #EC5A50 on the orange-700 fill (2.33:1). The
                    `hover:` variant is (0,2,0), so it wins. */}
                <Button asChild size="lg" className="mt-4 w-full hover:text-white sm:w-auto">
                  <Link href={`/driver/register?email=${encodeURIComponent(getValues("email") || "")}`}>
                    Create portal account
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>

              {/* Contact Options */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-signal underline-offset-4 hover:text-signal hover:underline"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  <span>Call</span>
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-signal underline-offset-4 hover:text-signal hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  <span>{COMPANY_INFO.email}</span>
                </a>
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center font-semibold text-ink underline-offset-4 hover:text-ink hover:underline"
                >
                  Return to home
                </Link>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
