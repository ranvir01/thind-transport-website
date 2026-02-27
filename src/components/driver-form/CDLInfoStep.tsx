"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { CDLInfo, LicenseEntry } from "@/types/driver-application-form"

interface CDLInfoStepProps {
  data: CDLInfo
  onChange: (data: CDLInfo) => void
  errors?: Record<string, string>
}

const emptyLicense: LicenseEntry = {
  state: '',
  number: '',
  class: '',
  endorsements: '',
  restrictions: '',
  exp: '',
}

export function CDLInfoStep({ data, onChange, errors = {} }: CDLInfoStepProps) {
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>
  
  const inputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  const addLicense = () => {
    const newLicenses = [...(data.licenses || []), { ...emptyLicense }]
    onChange({ ...data, licenses: newLicenses })
  }

  const removeLicense = (index: number) => {
    const newLicenses = data.licenses.filter((_, i) => i !== index)
    onChange({ ...data, licenses: newLicenses })
  }

  const updateLicense = (index: number, field: keyof LicenseEntry, value: string) => {
    const newLicenses = [...data.licenses]
    newLicenses[index] = { ...newLicenses[index], [field]: value }
    onChange({ ...data, licenses: newLicenses })
  }

  const updateField = (field: string, value: boolean | string) => {
    onChange({ ...data, [field]: value })
  }

  const questions = [
    { 
      id: "denied", 
      text: "A. Have you ever been denied a license, permit, or privilege to operate a motor vehicle?" 
    },
    { 
      id: "suspended", 
      text: "B. Has any license, permit, or privilege ever been suspended or revoked?" 
    },
    { 
      id: "felony", 
      text: "C. Have you ever been convicted of a felony?" 
    },
    { 
      id: "dui", 
      text: "D. Have you ever been convicted of DUI/DWI or refused a drug/alcohol test?" 
    },
    { 
      id: "failed_drug", 
      text: "E. Have you ever failed or refused a pre-employment DOT drug/alcohol test?" 
    },
  ]

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">CDL / License Information</h2>
        <p className="text-orange-100 text-sm mt-1">
          Provide all current and previous driver's license information.
        </p>
      </div>

      {/* License Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Driver's License Information<RequiredMark />
        </h3>

        {data.licenses?.map((license, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">License #{index + 1}</h4>
              {data.licenses.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLicense(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="grid md:grid-cols-6 gap-4">
              <div>
                <Label className="text-sm text-gray-600">State</Label>
                <Input
                  value={license.state}
                  onChange={(e) => updateLicense(index, 'state', e.target.value.toUpperCase())}
                  placeholder="CA"
                  maxLength={2}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm text-gray-600">License Number</Label>
                <Input
                  value={license.number}
                  onChange={(e) => updateLicense(index, 'number', e.target.value)}
                  placeholder="A1234567"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Class</Label>
                <Input
                  value={license.class}
                  onChange={(e) => updateLicense(index, 'class', e.target.value.toUpperCase())}
                  placeholder="A"
                  maxLength={2}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Endorsements</Label>
                <Input
                  value={license.endorsements}
                  onChange={(e) => updateLicense(index, 'endorsements', e.target.value.toUpperCase())}
                  placeholder="H,N,T"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Exp. Date</Label>
                <Input
                  type="date"
                  value={license.exp}
                  onChange={(e) => updateLicense(index, 'exp', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-sm text-gray-600">Restrictions</Label>
              <Input
                value={license.restrictions}
                onChange={(e) => updateLicense(index, 'restrictions', e.target.value)}
                placeholder="None"
                className={inputClass}
              />
            </div>
          </div>
        ))}

        {/* Add License Button */}
        {(data.licenses?.length || 0) < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={addLicense}
            className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another License
          </Button>
        )}

        {/* Endorsements Legend */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Endorsements:</strong> H=Hazmat, N=Tank, P=Passenger, S=School Bus, T=Doubles/Triples, X=Hazmat+Tank
          </p>
        </div>
      </div>

      {/* Driver History Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Driver History Questions - Answer All
        </h3>

        {questions.map((q) => (
          <div 
            key={q.id}
            className="flex items-center justify-between flex-wrap gap-4 p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-sm text-gray-700 flex-1">{q.text}</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(data as any)[`${q.id}_yes`] || false}
                  onCheckedChange={(checked) => {
                    updateField(`${q.id}_yes`, !!checked)
                    if (checked) updateField(`${q.id}_no`, false)
                  }}
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(data as any)[`${q.id}_no`] || false}
                  onCheckedChange={(checked) => {
                    updateField(`${q.id}_no`, !!checked)
                    if (checked) updateField(`${q.id}_yes`, false)
                  }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        ))}

        {/* Explanation if any Yes */}
        <div className="mt-4">
          <Label className="text-sm font-medium text-gray-700">
            If you answered YES to any question above, provide details:
          </Label>
          <Textarea
            value={data.abc_explanation || ''}
            onChange={(e) => updateField('abc_explanation', e.target.value)}
            placeholder="Please explain the circumstances..."
            className="mt-2 min-h-[80px]"
          />
        </div>
      </div>

      {/* Medical Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Medical Information
        </h3>

        <div className="flex items-center justify-between flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-700">
            Do you have any physical condition that would affect your ability to operate a CMV?
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.physical_condition_yes || false}
                onCheckedChange={(checked) => {
                  updateField('physical_condition_yes', !!checked)
                  if (checked) updateField('physical_condition_no', false)
                }}
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.physical_condition_no || false}
                onCheckedChange={(checked) => {
                  updateField('physical_condition_no', !!checked)
                  if (checked) updateField('physical_condition_yes', false)
                }}
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-700">
            Are you currently taking any medications that could impair safe CMV operation?
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.medications_yes || false}
                onCheckedChange={(checked) => {
                  updateField('medications_yes', !!checked)
                  if (checked) updateField('medications_no', false)
                }}
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.medications_no || false}
                onCheckedChange={(checked) => {
                  updateField('medications_no', !!checked)
                  if (checked) updateField('medications_yes', false)
                }}
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {(data.physical_condition_yes || data.medications_yes) && (
          <div>
            <Label className="text-sm font-medium text-gray-700">
              If yes to either, please explain:
            </Label>
            <Textarea
              value={data.medical_explanation || ''}
              onChange={(e) => updateField('medical_explanation', e.target.value)}
              placeholder="Describe the condition or medication..."
              className="mt-2 min-h-[60px]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

