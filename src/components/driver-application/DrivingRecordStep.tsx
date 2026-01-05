"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Shield } from "lucide-react"
import { toast } from "sonner"

// Auto-format helpers
const formatDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

interface Props {
  onNext: (data: { drivingRecord: any }) => void
  onBack: () => void
  initialData?: any
}

export function DrivingRecordStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState(initialData || {
    cdlLicenses: [{
      licenseNumber: "",
      state: "",
      type: "Class A",
      endorsements: "",
      expirationDate: "",
    }],
    deniedLicense: false,
    deniedLicenseExplanation: "",
    suspendedLicense: false,
    suspendedLicenseExplanation: "",
    felonyConviction: false,
    felonyConvictionExplanation: "",
    accidents: [],
    violations: [],
  })

  const handleDateChange = (value: string) => {
    const formatted = formatDate(value)
    setFormData({
      ...formData,
      cdlLicenses: [{ ...formData.cdlLicenses[0], expirationDate: formatted }]
    })
  }

  const handleStateChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    setFormData({
      ...formData,
      cdlLicenses: [{ ...formData.cdlLicenses[0], state: formatted }]
    })
  }

  const handleSubmit = () => {
    const cdl = formData.cdlLicenses[0]
    if (!cdl.licenseNumber || !cdl.state || !cdl.expirationDate) {
      toast.error("Please complete all required CDL fields")
      return
    }
    onNext({ drivingRecord: formData })
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <Shield className="h-6 w-6 text-orange" />
          Driving Record & CDL Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* CDL Info */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-900">Commercial Driver's License</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">CDL Number <span className="text-red-500">*</span></Label>
              <Input
                value={formData.cdlLicenses[0]?.licenseNumber || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], licenseNumber: e.target.value.toUpperCase() }]
                })}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                placeholder="WA12345678"
              />
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">State <span className="text-red-500">*</span></Label>
              <Input
                maxLength={2}
                value={formData.cdlLicenses[0]?.state || ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                placeholder="WA"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Type/Class <span className="text-red-500">*</span></Label>
              <select
                className="w-full mt-1 bg-gray-50 border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
                value={formData.cdlLicenses[0]?.type || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], type: e.target.value }]
                })}
              >
                <option value="Class A">Class A</option>
                <option value="Class B">Class B</option>
                <option value="Class C">Class C</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Endorsements</Label>
              <Input
                placeholder="H, T, N, etc."
                value={formData.cdlLicenses[0]?.endorsements || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], endorsements: e.target.value.toUpperCase() }]
                })}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple with commas</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-800 font-semibold">Expiration Date <span className="text-red-500">*</span></Label>
            <Input
              placeholder="MM/DD/YYYY"
              value={formData.cdlLicenses[0]?.expirationDate || ""}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
          </div>
        </div>

        {/* License History */}
        <div className="border-t border-gray-200 pt-6 space-y-5">
          <h3 className="font-bold text-lg text-gray-900">License History</h3>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-gray-800 font-semibold">Have you ever been denied a license, permit or privilege to operate a motor vehicle?</Label>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.deniedLicense === true}
                  onChange={() => setFormData({ ...formData, deniedLicense: true })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.deniedLicense === false}
                  onChange={() => setFormData({ ...formData, deniedLicense: false })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">No</span>
              </label>
            </div>
            {formData.deniedLicense && (
              <Textarea
                className="mt-3 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Please explain the circumstances..."
                value={formData.deniedLicenseExplanation}
                onChange={(e) => setFormData({ ...formData, deniedLicenseExplanation: e.target.value })}
              />
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-gray-800 font-semibold">Has any license, permit or privilege ever been suspended or revoked?</Label>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.suspendedLicense === true}
                  onChange={() => setFormData({ ...formData, suspendedLicense: true })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.suspendedLicense === false}
                  onChange={() => setFormData({ ...formData, suspendedLicense: false })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">No</span>
              </label>
            </div>
            {formData.suspendedLicense && (
              <Textarea
                className="mt-3 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Please explain the circumstances..."
                value={formData.suspendedLicenseExplanation}
                onChange={(e) => setFormData({ ...formData, suspendedLicenseExplanation: e.target.value })}
              />
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-gray-800 font-semibold">Have you ever been convicted of a felony?</Label>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.felonyConviction === true}
                  onChange={() => setFormData({ ...formData, felonyConviction: true })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.felonyConviction === false}
                  onChange={() => setFormData({ ...formData, felonyConviction: false })}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300"
                />
                <span className="text-gray-800">No</span>
              </label>
            </div>
            {formData.felonyConviction && (
              <Textarea
                className="mt-3 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Please explain the circumstances..."
                value={formData.felonyConvictionExplanation}
                onChange={(e) => setFormData({ ...formData, felonyConvictionExplanation: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Accident Record */}
        <div className="border-t border-gray-200 pt-6">
          <Label className="text-gray-800 font-semibold">Number of Accidents (Past 3 Years)</Label>
          <Input
            type="number"
            min="0"
            max="99"
            placeholder="0"
            value={formData.accidents.length || "0"}
            onChange={(e) => {
              const count = Math.min(99, Math.max(0, parseInt(e.target.value) || 0))
              setFormData({ ...formData, accidents: Array(count).fill({}) })
            }}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 max-w-[120px]"
          />
          <p className="text-xs text-gray-500 mt-1">Enter 0 if none</p>
        </div>

        {/* Traffic Violations */}
        <div>
          <Label className="text-gray-800 font-semibold">Number of Traffic Convictions/Forfeitures (Past 3 Years)</Label>
          <Input
            type="number"
            min="0"
            max="99"
            placeholder="0"
            value={formData.violations.length || "0"}
            onChange={(e) => {
              const count = Math.min(99, Math.max(0, parseInt(e.target.value) || 0))
              setFormData({ ...formData, violations: Array(count).fill({}) })
            }}
            className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 max-w-[120px]"
          />
          <p className="text-xs text-gray-500 mt-1">Enter 0 if none</p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-orange hover:bg-orange/90 text-white font-semibold py-3">
            Continue to Experience
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

