"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle } from "lucide-react"
import type { PersonalInfo, Education } from "@/types/driver-application-form"

interface PersonalInfoStepProps {
  data: PersonalInfo & Partial<Education>
  onChange: (field: string, value: string | boolean) => void
  errors?: Record<string, string>
}

export function PersonalInfoStep({ data, onChange, errors = {} }: PersonalInfoStepProps) {
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>
  
  const inputClass = (field: string) => `
    w-full px-3 py-2 border rounded-lg transition-colors
    ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Personal Information</h2>
        <p className="text-orange-100 text-sm mt-1">
          Please provide your personal details. Fields marked with * are required.
        </p>
      </div>

      {/* Position Applied For */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">
          Position Applied For
        </Label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.pos_contract_driver || false}
              onCheckedChange={(checked) => onChange('pos_contract_driver', !!checked)}
            />
            <span className="text-sm">Contract Driver</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.pos_contractors_driver || false}
              onCheckedChange={(checked) => onChange('pos_contractors_driver', !!checked)}
            />
            <span className="text-sm">Contractor's Driver</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.pos_company_driver || false}
              onCheckedChange={(checked) => onChange('pos_company_driver', !!checked)}
            />
            <span className="text-sm">Company Driver</span>
          </label>
        </div>
      </div>

      {/* Name and Contact */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="applicant_name" className="text-sm font-medium text-gray-700">
            Full Legal Name (Last, First, Middle)<RequiredMark />
          </Label>
          <Input
            id="applicant_name"
            value={data.applicant_name || ''}
            onChange={(e) => onChange('applicant_name', e.target.value)}
            placeholder="Smith, John Robert"
            className={inputClass('applicant_name')}
          />
          {errors.applicant_name && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.applicant_name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address<RequiredMark />
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="john.smith@email.com"
            className={inputClass('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number<RequiredMark />
          </Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass('phone')}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="emergency_phone" className="text-sm font-medium text-gray-700">
            Emergency Contact Phone<RequiredMark />
          </Label>
          <Input
            id="emergency_phone"
            type="tel"
            value={data.emergency_phone || ''}
            onChange={(e) => onChange('emergency_phone', e.target.value)}
            placeholder="(555) 987-6543"
            className={inputClass('emergency_phone')}
          />
          {errors.emergency_phone && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.emergency_phone}
            </p>
          )}
        </div>
      </div>

      {/* DOB, Age, SSN */}
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="dob" className="text-sm font-medium text-gray-700">
            Date of Birth<RequiredMark />
          </Label>
          <Input
            id="dob"
            type="date"
            value={data.dob || ''}
            onChange={(e) => onChange('dob', e.target.value)}
            className={inputClass('dob')}
          />
          {errors.dob && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.dob}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="age" className="text-sm font-medium text-gray-700">
            Age
          </Label>
          <Input
            id="age"
            value={data.age || ''}
            onChange={(e) => onChange('age', e.target.value)}
            placeholder="35"
            className={inputClass('age')}
          />
        </div>

        <div>
          <Label htmlFor="ssn" className="text-sm font-medium text-gray-700">
            Social Security Number<RequiredMark />
          </Label>
          <Input
            id="ssn"
            value={data.ssn || ''}
            onChange={(e) => onChange('ssn', e.target.value)}
            placeholder="XXX-XX-XXXX"
            className={inputClass('ssn')}
          />
          {errors.ssn && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.ssn}
            </p>
          )}
        </div>
      </div>

      {/* Medical Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="physical_exam_exp" className="text-sm font-medium text-gray-700">
            DOT Physical Exam Expiration Date<RequiredMark />
          </Label>
          <Input
            id="physical_exam_exp"
            type="date"
            value={data.physical_exam_exp || ''}
            onChange={(e) => onChange('physical_exam_exp', e.target.value)}
            className={inputClass('physical_exam_exp')}
          />
          {errors.physical_exam_exp && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.physical_exam_exp}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="med_card_state" className="text-sm font-medium text-gray-700">
            Medical Card State
          </Label>
          <Input
            id="med_card_state"
            value={data.med_card_state || ''}
            onChange={(e) => onChange('med_card_state', e.target.value.toUpperCase())}
            placeholder="CA"
            maxLength={2}
            className={inputClass('med_card_state')}
          />
        </div>
      </div>

      {/* Legal Status */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-4">Legal Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-700">
              Are you legally authorized to work in the United States?
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.legal_work_yes || false}
                  onCheckedChange={(checked) => {
                    onChange('legal_work_yes', !!checked)
                    if (checked) onChange('legal_work_no', false)
                  }}
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.legal_work_no || false}
                  onCheckedChange={(checked) => {
                    onChange('legal_work_no', !!checked)
                    if (checked) onChange('legal_work_yes', false)
                  }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-700">
              Are you at least 21 years of age?
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.age_21_yes || false}
                  onCheckedChange={(checked) => {
                    onChange('age_21_yes', !!checked)
                    if (checked) onChange('age_21_no', false)
                  }}
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.age_21_no || false}
                  onCheckedChange={(checked) => {
                    onChange('age_21_no', !!checked)
                    if (checked) onChange('age_21_yes', false)
                  }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-700">
              Can you read and speak English per FMCSR 391.11?
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.english_yes || false}
                  onCheckedChange={(checked) => {
                    onChange('english_yes', !!checked)
                    if (checked) onChange('english_no', false)
                  }}
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.english_no || false}
                  onCheckedChange={(checked) => {
                    onChange('english_no', !!checked)
                    if (checked) onChange('english_yes', false)
                  }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

