"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Shield, Plus, Trash2, AlertTriangle, FileWarning } from "lucide-react"
import { toast } from "sonner"
import type { AccidentRecord, TrafficViolation, LicenseInfo } from "@/types/driver-application"

// Auto-format helpers
const formatDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

interface DrivingRecordData {
  cdlLicenses: LicenseInfo[]
  deniedLicense: boolean
  deniedLicenseExplanation?: string
  suspendedLicense: boolean
  suspendedLicenseExplanation?: string
  felonyConviction: boolean
  felonyConvictionExplanation?: string
  accidents: AccidentRecord[]
  violations: TrafficViolation[]
}

interface Props {
  onNext: (data: { drivingRecord: DrivingRecordData }) => void
  onBack: () => void
  initialData?: DrivingRecordData
}

export function DrivingRecordStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState<DrivingRecordData>(initialData || {
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

  // CDL License handlers
  const addLicense = () => {
    setFormData({
      ...formData,
      cdlLicenses: [...formData.cdlLicenses, {
        licenseNumber: "",
        state: "",
        type: "Class A",
        endorsements: "",
        expirationDate: "",
      }]
    })
  }

  const removeLicense = (index: number) => {
    setFormData({
      ...formData,
      cdlLicenses: formData.cdlLicenses.filter((_, i) => i !== index)
    })
  }

  const updateLicense = (index: number, field: keyof LicenseInfo, value: string) => {
    const updated = [...formData.cdlLicenses]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, cdlLicenses: updated })
  }

  // Accident handlers
  const addAccident = () => {
    setFormData({
      ...formData,
      accidents: [...formData.accidents, {
        date: "",
        location: "",
        details: "",
        fatalities: "0",
        injuries: "0",
      }]
    })
  }

  const removeAccident = (index: number) => {
    setFormData({
      ...formData,
      accidents: formData.accidents.filter((_, i) => i !== index)
    })
  }

  const updateAccident = (index: number, field: keyof AccidentRecord, value: string) => {
    const updated = [...formData.accidents]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, accidents: updated })
  }

  // Violation handlers
  const addViolation = () => {
    setFormData({
      ...formData,
      violations: [...formData.violations, {
        date: "",
        location: "",
        charge: "",
        penalty: "",
      }]
    })
  }

  const removeViolation = (index: number) => {
    setFormData({
      ...formData,
      violations: formData.violations.filter((_, i) => i !== index)
    })
  }

  const updateViolation = (index: number, field: keyof TrafficViolation, value: string) => {
    const updated = [...formData.violations]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, violations: updated })
  }

  const handleSubmit = () => {
    const errors: string[] = []
    
    // At least one CDL is required
    if (formData.cdlLicenses.length === 0) {
      errors.push("At least one CDL license is required")
    } else {
      // Validate each CDL
      formData.cdlLicenses.forEach((cdl, index) => {
        const num = index + 1
        if (!cdl.licenseNumber) {
          errors.push(`CDL ${num}: License number is required`)
        }
        if (!cdl.state || cdl.state.length !== 2) {
          errors.push(`CDL ${num}: State (2-letter code) is required`)
        }
        if (!cdl.type) {
          errors.push(`CDL ${num}: License type is required`)
        }
        if (!cdl.expirationDate) {
          errors.push(`CDL ${num}: Expiration date is required`)
        }
      })
    }
    
    // Validate required yes/no questions have explanations if yes
    if (formData.deniedLicense && !formData.deniedLicenseExplanation) {
      errors.push("Please explain why your license was denied")
    }
    if (formData.suspendedLicense && !formData.suspendedLicenseExplanation) {
      errors.push("Please explain your license suspension/revocation")
    }
    if (formData.felonyConviction && !formData.felonyConvictionExplanation) {
      errors.push("Please explain your felony/DUI conviction")
    }
    
    // Validate any accidents added are complete
    formData.accidents.forEach((acc, index) => {
      const num = index + 1
      if (!acc.date) errors.push(`Accident ${num}: Date is required`)
      if (!acc.location) errors.push(`Accident ${num}: Location is required`)
      if (!acc.details) errors.push(`Accident ${num}: Description is required`)
    })
    
    // Validate any violations added are complete
    formData.violations.forEach((viol, index) => {
      const num = index + 1
      if (!viol.date) errors.push(`Violation ${num}: Date is required`)
      if (!viol.location) errors.push(`Violation ${num}: Location is required`)
      if (!viol.charge) errors.push(`Violation ${num}: Charge/offense is required`)
    })
    
    if (errors.length > 0) {
      const displayErrors = errors.slice(0, 3)
      if (errors.length > 3) {
        displayErrors.push(`...and ${errors.length - 3} more issues`)
      }
      toast.error(displayErrors.join('\n'), { duration: 5000 })
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
        {/* CDL Licenses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900">Commercial Driver's License(s)</h3>
            <Button
              type="button"
              variant="outline"
              onClick={addLicense}
              className="border-orange text-orange hover:bg-orange hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add License
            </Button>
          </div>

          {formData.cdlLicenses.map((license, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-800">License #{index + 1}</h4>
                {formData.cdlLicenses.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeLicense(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">CDL Number <span className="text-red-500">*</span></Label>
              <Input
                    value={license.licenseNumber}
                    onChange={(e) => updateLicense(index, "licenseNumber", e.target.value.toUpperCase())}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                placeholder="WA12345678"
              />
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">State <span className="text-red-500">*</span></Label>
              <Input
                maxLength={2}
                    value={license.state}
                    onChange={(e) => updateLicense(index, "state", e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
                placeholder="WA"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Type/Class <span className="text-red-500">*</span></Label>
              <select
                    className="w-full mt-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-900 focus:border-orange focus:ring-orange focus:outline-none"
                    value={license.type}
                    onChange={(e) => updateLicense(index, "type", e.target.value)}
              >
                <option value="Class A">Class A</option>
                <option value="Class B">Class B</option>
                <option value="Class C">Class C</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Endorsements</Label>
              <Input
                    placeholder="H, T, N, P, X, etc."
                    value={license.endorsements}
                    onChange={(e) => updateLicense(index, "endorsements", e.target.value.toUpperCase())}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple with commas</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-800 font-semibold">Expiration Date <span className="text-red-500">*</span></Label>
            <Input
              placeholder="MM/DD/YYYY"
                  value={license.expirationDate}
                  onChange={(e) => updateLicense(index, "expirationDate", formatDate(e.target.value))}
                  className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
          </div>
            </div>
          ))}
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

        {/* Accident Record Table */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Accident Record (Past 3 Years)
              </h3>
              <p className="text-sm text-gray-600">List all accidents you were involved in, regardless of fault</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addAccident}
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Accident
            </Button>
          </div>

          {formData.accidents.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800">No accidents recorded. Click "Add Accident" if you need to add any.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.accidents.map((accident, index) => (
                <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">Accident #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeAccident(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">Date <span className="text-red-500">*</span></Label>
                      <Input
                        value={accident.date}
                        onChange={(e) => updateAccident(index, "date", formatDate(e.target.value))}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="MM/DD/YYYY"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">Location (City, State) <span className="text-red-500">*</span></Label>
                      <Input
                        value={accident.location}
                        onChange={(e) => updateAccident(index, "location", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="Seattle, WA"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-800 font-semibold">Nature of Accident <span className="text-red-500">*</span></Label>
                    <Input
                      value={accident.details}
                      onChange={(e) => updateAccident(index, "details", e.target.value)}
                      className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                      placeholder="Brief description of what happened"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">Number of Fatalities</Label>
          <Input
            type="number"
            min="0"
                        value={accident.fatalities}
                        onChange={(e) => updateAccident(index, "fatalities", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
            placeholder="0"
                      />
        </div>
        <div>
                      <Label className="text-gray-800 font-semibold">Number of Injuries</Label>
          <Input
            type="number"
            min="0"
                        value={accident.injuries}
                        onChange={(e) => updateAccident(index, "injuries", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
            placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Traffic Violations Table */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-600" />
                Traffic Convictions (Past 3 Years)
              </h3>
              <p className="text-sm text-gray-600">List all moving violations (not parking tickets)</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addViolation}
              className="border-red-400 text-red-600 hover:bg-red-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Violation
            </Button>
          </div>

          {formData.violations.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800">No traffic violations recorded. Click "Add Violation" if you need to add any.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.violations.map((violation, index) => (
                <div key={index} className="border-2 border-red-200 rounded-lg p-4 bg-red-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">Violation #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeViolation(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">Date <span className="text-red-500">*</span></Label>
                      <Input
                        value={violation.date}
                        onChange={(e) => updateViolation(index, "date", formatDate(e.target.value))}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="MM/DD/YYYY"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">Location (City, State) <span className="text-red-500">*</span></Label>
                      <Input
                        value={violation.location}
                        onChange={(e) => updateViolation(index, "location", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="Seattle, WA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-800 font-semibold">Charge <span className="text-red-500">*</span></Label>
                      <Input
                        value={violation.charge}
                        onChange={(e) => updateViolation(index, "charge", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="e.g., Speeding, Failure to yield"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-semibold">Penalty</Label>
                      <Input
                        value={violation.penalty}
                        onChange={(e) => updateViolation(index, "penalty", e.target.value)}
                        className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                        placeholder="e.g., $200 fine, 2 points"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
