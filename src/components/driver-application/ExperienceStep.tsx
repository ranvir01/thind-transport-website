"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Award } from "lucide-react"

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

  const handleSubmit = () => {
    onNext({ experienceQualifications: formData })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-orange" />
          Experience & Qualifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Driving Experience - Tractor and Semi-Trailer</Label>
          <div className="grid grid-cols-4 gap-4 mt-2">
            <div>
              <Label className="text-xs">Type (Van/Tank/Flatbed/Reefer)</Label>
              <Input
                value={formData.drivingExperience[0].typeOfEquipment}
                onChange={(e) => setFormData({
                  ...formData,
                  drivingExperience: [{ ...formData.drivingExperience[0], typeOfEquipment: e.target.value }]
                })}
              />
            </div>
            <div>
              <Label className="text-xs">From (MM/YY)</Label>
              <Input
                value={formData.drivingExperience[0].dateFrom}
                onChange={(e) => setFormData({
                  ...formData,
                  drivingExperience: [{ ...formData.drivingExperience[0], dateFrom: e.target.value }]
                })}
              />
            </div>
            <div>
              <Label className="text-xs">To (MM/YY)</Label>
              <Input
                value={formData.drivingExperience[0].dateTo}
                onChange={(e) => setFormData({
                  ...formData,
                  drivingExperience: [{ ...formData.drivingExperience[0], dateTo: e.target.value }]
                })}
              />
            </div>
            <div>
              <Label className="text-xs">Approx. Miles</Label>
              <Input
                type="number"
                value={formData.drivingExperience[0].approximateMiles}
                onChange={(e) => setFormData({
                  ...formData,
                  drivingExperience: [{ ...formData.drivingExperience[0], approximateMiles: e.target.value }]
                })}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>States Operated In (Past 5 Years) *</Label>
          <Textarea
            placeholder="List states separated by commas (e.g., WA, OR, CA, ID, MT)"
            value={Array.isArray(formData.statesOperated) ? formData.statesOperated.join(", ") : ""}
            onChange={(e) => setFormData({
              ...formData,
              statesOperated: e.target.value.split(",").map(s => s.trim())
            })}
          />
        </div>

        <div>
          <Label>Special Courses or Training</Label>
          <Textarea
            placeholder="List any specialized training (e.g., hazmat, tanker, defensive driving)"
            value={formData.specialCourses}
            onChange={(e) => setFormData({ ...formData, specialCourses: e.target.value })}
          />
        </div>

        <div>
          <Label>Safe Operating Awards</Label>
          <Textarea
            placeholder="List any safety awards and from whom"
            value={formData.safetyAwards}
            onChange={(e) => setFormData({ ...formData, safetyAwards: e.target.value })}
          />
        </div>

        <div>
          <Label>Other Courses/Training</Label>
          <Textarea
            placeholder="Any other relevant training or certifications"
            value={formData.otherTraining}
            onChange={(e) => setFormData({ ...formData, otherTraining: e.target.value })}
          />
        </div>

        <div>
          <Label>Special Equipment or Technical Materials</Label>
          <Textarea
            placeholder="List any special equipment you can operate"
            value={formData.specialEquipment}
            onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
          />
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Continue to Authorization
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

