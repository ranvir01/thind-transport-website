"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, User, Plus, Trash2 } from "lucide-react"
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
  // Allow "Present" or any variation as valid input
  const lowerValue = value.toLowerCase()
  if (lowerValue.startsWith('p') || lowerValue === 'present') {
    return value
  }
  // If it contains letters (trying to type "present"), allow it
  if (/[a-zA-Z]/.test(value)) {
    return value
  }
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

const addressSchema = z.object({
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Enter 2-letter state code"),
  zip: z.string().length(5, "Enter 5-digit ZIP code"),
  from: z.string().min(5, "Enter as MM/YYYY"),
  to: z.string().min(5, "Enter as MM/YYYY or 'Present'"),
})

const schema = z.object({
  // Position applying for - REQUIRED
  positionApplyingFor: z.enum(['contract_driver', 'contractors_driver', 'both'], {
    required_error: "Please select a position you are applying for"
  }),
  
  // Basic info - ALL REQUIRED for DOT compliance
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date of birth is required (MM/DD/YYYY)"),
  age: z.string().min(1, "Age is required"),
  socialSecurityNumber: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "Social Security Number is required (XXX-XX-XXXX)"),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Phone number is required ((XXX) XXX-XXXX)"),
  emergencyPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Emergency contact phone is required ((XXX) XXX-XXXX)"),
  physicalExamExpiration: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Physical exam expiration date is required (MM/DD/YYYY)"),
  
  // Current address - REQUIRED
  currentAddress: addressSchema,
  
  // Previous addresses (for 3 years of history) - REQUIRED if less than 3 years at current address
  previousAddresses: z.array(addressSchema).optional(),
  
  // Previous employment at this company - REQUIRED (must answer yes or no)
  workedForCompanyBefore: z.enum(['true', 'false'], {
    required_error: "Please indicate if you have worked for this company before"
  }),
  previousWorkDates: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  reasonForLeaving: z.string().optional(),
  
  // Education - matches PDF format (circle highest grade) - REQUIRED
  gradeSchool: z.number().min(1, "Indicate highest grade completed").max(12),
  college: z.number().min(0).max(4).default(0),
  postGraduate: z.number().min(0).max(4).default(0),
  
  // Legacy field for backwards compatibility
  educationLevel: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onNext: (data: { personalInfo: FormData & { education: { gradeSchool: number; college: number; postGraduate: number } } }) => void
  initialData?: Partial<FormData>
}

