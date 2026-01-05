"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Award } from "lucide-react"
import { toast } from "sonner"

// Auto-format helpers
const formatMonthYear = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const formatMiles = (value: string) => {
  const num = value.replace(/\D/g, '')
  return num ? parseInt(num).toLocaleString() : ''
}

interface Props {
  onNext: (data: { experienceQualifications: any }) => void
  onBack: () => void
  initialData?: any
}

export function ExperienceStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState(initialData || {
    drivingExperience: [
      { classOfEquipment: "Tractor and Semi-Trailer", typeOfEquipment: "", dateFrom: "", dateTo: "", approximateMiles: "" },
    ],
    statesOperated: [],
    specialCourses: "",
    safetyAwards: "",
    otherTraining: "",
    specialEquipment: "",
  })

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    const formatted = formatMonthYear(value)
    setFormData({
      ...formData,
      drivingExperience: [{ ...formData.drivingExperience[0], [field]: formatted }]
    })
  }

  const handleMilesChange = (value: string) => {
    const formatted = formatMiles(value)
    setFormData({
      ...formData,
      drivingExperience: [{ ...formData.drivingExperience[0], approximateMiles: formatted }]
    })
  }

  const handleSubmit = () => {
    if (formData.statesOperated.length === 0 || !formData.statesOperated[0]) {
      toast.error("Please list at least one state you have operated in")
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
        <div className="p-4 bg-gray-50 rounded-lg">
          <Label className="text-gray-900 font-bold text-lg block mb-4">Driving Experience - Tractor and Semi-Trailer</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold text-sm">Type of Equipment</Label>
              <select
                value={formData.drivingExperience[0].typeOfEquipment}
                onChange={(e) => setFormData({
                  ...formData,
                  drivingExperience: [{ ...formData.drivingExperience[0], typeOfEquipment: e.target.value }]
                })}
                className="w-full mt-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
              >
                <option value="">Select type...</option>
                <option value="Van">Van/Dry Van</option>
                <option value="Reefer">Reefer/Refrigerated</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Tanker">Tanker</option>
                <option value="Hazmat">Hazmat</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold text-sm">From (MM/YY)</Label>
              <Input
                value={formData.drivingExperience[0].dateFrom}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="01/20"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats</p>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold text-sm">To (MM/YY)</Label>
              <Input
                value={formData.drivingExperience[0].dateTo}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="12/24"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-formats</p>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold text-sm">Approx. Miles</Label>
              <Input
                value={formData.drivingExperience[0].approximateMiles}
                onChange={(e) => handleMilesChange(e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="500,000"
              />
              <p className="text-xs text-gray-500 mt-1">Total miles driven</p>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-gray-800 font-semibold">States Operated In (Past 5 Years) <span className="text-red-500">*</span></Label>
          <Textarea
            placeholder="WA, OR, CA, ID, MT, NV, AZ..."
            value={Array.isArray(formData.statesOperated) ? formData.statesOperated.join(", ") : ""}
            onChange={(e) => setFormData({
              ...formData,
              statesOperated: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(s => s)
            })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">Separate state codes with commas</p>
        </div>

        <div>
          <Label className="text-gray-800 font-semibold">Special Courses or Training</Label>
          <Textarea
            placeholder="Hazmat certification, Tanker endorsement training, Smith System defensive driving, etc."
            value={formData.specialCourses}
            onChange={(e) => setFormData({ ...formData, specialCourses: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
          />
        </div>

        <div>
          <Label className="text-gray-800 font-semibold">Safe Operating Awards</Label>
          <Textarea
            placeholder="1 Million Miles Safe Driving Award from XYZ Trucking, etc."
            value={formData.safetyAwards}
            onChange={(e) => setFormData({ ...formData, safetyAwards: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
          />
        </div>

        <div>
          <Label className="text-gray-800 font-semibold">Other Courses/Training</Label>
          <Textarea
            placeholder="ELD training, load securement, etc."
            value={formData.otherTraining}
            onChange={(e) => setFormData({ ...formData, otherTraining: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
          />
        </div>

        <div>
          <Label className="text-gray-800 font-semibold">Special Equipment or Technical Materials</Label>
          <Textarea
            placeholder="Oversize/overweight loads, specialized trailers, etc."
            value={formData.specialEquipment}
            onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
          />
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

