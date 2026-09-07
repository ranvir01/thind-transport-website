"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  Loader2, Upload, FileText, CheckCircle2, User, Truck, 
  FileCheck, ChevronRight, ArrowLeft, ShieldCheck, Clock, 
  Check, AlertCircle, Lock, Star, Phone, MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

import { submitApplication } from "@/app/actions/submit-application"
import { PAY_RATES, COMPANY_INFO } from "@/lib/constants"
import { ATTRIBUTION_FIELD, readAttribution, serializeAttribution } from "@/lib/attribution"
import { smsMeUrl, whatsAppMeUrl } from "@/lib/recruiting-posts"
import { applyProgressPercent, APPLY_STEP_LABELS } from "./apply-progress"
import {
  APPLY_CDL_CLASSES,
  APPLY_FORM_KEYS,
  applyValuesFromDraftAndSearch,
  clearApplyDraft,
  isApplyWizardStep,
  readApplyDraft,
  saveApplyDraft,
  snapshotFromFormValues,
} from "./apply-draft"
import { fireLeadCapture } from "./lead-capture"
import { HONEYPOT_FIELD, readHoneypotValue } from "@/lib/honeypot"
import { track } from "@vercel/analytics"
import { HoneypotField } from "@/components/shared/HoneypotField"

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