export function PersonalInfoStep({ onNext, initialData }: Props) {
  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      positionApplyingFor: initialData?.positionApplyingFor || 'contract_driver',
      workedForCompanyBefore: "false",
      gradeSchool: 12,
      college: 0,
      postGraduate: 0,
      previousAddresses: [],
      ...initialData,
    },
  })

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control,
    name: "previousAddresses",
  })

  // Debug: Log form errors when they occur
  const onError = (formErrors: any) => {
    console.log("[PersonalInfoStep] Form validation errors:", formErrors)
  }

  // Watch fields for auto-formatting
  const dobValue = watch('dateOfBirth')
  const workedBefore = watch('workedForCompanyBefore')
  
  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (dobValue && /^\d{2}\/\d{2}\/\d{4}$/.test(dobValue)) {
      const age = calculateAge(dobValue)
      if (age) setValue('age', age)
    }
  }, [dobValue, setValue])

  const onSubmit = (data: FormData) => {
    // Build education object from individual fields
    const education = {
      gradeSchool: data.gradeSchool || 12,
      college: data.college || 0,
      postGraduate: data.postGraduate || 0,
    }
    onNext({ personalInfo: { ...data, education } })
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

  const handleMonthYearChange = (field: `currentAddress.from` | `currentAddress.to` | `previousAddresses.${number}.from` | `previousAddresses.${number}.to` | 'previousWorkDates.from' | 'previousWorkDates.to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMonthYear(e.target.value)
    setValue(field, formatted, { shouldValidate: false })
  }

  const handleZipChange = (field: 'currentAddress.zip' | `previousAddresses.${number}.zip`) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZip(e.target.value)
    setValue(field, formatted, { shouldValidate: true })
  }

  const handleStateChange = (field: 'currentAddress.state' | `previousAddresses.${number}.state`) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    setValue(field, value, { shouldValidate: true })
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
          {/* Position Applying For */}
          <div className="border-b border-gray-200 pb-6">
            <Label className="text-gray-800 font-semibold text-lg">Position Applying For <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  {...register("positionApplyingFor")} 
                  value="contract_driver"
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Contract Driver</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  {...register("positionApplyingFor")} 
                  value="contractors_driver"
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Contractor's Driver</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  {...register("positionApplyingFor")} 
                  value="both"
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Both</span>
              </label>
            </div>
            {errors.positionApplyingFor && <p className="text-sm text-red-600 mt-1 font-medium">{errors.positionApplyingFor.message}</p>}
          </div>

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
            <h3 className="font-bold text-lg text-gray-900 mb-4">Current Address</h3>
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
                    onChange={handleStateChange('currentAddress.state')}
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
                    onChange={handleZipChange('currentAddress.zip')}
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
                    value={watch('currentAddress.from') || ''}
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
                    value={watch('currentAddress.to') || ''}
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

          {/* Previous Addresses */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Previous Addresses</h3>
                <p className="text-sm text-gray-600">List all addresses for the past 3 years</p>
              </div>
              <Button
                type="button"
                onClick={() => appendAddress({ street: '', city: '', state: '', zip: '', from: '', to: '' })}
                variant="outline"
                className="border-orange text-orange hover:bg-orange hover:text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </div>
            
            {addressFields.length === 0 && (
              <p className="text-gray-500 italic text-sm">No previous addresses added. Click "Add Address" if you have lived at other addresses in the past 3 years.</p>
            )}

            {addressFields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-800">Previous Address #{index + 1}</h4>
                  <Button
                    type="button"
                    onClick={() => removeAddress(index)}
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-800 font-semibold">Street Address <span className="text-red-500">*</span></Label>
                    <Input 
                      {...register(`previousAddresses.${index}.street`)} 
                      className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="456 Oak Avenue"
                    />
                    {errors.previousAddresses?.[index]?.street && (
                      <p className="text-sm text-red-600 mt-1 font-medium">{errors.previousAddresses[index]?.street?.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">City <span className="text-red-500">*</span></Label>
                      <Input 
                        {...register(`previousAddresses.${index}.city`)} 
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="Portland"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">State <span className="text-red-500">*</span></Label>
                      <Input 
                        {...register(`previousAddresses.${index}.state`)} 
                        onChange={handleStateChange(`previousAddresses.${index}.state`)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                        placeholder="OR"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">ZIP Code <span className="text-red-500">*</span></Label>
                      <Input 
                        {...register(`previousAddresses.${index}.zip`)} 
                        onChange={handleZipChange(`previousAddresses.${index}.zip`)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="97201"
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">From (MM/YYYY) <span className="text-red-500">*</span></Label>
                      <Input 
                        value={watch(`previousAddresses.${index}.from`) || ''}
                        onChange={handleMonthYearChange(`previousAddresses.${index}.from`)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="01/2020"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">To (MM/YYYY) <span className="text-red-500">*</span></Label>
                      <Input 
                        value={watch(`previousAddresses.${index}.to`) || ''}
                        onChange={handleMonthYearChange(`previousAddresses.${index}.to`)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="12/2021"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Previous Employment at This Company */}
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
            
            {workedBefore === 'true' && (
              <div className="mt-4 pl-4 border-l-4 border-orange bg-orange/5 p-4 rounded-r-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-800 font-semibold">From (MM/YYYY)</Label>
                    <Input 
                      value={watch('previousWorkDates.from') || ''}
                      onChange={handleMonthYearChange('previousWorkDates.from')}
                      className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="01/2019"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-800 font-semibold">To (MM/YYYY)</Label>
                    <Input 
                      value={watch('previousWorkDates.to') || ''}
                      onChange={handleMonthYearChange('previousWorkDates.to')}
                      className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="06/2020"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">Reason for Leaving</Label>
                  <Input 
                    {...register("reasonForLeaving")} 
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="e.g., Relocated to another state"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Education - Matches PDF format */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Education</h3>
            <p className="text-sm text-gray-600 mb-4">Select the highest grade completed for each level</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-gray-800 font-semibold">Grade School (1-12)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                    <label key={grade} className="cursor-pointer">
                      <input
                        type="radio"
                        {...register("gradeSchool", { valueAsNumber: true })}
                        value={grade}
                        className="sr-only peer"
                      />
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 text-sm font-medium peer-checked:border-orange peer-checked:bg-orange peer-checked:text-white transition-colors">
                        {grade}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-gray-800 font-semibold">College (1-4 years)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[0, 1, 2, 3, 4].map((year) => (
                    <label key={year} className="cursor-pointer">
                      <input
                        type="radio"
                        {...register("college", { valueAsNumber: true })}
                        value={year}
                        className="sr-only peer"
                      />
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 text-sm font-medium peer-checked:border-orange peer-checked:bg-orange peer-checked:text-white transition-colors">
                        {year}
                      </span>
                    </label>
                  ))}
            </div>
          </div>

          <div>
                <Label className="text-gray-800 font-semibold">Post Graduate (1-4 years)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[0, 1, 2, 3, 4].map((year) => (
                    <label key={year} className="cursor-pointer">
                      <input
                        type="radio"
                        {...register("postGraduate", { valueAsNumber: true })}
                        value={year}
                        className="sr-only peer"
                      />
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 text-sm font-medium peer-checked:border-orange peer-checked:bg-orange peer-checked:text-white transition-colors">
                        {year}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
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
