"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, User } from "lucide-react"
import { useState, useEffect } from "react"

// Auto-format helpers
const formatSSN = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

const formatDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const formatMonthYear = (value: string) => {
  // Allow "Present" as valid input
  if (value.toLowerCase().startsWith('p')) return value
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const formatZip = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 5)
}

const calculateAge = (dob: string) => {
  const [month, day, year] = dob.split('/').map(Number)
  if (!month || !day || !year || year < 1900) return ''
  const today = new Date()
  const birthDate = new Date(year, month - 1, day)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age > 0 && age < 120 ? age.toString() : ''
}

const schema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Enter date as MM/DD/YYYY"),
  age: z.string().min(1, "Age is required"),
  socialSecurityNumber: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "Enter SSN as XXX-XX-XXXX"),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Enter phone as (XXX) XXX-XXXX"),
  emergencyPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Enter phone as (XXX) XXX-XXXX"),
  physicalExamExpiration: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Enter date as MM/DD/YYYY"),
  currentAddress: z.object({
    street: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().length(2, "Enter 2-letter state code"),
    zip: z.string().length(5, "Enter 5-digit ZIP code"),
    from: z.string().min(5, "Enter as MM/YYYY"),
    to: z.string().min(5, "Enter as MM/YYYY or 'Present'"),
  }),
  workedForCompanyBefore: z.string().optional(),
  educationLevel: z.string().min(1, "Select education level"),
})

type FormData = z.infer<typeof schema>

interface Props {
  onNext: (data: { personalInfo: FormData }) => void
  initialData?: Partial<FormData>
}