export function ApplicationForm() {
  const pathname = usePathname()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [prefilledFromDraft, setPrefilledFromDraft] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const skipHydrateSave = useRef(true)
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    cdlLicense?: File
    medicalCard?: File
    drivingRecord?: File
  }>({})

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

  // Pre-qualify drafts contact + seat; URL `?type=` / `?lane=` still wins
  // for seat/lane (a /jobs/local tap is more specific than sleeper-truck Yes).
  // Then keep the wizard on this phone: truck-stop Wi-Fi drops used to wipe
  // CDL class / step because we only wrote the draft from /pre-qualify.
  useEffect(() => {
    const draft = readApplyDraft()
    const merged = applyValuesFromDraftAndSearch(draft, window.location.search)
    for (const key of APPLY_FORM_KEYS) {
      const value = merged[key]
      if (typeof value === "string" && value.length > 0) {
        setValue(key, value as never, { shouldValidate: false })
      }
    }
    if (isApplyWizardStep(merged.step)) setStep(merged.step)
    if (draft && (draft.phone || draft.firstName)) setPrefilledFromDraft(true)
    // The first autosave after this would snapshot defaultValues (empty
    // CDL class) and wipe the draft we just restored. Skip that tick.
    skipHydrateSave.current = true
    setDraftReady(true)
  }, [setValue])

  useEffect(() => {
    if (!draftReady || step >= 5) return
    if (skipHydrateSave.current) {
      skipHydrateSave.current = false
      return
    }
    saveApplyDraft(snapshotFromFormValues(getValues(), step))
  }, [draftReady, step, watchedFields, getValues])

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
      fieldsToValidate = ["firstName", "lastName", "email", "phone"]
    } else if (step === 2) {
      fieldsToValidate = ["driverType", "experienceYears", "cdlClass"]
    } else if (step === 3) {
      fieldsToValidate = ["cdlNumber", "availability", "routeType"]
    }

    const isStepValid = await trigger(fieldsToValidate)

    if (isStepValid) {
      if (step === 1) {
        // Fire as soon as we have a phone number — do not await it.
        // Drivers bounce on CDL class; dispatch can still call this lead.
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
      document.getElementById("application-form")?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setStep((s) => s - 1)
    document.getElementById("application-form")?.scrollIntoView({ behavior: 'smooth' })
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

      // Same as lead-capture: this form builds FormData by hand, so the
      // visit's UTMs have to be appended or the completed application
      // email has no idea whether Facebook, WhatsApp, or Google Jobs worked.
      const attribution = serializeAttribution(readAttribution())
      if (attribution) formData.append(ATTRIBUTION_FIELD, attribution)

      // Append files
      if (uploadedFiles.cdlLicense) formData.append("cdlLicense", uploadedFiles.cdlLicense)
      if (uploadedFiles.medicalCard) formData.append("medicalCard", uploadedFiles.medicalCard)
      if (uploadedFiles.drivingRecord) formData.append("drivingRecord", uploadedFiles.drivingRecord)

      const result = await submitApplication({ success: false, message: "" }, formData)
      
      if (result.success) {
        track("apply_submit")
        toast.success(result.message)
        clearApplyDraft()
        // Show success state with next steps
        setStep(5) // Show a success/next steps screen
      } else {
        const errorMessage = result.message || "Failed to submit application"
        toast.error(errorMessage)
        setServerError(errorMessage)
        
        if (result.errors) {
          // Store error details for display
          const details = Object.entries(result.errors).map(([field, msgs]) => {
            const friendlyField = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
            return `${friendlyField}: ${msgs[0]}`
          })
          setErrorDetails(details)

          // Map server errors to form fields
          Object.entries(result.errors).forEach(([field, messages]) => {
            setError(field as keyof FormData, {
              type: "server",
              message: messages[0]
            })
          })

          // Navigate to step with error
          const step1Fields = ["firstName", "lastName", "email", "phone"]
          const step2Fields = ["driverType", "experienceYears", "cdlClass"]
          const step3Fields = ["cdlNumber", "availability", "routeType", "businessAddress", "previousEmployer", "accidents", "violations"]
          
          const hasStep1Error = step1Fields.some(field => result.errors![field])
          const hasStep2Error = step2Fields.some(field => result.errors![field])
          const hasStep3Error = step3Fields.some(field => result.errors![field])
          
          if (hasStep1Error) {
            setStep(1)
          } else if (hasStep2Error) {
            setStep(2)
          } else if (hasStep3Error) {
            setStep(3)
          }
          
          setTimeout(() => {
            const errorElement = document.querySelector('.text-red-500')
            errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  const justAppliedPrefill = "Hi, I just applied as a CDL driver."

  // Only pin the continue bar on the dedicated apply page — on other pages the
  // site-wide mobile command bar already covers the CTA.
  const showStickyFooter = pathname === "/apply" && step < 5

  return (
    <div className={cn("space-y-8 relative", showStickyFooter && "pb-24 md:pb-0")}>
      {/* Mobile Sticky Footer */}
      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-[#131418] p-3 border-t border-white/10 shadow-2xl safe-area-bottom">
          <div className="flex gap-3">
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              aria-label={`Call recruiting at ${COMPANY_INFO.phone}`}
              className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl text-white hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              <Phone className="h-5 w-5" />
            </a>
            <Button
              onClick={() => {
                 // If valid, go next, otherwise scroll to error
                 if (step === 4) {
                   handleSubmit(onSubmit)()
                 } else {
                   nextStep()
                 }
              }}
              className="flex-1 h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/30"
            >
              {step === 4 ? "Submit Application" : "Continue Application"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Progress Steps — wizard chrome only; the success screen (step 5) is not a step */}
      {step <= 4 && (
        <div className="mb-8">
          <div className="md:hidden text-sm font-bold text-orange-600 mb-2">
            Step {step} of 4: {APPLY_STEP_LABELS[step - 1]}
          </div>
          <div className="hidden md:flex justify-between text-sm font-medium text-gray-500 mb-2">
            {APPLY_STEP_LABELS.map((label, i) => (
              <span key={label} className={cn(step >= i + 1 && "text-orange-600 font-bold")}>
                {i + 1}. {label}
              </span>
            ))}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Please fix the following errors:</p>
            <p className="text-sm mb-2">{serverError}</p>
            {errorDetails.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-1 bg-red-100/50 p-2 rounded">
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
        {/* STEP 2: PREQUALIFICATION */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Which seat fits?</h2>
              <p className="text-gray-600">Company driver or owner-operator. Then CDL class and years.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Which best describes you? *</Label>
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                  <label className={cn(
                    "flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all hover:border-orange-400 hover:bg-orange-50 w-full group",
                    watchedFields.driverType === "owner-operator-otr" ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500" : "border-gray-200",
                    errors.driverType ? "border-red-500" : ""
                  )}>
                    <input type="radio" {...register("driverType")} value="owner-operator-otr" className="sr-only" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 text-base">Owner Operator</div>
                        <div className="text-xl text-orange-600 font-black">{PAY_RATES.ownerOperator.commission} Gross</div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 group-hover:text-gray-700 transition-colors">{PAY_RATES.ownerOperator.annualGross} • {PAY_RATES.requirements.otr}</div>
                    </div>
                    <div className={cn(
                      "ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      watchedFields.driverType === "owner-operator-otr" ? "border-orange-500 bg-orange-600" : "border-gray-300"
                    )}>
                      {watchedFields.driverType === "owner-operator-otr" && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all hover:border-orange-400 hover:bg-orange-50 w-full group",
                    watchedFields.driverType === "regional-company-driver" ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500" : "border-gray-200",
                    errors.driverType ? "border-red-500" : ""
                  )}>
                    <input type="radio" {...register("driverType")} value="regional-company-driver" className="sr-only" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 text-base">Company Driver</div>
                        <div className="text-xl text-orange-600 font-black">{PAY_RATES.companyDriver.regional.perMile}/mi</div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 group-hover:text-gray-700 transition-colors">
                        Home {PAY_RATES.companyDriver.local.homeTime.toLowerCase()}, {PAY_RATES.companyDriver.regional.homeTime.toLowerCase()}, or OTR • {PAY_RATES.requirements.companyDriver}
                      </div>
                    </div>
                    <div className={cn(
                      "ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      watchedFields.driverType === "regional-company-driver" ? "border-orange-500 bg-orange-600" : "border-gray-300"
                    )}>
                      {watchedFields.driverType === "regional-company-driver" && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </label>
                </div>
                {errors.driverType && <p className="text-xs text-red-500 mt-1">{errors.driverType.message}</p>}
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">CDL Class *</p>
                  <div className="grid grid-cols-3 gap-3">
                    {APPLY_CDL_CLASSES.map((cls) => (
                      <label key={cls} className={cn(
                        "flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all font-bold text-center",
                        watchedFields.cdlClass === cls ? "border-orange-500 bg-orange-600 text-white shadow-md transform scale-[1.02]" : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50",
                        errors.cdlClass ? "border-red-500" : ""
                      )}>
                        <input type="radio" {...register("cdlClass")} value={cls} className="sr-only" />
                        {cls}
                      </label>
                    ))}
                  </div>
                  {errors.cdlClass && <p className="text-xs text-red-500 mt-1">{errors.cdlClass.message}</p>}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">Years Experience *</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "1", label: "1 Year" },
                      { val: "2", label: "2 Years" },
                      { val: "3-5", label: "3-5 Years" },
                      { val: "6-10", label: "6-10 Years" },
                      { val: "10+", label: "10+ Years" }
                    ].map((exp) => (
                       <label key={exp.val} className={cn(
                        "flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all font-medium text-center",
                        watchedFields.experienceYears === exp.val ? "border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500 font-bold" : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50",
                        errors.experienceYears ? "border-red-500" : ""
                      )}>
                        <input type="radio" {...register("experienceYears")} value={exp.val} className="sr-only" />
                        {exp.label}
                      </label>
                    ))}
                  </div>
                  {errors.experienceYears && <p className="text-xs text-red-500 mt-1">{errors.experienceYears.message}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-14 border-gray-300 text-gray-700 hover:bg-gray-50">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    className="flex-[2] h-14 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
                  >
                    CHECK MY ELIGIBILITY <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                
                {/* Security Assurance */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Secure Application – Your information is always confidential</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: CONTACT — phone first so dispatch can call abandoned apps */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">How do we reach you?</h2>
              <p className="text-gray-600">
                {prefilledFromDraft
                  ? "Your phone and name are still on this phone. Check them, then continue."
                  : "A dispatcher in Kent will call this number. CDL class is next."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={cn("h-12 py-3 text-base", errors.phone ? "border-red-500" : "")}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    autoComplete="given-name"
                    placeholder="John"
                    className={cn("h-12 py-3 text-base", errors.firstName ? "border-red-500" : "")}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    autoComplete="family-name"
                    placeholder="Doe"
                    className={cn("h-12 py-3 text-base", errors.lastName ? "border-red-500" : "")}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  {...register("email")}
                  placeholder="john@example.com"
                  type="email"
                  autoComplete="email"
                  className={cn("h-12 py-3 text-base", errors.email ? "border-red-500" : "")}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
                >
                  CONTINUE <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Secure Application – Your information is always confidential</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Almost There!</h2>
              <p className="text-gray-600">Just a few more details to finalize your offer</p>
            </div>

            {/* Single Column for Mobile */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="cdlNumber">CDL Number *</Label>
                <Input
                  id="cdlNumber"
                  {...register("cdlNumber")}
                  placeholder="Enter your CDL number"
                  className={cn("h-12 py-3 text-base", errors.cdlNumber ? "border-red-500" : "")}
                />
                {errors.cdlNumber && <p className="text-xs text-red-500 mt-1">{errors.cdlNumber.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="businessAddress">City & State (Optional)</Label>
                  <Input
                    id="businessAddress"
                    {...register("businessAddress")}
                    placeholder="e.g., Seattle, WA"
                    className="h-12 py-3 text-base"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="previousEmployer">Previous Employer (Optional)</Label>
                  <Input
                    id="previousEmployer"
                    {...register("previousEmployer")}
                    placeholder="Company Name"
                    className="h-12 py-3 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="availability">When can you start?</Label>
                    <select
                      id="availability"
                      {...register("availability")}
                      className={cn(
                        "w-full h-12 px-3 py-3 rounded-md border border-gray-300 bg-white text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
                        errors.availability ? "border-red-500" : ""
                      )}
                    >
                      <option value="immediate">Immediately</option>
                      <option value="1week">Within 1 week</option>
                      <option value="2weeks">Within 2 weeks</option>
                      <option value="1month">Within 1 month</option>
                    </select>
                    {errors.availability && <p className="text-xs text-red-500 mt-1">{errors.availability.message}</p>}
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Preferred Route</p>
                    <div className="flex gap-2">
                      {(["local", "regional", "otr"] as const).map((type) => (
                        <label key={type} className={cn(
                          "flex-1 flex min-h-[44px] items-center justify-center border rounded-lg cursor-pointer text-sm sm:text-base capitalize transition-all py-3",
                          watchedFields.routeType === type ? "bg-orange-50 border-orange-500 text-orange-700 font-medium" : "bg-white border-gray-200 hover:border-gray-300",
                          errors.routeType ? "border-red-500" : ""
                        )}>
                          <input type="radio" {...register("routeType")} value={type} className="sr-only" />
                          {type === "otr" ? "OTR" : type === "local" ? "Local" : "Regional"}
                        </label>
                      ))}
                    </div>
                    {errors.routeType && <p className="text-xs text-red-500 mt-1">{errors.routeType.message}</p>}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl space-y-4">
               <h4 className="font-medium text-gray-900 flex items-center gap-2">
                 <AlertCircle className="h-4 w-4 text-gray-500" />
                 Safety Record (Last 3 Years)
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label className="text-xs text-gray-500">Accidents</Label>
                    <Input type="number" min="0" placeholder="0" {...register("accidents")} className="bg-white h-12 text-base" />
                 </div>
                 <div>
                    <Label className="text-xs text-gray-500">Violations</Label>
                    <Input type="number" min="0" placeholder="0" {...register("violations")} className="bg-white h-12 text-base" />
                 </div>
               </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="button" onClick={nextStep} className="flex-[2] h-14 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5">
                  CONTINUE <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              
              {/* Security Assurance */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5" />
                <span>Your CDL info is encrypted and never shared</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DOCS & SUBMIT */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">You're Almost Done!</h2>
              <p className="text-gray-600">Upload documents to speed up approval (optional)</p>
            </div>

            <div className="space-y-4">
               {[
                 { id: 'cdlLicense', label: 'CDL License', icon: FileText },
                 { id: 'medicalCard', label: 'Medical Card', icon: FileCheck },
                 { id: 'drivingRecord', label: 'Driving Record', icon: Truck }
               ].map((doc) => (
                 <div 
                   key={doc.id}
                   className={cn(
                     "relative border-2 border-dashed rounded-xl p-6 transition-all text-center group",
                     dragActive === doc.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-400 hover:bg-gray-50"
                   )}
                   onDragEnter={(e) => handleDrag(e, doc.id)}
                   onDragLeave={(e) => handleDrag(e, doc.id)}
                   onDragOver={(e) => handleDrag(e, doc.id)}
                   onDrop={(e) => handleDrop(e, doc.id as keyof typeof uploadedFiles)}
                 >
                    <input
                      type="file"
                      id={doc.id}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(doc.id as keyof typeof uploadedFiles, e.target.files?.[0])}
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                       <div className={cn(
                         "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                         uploadedFiles[doc.id as keyof typeof uploadedFiles] ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                       )}>
                          {uploadedFiles[doc.id as keyof typeof uploadedFiles] ? <Check className="h-6 w-6" /> : <doc.icon className="h-6 w-6" />}
                       </div>
                       <div>
                          <p className="font-semibold text-gray-900">
                            {uploadedFiles[doc.id as keyof typeof uploadedFiles] ? uploadedFiles[doc.id as keyof typeof uploadedFiles]?.name : `Upload ${doc.label}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {uploadedFiles[doc.id as keyof typeof uploadedFiles] ? "Ready to submit" : "Tap to upload or take photo"}
                          </p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="space-y-1">
              <Label htmlFor="comments">Anything else? (Optional)</Label>
              <Textarea 
                id="comments" 
                {...register("comments")} 
                placeholder="Questions, special requests, or additional info..."
                className="mt-1.5 min-h-[80px] text-base p-3" 
              />
            </div>

            {/* What happens next — real process, no inflated promises */}
            <div className="bg-gradient-to-br from-[#17181B] to-[#0B0C0E] rounded-xl p-5 text-white border border-slate-700 shadow-xl">
              <h4 className="font-bold text-base text-orange-400 mb-3">What happens after you submit</h4>
              <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
                  A real person from our Kent, WA office reviews your application — no bots, no black holes.
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
                  We call or text you back within one business day to talk pay, lanes, and equipment.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
                  Your information stays with us — it's never sold or shared with other carriers.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50" disabled={isSubmitting}>
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-16 text-xl font-black bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/40 transition-all hover:shadow-2xl hover:shadow-orange-500/50 hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "SUBMIT & GET MY OFFER"
                  )}
                </Button>
              </div>
              
              {/* Security Assurance */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5" />
                <span>Secure Application – Your data is never sold to other carriers</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS & NEXT STEPS */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center py-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank You for Submitting Your Info</h2>
              <p className="text-lg text-gray-600 mb-4">
                We will get back to you shortly, within the next 24 hours.
              </p>
              <p className="text-base text-gray-600 mb-6 max-w-lg mx-auto leading-relaxed">
                We will give you a call, and you can always call us or email us &mdash; 
                whatever you prefer to get in touch for further information.
              </p>

              {/* Portal account CTA — applicants can register without an invitation code */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-8 text-left">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  Get a head start: create your driver portal account
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Track your application status and complete the official DOT paperwork online —
                  no invitation code needed, just use the email you applied with.
                </p>
                <Button
                  asChild
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  <Link href={`/driver/register?email=${encodeURIComponent(getValues("email") || "")}`}>
                    Create Portal Account
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Contact Options */}
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 text-left mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-orange-600" />
                  Get In Touch
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Call Us</p>
                      <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-orange-600 font-bold hover:underline">{COMPANY_INFO.phone}</a>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Text or WhatsApp</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <a href={smsMeUrl(justAppliedPrefill)} className="text-orange-600 font-bold hover:underline min-h-[44px] inline-flex items-center">Text us</a>
                        <a href={whatsAppMeUrl(justAppliedPrefill)} className="text-orange-600 font-bold hover:underline min-h-[44px] inline-flex items-center">WhatsApp</a>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center">
                      <Star className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Email Us</p>
                      <a href={`mailto:${COMPANY_INFO.email}`} className="text-orange-600 font-bold hover:underline">{COMPANY_INFO.email}</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild
                  size="lg"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg h-14"
                >
                  <a href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    Call {COMPANY_INFO.phone}
                  </a>
                </Button>
                <Button 
                  asChild
                  size="lg"
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold text-lg h-14"
                >
                  <Link href="/">
                    Return to Home
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
