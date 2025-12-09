"use client"

import { useState } from "react"
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
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { submitPreQualification } from "@/app/actions/submit-pre-qualification"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

export function PreQualificationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; isQualified?: boolean } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      suspensionDetails: "",
    }
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

      const result = await submitPreQualification({ success: false, message: "" }, formData)

      if (result.success) {
        setSubmissionResult({ success: true, isQualified: result.isQualified })
        // Scroll to top to show result
        window.scrollTo({ top: 0, behavior: 'smooth' })
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
      return (
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-green-900/20 border border-green-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-green-50">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Congratulations! You Pre-Qualify
          </h2>
          <p className="text-xl text-slate-600 max-w-xl mx-auto mb-8">
            Based on your answers, you match our requirements for top-tier pay and routes.
          </p>
          <div className="bg-green-50 rounded-xl p-6 mb-8 max-w-md mx-auto border border-green-100">
            <ul className="text-left space-y-3 font-medium text-green-900">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Eligible for $2,500 Sign-On Bonus</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Priority Application Processing</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Immediate Orientation Available</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/30 px-8">
              <Link href="/apply">Complete Full Application</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 text-lg font-medium border-slate-300 hover:bg-slate-50">
              <a href="tel:+12067656300">Call Recruiting</a>
            </Button>
          </div>
        </div>
      )
    } else {
      return (
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-orange-900/20 border border-orange-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-orange-50">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Thank You for Your Interest
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
            Based on your answers, we need to review your application manually to determine eligibility. A recruiter will review your details and contact you within 24 hours.
          </p>
          <div className="flex justify-center">
            <Button asChild className="h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white px-8">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Driver Pre-Qualification</h2>
        <p className="text-slate-600 mt-2">Complete this form to check your eligibility instantly</p>
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-8">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Basic Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} placeholder="Enter first name" className="h-12" />
              {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} placeholder="Enter last name" className="h-12" />
              {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} onChange={handlePhoneChange} placeholder="(555) 555-5555" className="h-12" />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} type="email" placeholder="john@example.com" className="h-12" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cityState">City / State</Label>
              <Input id="cityState" {...register("cityState")} placeholder="e.g. Dallas, TX" className="h-12" />
              {errors.cityState && <p className="text-red-500 text-xs">{errors.cityState.message}</p>}
            </div>
          </div>
        </div>

        {/* Driver Qualifications */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Driver Qualifications</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Own Sleeper Truck?</Label>
              <Select onValueChange={(val) => setValue("ownSleeperTruck", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.ownSleeperTruck && <p className="text-red-500 text-xs">{errors.ownSleeperTruck.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdlExperience">CDL Experience (Years)</Label>
              <Input id="cdlExperience" {...register("cdlExperience")} placeholder="e.g. 5 years" className="h-12" />
              {errors.cdlExperience && <p className="text-red-500 text-xs">{errors.cdlExperience.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Can Drive Manual?</Label>
              <Select onValueChange={(val) => setValue("canDriveManual", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.canDriveManual && <p className="text-red-500 text-xs">{errors.canDriveManual.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Are you ok getting paid 1st and 15th every month ?</Label>
              <Select onValueChange={(val) => setValue("paidBiMonthly", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.paidBiMonthly && <p className="text-red-500 text-xs">{errors.paidBiMonthly.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Can Run Lower 40?</Label>
              <Select onValueChange={(val) => setValue("runLower40", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.runLower40 && <p className="text-red-500 text-xs">{errors.runLower40.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Can Run WA to Anywhere?</Label>
              <Select onValueChange={(val) => setValue("runWaToAnywhere", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.runWaToAnywhere && <p className="text-red-500 text-xs">{errors.runWaToAnywhere.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeTimeDuration">Home Time Duration</Label>
              <Input id="homeTimeDuration" {...register("homeTimeDuration")} placeholder="e.g. Weekly, Bi-weekly" className="h-12" />
              {errors.homeTimeDuration && <p className="text-red-500 text-xs">{errors.homeTimeDuration.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobsInLast3Years">Jobs in Last 3 Years</Label>
              <Input id="jobsInLast3Years" {...register("jobsInLast3Years")} placeholder="e.g. 2" className="h-12" />
              {errors.jobsInLast3Years && <p className="text-red-500 text-xs">{errors.jobsInLast3Years.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <Label htmlFor="suspensionDetails">License Suspension Details</Label>
            <Textarea id="suspensionDetails" {...register("suspensionDetails")} placeholder="Explain if applicable..." />
          </div>
        </div>

        {/* Safety & Legal */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Safety & History</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Has Rider or Pet?</Label>
              <Select onValueChange={(val) => setValue("hasRiderOrPet", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.hasRiderOrPet && <p className="text-red-500 text-xs">{errors.hasRiderOrPet.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Are You a SAP Driver?</Label>
              <Select onValueChange={(val) => setValue("isSapDriver", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
              {errors.isSapDriver && <p className="text-red-500 text-xs">{errors.isSapDriver.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ever Felony Charged?</Label>
              <Select onValueChange={(val) => setValue("hasFelony", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
              {errors.hasFelony && <p className="text-red-500 text-xs">{errors.hasFelony.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Accident in 5 Year?</Label>
              <Select onValueChange={(val) => setValue("accident5Year", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3+">3+</SelectItem>
                </SelectContent>
              </Select>
              {errors.accident5Year && <p className="text-red-500 text-xs">{errors.accident5Year.message}</p>}
            </div>

             <div className="space-y-2">
              <Label>Moving Violations in 5 year?</Label>
              <Select onValueChange={(val) => setValue("movingViolations5Year", val)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3+">3+</SelectItem>
                </SelectContent>
              </Select>
              {errors.movingViolations5Year && <p className="text-red-500 text-xs">{errors.movingViolations5Year.message}</p>}
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Pre-Qualification"
          )}
        </Button>
      </form>
    </div>
  )
}
