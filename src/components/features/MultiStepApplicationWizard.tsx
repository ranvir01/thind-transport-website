"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Phone, Mail, Truck, Calendar, MapPin, 
  CheckCircle2, ArrowRight, ArrowLeft, Shield, Clock,
  Briefcase, FileText, Send, Loader2, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { COMPANY_INFO } from "@/lib/constants"

interface FormData {
  // Step 1
  firstName: string
  lastName: string
  phone: string
  email: string
  hasCDL: string
  smsOptIn: boolean
  // Step 2
  yearsExperience: string
  accidents: string
  positionType: string
  startDate: string
  // Step 3
  routePreference: string[]
  trailerPreference: string[]
  endorsements: string[]
  referralSource: string
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  hasCDL: "",
  smsOptIn: true,
  yearsExperience: "",
  accidents: "",
  positionType: "",
  startDate: "",
  routePreference: [],
  trailerPreference: [],
  endorsements: [],
  referralSource: "",
}

export function MultiStepApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [timer, setTimer] = useState(0)

  // Timer for showing application time
  useState(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  })

  const steps = [
    { number: 1, title: "Quick Qualify", time: "30 sec", icon: User },
    { number: 2, title: "Experience", time: "30 sec", icon: Briefcase },
    { number: 3, title: "Preferences", time: "30 sec", icon: Truck },
  ]

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {}

    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = "First name required"
      if (!formData.lastName) newErrors.lastName = "Last name required"
      if (!formData.phone) newErrors.phone = "Phone required"
      if (!formData.email) newErrors.email = "Email required"
      if (!formData.hasCDL) newErrors.hasCDL = "Please select CDL status"
    }

    if (step === 2) {
      if (!formData.yearsExperience) newErrors.yearsExperience = "Please select experience"
      if (!formData.positionType) newErrors.positionType = "Please select position type"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const toggleArrayField = (field: 'routePreference' | 'trailerPreference' | 'endorsements', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
        <p className="text-gray-600 mb-6">
          Thank you, {formData.firstName}! Our recruiting team will contact you within 2 hours.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 max-w-md mx-auto mb-6">
          <p className="text-sm text-blue-800">
            <strong>What happens next?</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 text-left space-y-1">
            <li>✓ Our recruiter will call you at {formData.phone}</li>
            <li>✓ We'll verify your qualifications</li>
            <li>✓ Review job offers and benefits</li>
            <li>✓ Start onboarding within 48-72 hours</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="px-6 py-3 bg-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
          >
            Call Now: {COMPANY_INFO.phone}
          </a>
          <Link
            href="/pay-rates#calculator"
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
          >
            Calculate Your Pay
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center gap-2 ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep === step.number
                      ? "bg-orange text-white shadow-lg scale-110"
                      : currentStep > step.number
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.time}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded ${
                  currentStep > step.number ? "bg-green-500" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-green-500" />
            256-bit SSL Encrypted
          </span>
        </div>
      </div>

      {/* Form Steps */}
      <AnimatePresence mode="wait">
        {/* Step 1: Quick Qualify */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="John"
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Smith"
                  className={errors.lastName ? "border-red-500" : ""}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
                className={errors.phone ? "border-red-500" : ""}
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smsOptIn"
                  checked={formData.smsOptIn}
                  onChange={(e) => updateField("smsOptIn", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="smsOptIn" className="text-sm text-gray-600">
                  Text me updates about my application
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="john@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
            </div>

            <div>
              <Label>Do you have a CDL-A? *</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "training", label: "In Training" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("hasCDL", option.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.hasCDL === option.value
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.hasCDL && (
                <p className="text-red-500 text-sm mt-1">{errors.hasCDL}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Experience */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label>Years of OTR Experience *</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {["0-1", "1-2", "2-5", "5+"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateField("yearsExperience", option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.yearsExperience === option
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option} yrs
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Accidents in Last 3 Years *</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {["0", "1", "2+"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateField("accidents", option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.accidents === option
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Position Type *</Label>
              <div className="grid sm:grid-cols-3 gap-3 mt-2">
                {[
                  { value: "company", label: "Company Driver", sub: "$78K-$110K/yr" },
                  { value: "owner", label: "Owner Operator", sub: "91% commission" },
                  { value: "lease", label: "Lease Purchase", sub: "Own your truck" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("positionType", option.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.positionType === option.value
                        ? "border-orange bg-orange/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={`block font-semibold ${formData.positionType === option.value ? "text-orange" : ""}`}>
                      {option.label}
                    </span>
                    <span className="text-sm text-gray-500">{option.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>When can you start?</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {["ASAP", "1 week", "2 weeks", "1 month"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateField("startDate", option)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      formData.startDate === option
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Preferences */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label>Preferred Routes (select all that apply)</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {["Local", "Regional", "OTR"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayField("routePreference", option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.routePreference.includes(option)
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Trailer Preference</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {["Dry Van", "Reefer", "Flatbed"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayField("trailerPreference", option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.trailerPreference.includes(option)
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Endorsements (if any)</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {["Hazmat", "Tanker", "Doubles/Triples"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayField("endorsements", option)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      formData.endorsements.includes(option)
                        ? "border-orange bg-orange/5 text-orange font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>How did you hear about us?</Label>
              <select
                value={formData.referralSource}
                onChange={(e) => updateField("referralSource", e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-lg"
              >
                <option value="">Select one...</option>
                <option value="google">Google Search</option>
                <option value="indeed">Indeed</option>
                <option value="facebook">Facebook</option>
                <option value="referral">Driver Referral</option>
                <option value="truckstop">Truck Stop</option>
                <option value="other">Other</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 bg-orange hover:bg-orange-600"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        )}
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Shield className="h-4 w-4 text-green-500" />
          Secure & Private
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-blue-500" />
          2hr Response
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-orange" />
          No Obligation
        </span>
      </div>
    </div>
  )
}