export function PersonalInfoStep({ onNext, initialData }: Props) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      workedForCompanyBefore: "false",
    },
  })

  // Debug: Log form errors when they occur
  const onError = (formErrors: any) => {
    console.log("[PersonalInfoStep] Form validation errors:", formErrors)
  }

  // Watch fields for auto-formatting
  const dobValue = watch('dateOfBirth')
  
  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (dobValue && /^\d{2}\/\d{2}\/\d{4}$/.test(dobValue)) {
      const age = calculateAge(dobValue)
      if (age) setValue('age', age)
    }
  }, [dobValue, setValue])

  const onSubmit = (data: FormData) => {
    onNext({ personalInfo: data })
  }

  // Input handlers with auto-formatting
  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value)
    setValue('socialSecurityNumber', formatted, { shouldValidate: true })
  }

  const handlePhoneChange = (field: 'phone' | 'emergencyPhone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setValue(field, formatted, { shouldValidate: true })
  }

  const handleDateChange = (field: 'dateOfBirth' | 'physicalExamExpiration') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDate(e.target.value)
    setValue(field, formatted, { shouldValidate: true })
  }

  const handleMonthYearChange = (field: 'currentAddress.from' | 'currentAddress.to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMonthYear(e.target.value)
    setValue(field, formatted, { shouldValidate: true })
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZip(e.target.value)
    setValue('currentAddress.zip', formatted, { shouldValidate: true })
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    setValue('currentAddress.state', value, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)}>
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
            <User className="h-6 w-6 text-orange" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">First Name <span className="text-red-500">*</span></Label>
              <Input 
                {...register("firstName")} 
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="John"
              />
              {errors.firstName && <p className="text-sm text-red-600 mt-1 font-medium">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Last Name <span className="text-red-500">*</span></Label>
              <Input 
                {...register("lastName")} 
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Smith"
              />
              {errors.lastName && <p className="text-sm text-red-600 mt-1 font-medium">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Date of Birth <span className="text-red-500">*</span></Label>
              <Input 
                {...register("dateOfBirth")} 
                onChange={handleDateChange('dateOfBirth')}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="MM/DD/YYYY"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              {errors.dateOfBirth && <p className="text-sm text-red-600 mt-1 font-medium">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Age <span className="text-red-500">*</span></Label>
              <Input 
                {...register("age")} 
                type="number" 
                className="mt-1 bg-gray-100 border-gray-300 text-gray-900"
                readOnly
                placeholder="Auto-calculated"
              />
              <p className="text-xs text-gray-500 mt-1">Calculated from DOB</p>
              {errors.age && <p className="text-sm text-red-600 mt-1 font-medium">{errors.age.message}</p>}
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Social Security # <span className="text-red-500">*</span></Label>
              <Input 
                {...register("socialSecurityNumber")} 
                onChange={handleSSNChange}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="XXX-XX-XXXX"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              {errors.socialSecurityNumber && <p className="text-sm text-red-600 mt-1 font-medium">{errors.socialSecurityNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Phone <span className="text-red-500">*</span></Label>
              <Input 
                {...register("phone")} 
                onChange={handlePhoneChange('phone')}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="(XXX) XXX-XXXX"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              {errors.phone && <p className="text-sm text-red-600 mt-1 font-medium">{errors.phone.message}</p>}
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Emergency Contact Phone <span className="text-red-500">*</span></Label>
              <Input 
                {...register("emergencyPhone")} 
                onChange={handlePhoneChange('emergencyPhone')}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="(XXX) XXX-XXXX"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              {errors.emergencyPhone && <p className="text-sm text-red-600 mt-1 font-medium">{errors.emergencyPhone.message}</p>}
            </div>
          </div>

          <div>
            <Label className="text-gray-800 font-semibold">Physical Exam Expiration Date <span className="text-red-500">*</span></Label>
            <Input 
              {...register("physicalExamExpiration")} 
              onChange={handleDateChange('physicalExamExpiration')}
              className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 max-w-xs"
              placeholder="MM/DD/YYYY"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
            {errors.physicalExamExpiration && <p className="text-sm text-red-600 mt-1 font-medium">{errors.physicalExamExpiration.message}</p>}
          </div>

          {/* Current Address */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Current Address (Last 3 Years Required)</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-800 font-semibold">Street Address <span className="text-red-500">*</span></Label>
                <Input 
                  {...register("currentAddress.street")} 
                  className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                  placeholder="123 Main Street, Apt 4B"
                />
                {errors.currentAddress?.street && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.street.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-800 font-semibold">City <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("currentAddress.city")} 
                    className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="Seattle"
                  />
                  {errors.currentAddress?.city && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.city.message}</p>}
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">State <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("currentAddress.state")} 
                    onChange={handleStateChange}
                    className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                    placeholder="WA"
                    maxLength={2}
                  />
                  {errors.currentAddress?.state && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.state.message}</p>}
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">ZIP Code <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("currentAddress.zip")} 
                    onChange={handleZipChange}
                    className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="98101"
                    maxLength={5}
                  />
                  {errors.currentAddress?.zip && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.zip.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-800 font-semibold">From (MM/YYYY) <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("currentAddress.from")} 
                    onChange={handleMonthYearChange('currentAddress.from')}
                    className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="01/2022"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
                  {errors.currentAddress?.from && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.from.message}</p>}
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">To (MM/YYYY) <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("currentAddress.to")} 
                    onChange={handleMonthYearChange('currentAddress.to')}
                    className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="Present or 01/2024"
                  />
                  <p className="text-xs text-gray-500 mt-1">Type "Present" if current</p>
                  {errors.currentAddress?.to && <p className="text-sm text-red-600 mt-1 font-medium">{errors.currentAddress.to.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Previous Employment */}
          <div className="border-t border-gray-200 pt-6">
            <Label className="text-gray-800 font-semibold">Have you worked for this company before?</Label>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  {...register("workedForCompanyBefore")} 
                  value="true"
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  {...register("workedForCompanyBefore")} 
                  value="false"
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">No</span>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-gray-800 font-semibold">Highest Education Level <span className="text-red-500">*</span></Label>
            <select 
              {...register("educationLevel")} 
              className="w-full mt-1 bg-gray-50 border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
            >
              <option value="">Select education level...</option>
              <option value="12">High School Graduate</option>
              <option value="13">Some College</option>
              <option value="14">College 2 Years (Associate's)</option>
              <option value="16">College 4 Years (Bachelor's)</option>
              <option value="17">Post Graduate (Master's/PhD)</option>
            </select>
            {errors.educationLevel && <p className="text-sm text-red-600 mt-1 font-medium">{errors.educationLevel.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-orange hover:bg-orange/90 text-white font-semibold py-3 text-lg">
            Continue to Employment History
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

