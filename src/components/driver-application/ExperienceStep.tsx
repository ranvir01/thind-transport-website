"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Award, Truck, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { DrivingExperience } from "@/types/driver-application"

// Auto-format helpers
const formatMonthYear = (value: string) => {
  // Allow "Present" or any text containing letters
  const lowerValue = value.toLowerCase()
  if (lowerValue.startsWith('p') || lowerValue === 'present' || /[a-zA-Z]/.test(value)) {
    return value
  }
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const formatMiles = (value: string) => {
  const num = value.replace(/\D/g, '')
  return num ? parseInt(num).toLocaleString() : ''
}

// Equipment class options matching the PDF
const EQUIPMENT_CLASSES = [
  { value: "Straight Truck", label: "Straight Truck" },
  { value: "Tractor and Semi-Trailer", label: "Tractor and Semi-Trailer" },
  { value: "Tractor - Two Trailer", label: "Tractor - Two Trailer (Doubles/Triples)" },
  { value: "Other", label: "Other" },
]

// Equipment type options
const EQUIPMENT_TYPES = [
  { value: "Van", label: "Van/Dry Van" },
  { value: "Reefer", label: "Reefer/Refrigerated" },
  { value: "Flatbed", label: "Flatbed" },
  { value: "Tanker", label: "Tanker" },
  { value: "Hazmat", label: "Hazmat" },
  { value: "Livestock", label: "Livestock" },
  { value: "Auto Carrier", label: "Auto Carrier" },
  { value: "Intermodal", label: "Intermodal/Container" },
  { value: "Dump", label: "Dump Truck/Trailer" },
  { value: "Logging", label: "Logging" },
  { value: "Other", label: "Other" },
]

// US States for multi-select
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

interface ExperienceData {
  drivingExperience: DrivingExperience[]
  statesOperated: string[]
  specialCourses: string
  safetyAwards: string
  otherTraining: string
  specialEquipment: string
}

interface Props {
  onNext: (data: { experienceQualifications: ExperienceData }) => void
  onBack: () => void
  initialData?: ExperienceData
}

export function ExperienceStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState<ExperienceData>(initialData || {
    drivingExperience: [
      { classOfEquipment: "Tractor and Semi-Trailer", typeOfEquipment: "", dateFrom: "", dateTo: "", approximateMiles: "" },
    ],
    statesOperated: [],
    specialCourses: "",
    safetyAwards: "",
    otherTraining: "",
    specialEquipment: "",
  })

  // Driving experience handlers
  const addExperience = () => {
    setFormData({
      ...formData,
      drivingExperience: [
        ...formData.drivingExperience,
        { classOfEquipment: "", typeOfEquipment: "", dateFrom: "", dateTo: "", approximateMiles: "" }
      ]
    })
  }

  const removeExperience = (index: number) => {
    setFormData({
      ...formData,
      drivingExperience: formData.drivingExperience.filter((_, i) => i !== index)
    })
  }

  const updateExperience = (index: number, field: keyof DrivingExperience, value: string) => {
    const updated = [...formData.drivingExperience]
    if (field === 'dateFrom' || field === 'dateTo') {
      updated[index] = { ...updated[index], [field]: formatMonthYear(value) }
    } else if (field === 'approximateMiles') {
      updated[index] = { ...updated[index], [field]: formatMiles(value) }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setFormData({ ...formData, drivingExperience: updated })
  }

  // State selection handler
  const toggleState = (state: string) => {
    if (formData.statesOperated.includes(state)) {
      setFormData({
        ...formData,
        statesOperated: formData.statesOperated.filter(s => s !== state)
      })
    } else {
      setFormData({
        ...formData,
        statesOperated: [...formData.statesOperated, state]
    })
    }
  }

  const handleSubmit = () => {
    const errors: string[] = []
    
    // States operated is required
    if (formData.statesOperated.length === 0) {
      errors.push("Select at least one state you have operated in")
    }
    
    // At least one driving experience entry is required
    if (formData.drivingExperience.length === 0) {
      errors.push("Add at least one driving experience entry")
    } else {
      // Validate each experience entry
      formData.drivingExperience.forEach((exp, index) => {
        const num = index + 1
        if (!exp.classOfEquipment) {
          errors.push(`Experience ${num}: Class of equipment is required`)
        }
        if (!exp.typeOfEquipment) {
          errors.push(`Experience ${num}: Type of equipment is required`)
        }
        if (!exp.dateFrom) {
          errors.push(`Experience ${num}: Start date (From) is required`)
        }
        if (!exp.dateTo) {
          errors.push(`Experience ${num}: End date (To) is required`)
        }
        if (!exp.approximateMiles) {
          errors.push(`Experience ${num}: Approximate miles driven is required`)
        }
      })
    }
    
    if (errors.length > 0) {
      const displayErrors = errors.slice(0, 3)
      if (errors.length > 3) {
        displayErrors.push(`...and ${errors.length - 3} more issues`)
      }
      toast.error(displayErrors.join('\n'), { duration: 5000 })
      return
    }
    
    onNext({ experienceQualifications: formData })
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <Award className="h-6 w-6 text-orange" />
          Experience & Qualifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Driving Experience Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange" />
                Driving Experience
              </h3>
              <p className="text-sm text-gray-600">List all types of equipment you have experience operating</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addExperience}
              className="border-orange text-orange hover:bg-orange hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Experience
            </Button>
          </div>

          <div className="space-y-4">
            {formData.drivingExperience.map((exp, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-800">Experience #{index + 1}</h4>
                  {formData.drivingExperience.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeExperience(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-800 font-semibold">Class of Equipment <span className="text-red-500">*</span></Label>
                    <select
                      value={exp.classOfEquipment}
                      onChange={(e) => updateExperience(index, "classOfEquipment", e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
                    >
                      <option value="">Select class...</option>
                      {EQUIPMENT_CLASSES.map(cls => (
                        <option key={cls.value} value={cls.value}>{cls.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-800 font-semibold">Type of Equipment</Label>
              <select
                      value={exp.typeOfEquipment}
                      onChange={(e) => updateExperience(index, "typeOfEquipment", e.target.value)}
                className="w-full mt-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
              >
                <option value="">Select type...</option>
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
              </select>
            </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                    <Label className="text-gray-800 font-semibold">From (MM/YY) <span className="text-red-500">*</span></Label>
              <Input
                      value={exp.dateFrom}
                      onChange={(e) => updateExperience(index, "dateFrom", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="01/15"
              />
                    <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
            </div>
            <div>
                    <Label className="text-gray-800 font-semibold">To (MM/YY) <span className="text-red-500">*</span></Label>
              <Input
                      value={exp.dateTo}
                      onChange={(e) => updateExperience(index, "dateTo", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="Present or 12/24"
              />
                    <p className="text-xs text-gray-500 mt-1">Type "Present" if current</p>
            </div>
            <div>
                    <Label className="text-gray-800 font-semibold">Approximate Miles</Label>
              <Input
                      value={exp.approximateMiles}
                      onChange={(e) => updateExperience(index, "approximateMiles", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="500,000"
              />
              <p className="text-xs text-gray-500 mt-1">Total miles driven</p>
            </div>
          </div>
              </div>
            ))}
          </div>
        </div>

        {/* States Operated In */}
        <div className="border-t border-gray-200 pt-6">
          <Label className="text-gray-800 font-semibold text-lg block mb-2">
            States Operated In (Past 5 Years) <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-gray-600 mb-4">Click to select all states you have driven commercially in</p>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {US_STATES.map(state => (
              <button
                key={state}
                type="button"
                onClick={() => toggleState(state)}
                className={`p-2 rounded-md font-semibold text-sm transition-colors ${
                  formData.statesOperated.includes(state)
                    ? 'bg-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {state}
              </button>
            ))}
        </div>

          {formData.statesOperated.length > 0 && (
            <p className="text-sm text-gray-700 mt-3">
              <strong>Selected ({formData.statesOperated.length}):</strong> {formData.statesOperated.sort().join(", ")}
            </p>
          )}
        </div>

        {/* Training and Qualifications */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-900">Training & Qualifications</h3>

        <div>
          <Label className="text-gray-800 font-semibold">Special Courses or Training</Label>
          <Textarea
              placeholder="List any special driving courses, certifications, or training you have completed. Example: Hazmat certification, Tanker endorsement training, Smith System defensive driving, CDL training school name and date, etc."
            value={formData.specialCourses}
            onChange={(e) => setFormData({ ...formData, specialCourses: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
              rows={3}
          />
        </div>

        <div>
            <Label className="text-gray-800 font-semibold">Safe Driving Awards</Label>
          <Textarea
              placeholder="List any safe driving awards or recognitions. Example: 1 Million Miles Safe Driving Award from XYZ Trucking (2020), Company Safety Driver of the Year (2019), etc."
            value={formData.safetyAwards}
            onChange={(e) => setFormData({ ...formData, safetyAwards: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
              rows={3}
          />
        </div>

        <div>
            <Label className="text-gray-800 font-semibold">Other Training/Courses</Label>
          <Textarea
              placeholder="List any other relevant training or courses. Example: ELD training, load securement certification, first aid/CPR, forklift certification, etc."
            value={formData.otherTraining}
            onChange={(e) => setFormData({ ...formData, otherTraining: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
              rows={3}
          />
        </div>

        <div>
            <Label className="text-gray-800 font-semibold">Special Equipment or Technical Materials Experience</Label>
          <Textarea
              placeholder="List experience with special equipment or materials. Example: Oversize/overweight loads, escort/pilot car operations, specialized trailers (lowboy, RGN, step deck), GPS/ELD systems, etc."
            value={formData.specialEquipment}
            onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
              rows={3}
          />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-orange hover:bg-orange/90 text-white font-semibold py-3">
            Continue to Authorization
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
