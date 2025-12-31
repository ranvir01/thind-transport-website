"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Shield } from "lucide-react"

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

  const handleSubmit = () => {
    onNext({ drivingRecord: formData })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange" />
          Driving Record & CDL Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CDL Info */}
        <div className="space-y-4">
          <h3 className="font-semibold">Commercial Driver's License</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CDL Number *</Label>
              <Input
                value={formData.cdlLicenses[0]?.licenseNumber || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], licenseNumber: e.target.value }]
                })}
              />
            </div>
            <div>
              <Label>State *</Label>
              <Input
                maxLength={2}
                value={formData.cdlLicenses[0]?.state || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], state: e.target.value }]
                })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type/Class *</Label>
              <select
                className="w-full border rounded-md p-2"
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
              <Label>Endorsements</Label>
              <Input
                placeholder="H, T, N, etc."
                value={formData.cdlLicenses[0]?.endorsements || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  cdlLicenses: [{ ...formData.cdlLicenses[0], endorsements: e.target.value }]
                })}
              />
            </div>
          </div>
          <div>
            <Label>Expiration Date * (MM/DD/YYYY)</Label>
            <Input
              placeholder="12/31/2025"
              value={formData.cdlLicenses[0]?.expirationDate || ""}
              onChange={(e) => setFormData({
                ...formData,
                cdlLicenses: [{ ...formData.cdlLicenses[0], expirationDate: e.target.value }]
              })}
            />
          </div>
        </div>

        {/* License History */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">License History</h3>
          
          <div>
            <Label>Have you ever been denied a license, permit or privilege to operate a motor vehicle?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.deniedLicense === true}
                  onChange={() => setFormData({ ...formData, deniedLicense: true })}
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.deniedLicense === false}
                  onChange={() => setFormData({ ...formData, deniedLicense: false })}
                />
                No
              </label>
            </div>
            {formData.deniedLicense && (
              <Textarea
                className="mt-2"
                placeholder="Please explain..."
                value={formData.deniedLicenseExplanation}
                onChange={(e) => setFormData({ ...formData, deniedLicenseExplanation: e.target.value })}
              />
            )}
          </div>

          <div>
            <Label>Has any license, permit or privilege ever been suspended or revoked?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.suspendedLicense === true}
                  onChange={() => setFormData({ ...formData, suspendedLicense: true })}
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.suspendedLicense === false}
                  onChange={() => setFormData({ ...formData, suspendedLicense: false })}
                />
                No
              </label>
            </div>
            {formData.suspendedLicense && (
              <Textarea
                className="mt-2"
                placeholder="Please explain..."
                value={formData.suspendedLicenseExplanation}
                onChange={(e) => setFormData({ ...formData, suspendedLicenseExplanation: e.target.value })}
              />
            )}
          </div>

          <div>
            <Label>Have you ever been convicted of a felony?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.felonyConviction === true}
                  onChange={() => setFormData({ ...formData, felonyConviction: true })}
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.felonyConviction === false}
                  onChange={() => setFormData({ ...formData, felonyConviction: false })}
                />
                No
              </label>
            </div>
            {formData.felonyConviction && (
              <Textarea
                className="mt-2"
                placeholder="Please explain..."
                value={formData.felonyConvictionExplanation}
                onChange={(e) => setFormData({ ...formData, felonyConvictionExplanation: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Accident Record */}
        <div className="border-t pt-4">
          <Label>Accident Record (Past 3 Years) - Enter number or "0"</Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={formData.accidents.length}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0
              setFormData({ ...formData, accidents: Array(count).fill({}) })
            }}
          />
        </div>

        {/* Traffic Violations */}
        <div>
          <Label>Traffic Convictions/Forfeitures (Past 3 Years) - Enter number or "0"</Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={formData.violations.length}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0
              setFormData({ ...formData, violations: Array(count).fill({}) })
            }}
          />
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Continue to Experience
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

