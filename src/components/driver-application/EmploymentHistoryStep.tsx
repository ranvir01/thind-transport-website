"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Plus, Trash2, Briefcase } from "lucide-react"
import type { EmploymentHistoryEntry } from "@/types/driver-application"

interface Props {
  onNext: (data: { employmentHistory: { entries: EmploymentHistoryEntry[] } }) => void
  onBack: () => void
  initialData?: { entries: EmploymentHistoryEntry[] }
}

export function EmploymentHistoryStep({ onNext, onBack, initialData }: Props) {
  const [entries, setEntries] = useState<EmploymentHistoryEntry[]>(
    initialData?.entries || [
      {
        fromDate: "",
        toDate: "",
        employerName: "",
        position: "",
        address: "",
        phone: "",
        reasonForLeaving: "",
        subjectToFMCSR: false,
        safetyFunctioning: false,
      },
    ]
  )

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        fromDate: "",
        toDate: "",
        employerName: "",
        position: "",
        address: "",
        phone: "",
        reasonForLeaving: "",
        subjectToFMCSR: false,
        safetyFunctioning: false,
      },
    ])
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, field: keyof EmploymentHistoryEntry, value: any) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], [field]: value }
    setEntries(updated)
  }

  const handleSubmit = () => {
    // Validate at least 3 years of history
    if (entries.length < 1 || !entries[0].employerName) {
      alert("Please add at least one employment entry")
      return
    }
    onNext({ employmentHistory: { entries } })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-orange" />
          Employment History (Last 3 Years Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          DOT requires complete employment history for the past 3 years. Include ALL employment, unemployment, and self-employment.
        </p>

        {entries.map((entry, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Employer #{index + 1}</h4>
              {entries.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeEntry(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From (MM/YY) *</Label>
                <Input
                  placeholder="01/21"
                  value={entry.fromDate}
                  onChange={(e) => updateEntry(index, "fromDate", e.target.value)}
                />
              </div>
              <div>
                <Label>To (MM/YY) *</Label>
                <Input
                  placeholder="12/23"
                  value={entry.toDate}
                  onChange={(e) => updateEntry(index, "toDate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Employer Name *</Label>
              <Input
                value={entry.employerName}
                onChange={(e) => updateEntry(index, "employerName", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position *</Label>
                <Input
                  value={entry.position}
                  onChange={(e) => updateEntry(index, "position", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  type="tel"
                  value={entry.phone}
                  onChange={(e) => updateEntry(index, "phone", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Address *</Label>
              <Input
                value={entry.address}
                onChange={(e) => updateEntry(index, "address", e.target.value)}
              />
            </div>

            <div>
              <Label>Reason for Leaving *</Label>
              <Input
                value={entry.reasonForLeaving}
                onChange={(e) => updateEntry(index, "reasonForLeaving", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entry.subjectToFMCSR}
                  onChange={(e) => updateEntry(index, "subjectToFMCSR", e.target.checked)}
                />
                Were you subject to FMCSRs while employed here?
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entry.safetyFunctioning}
                  onChange={(e) => updateEntry(index, "safetyFunctioning", e.target.checked)}
                />
                Was your job designated as safety-sensitive (DOT drug/alcohol testing)?
              </label>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addEntry} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Another Employer
        </Button>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Continue to Driving Record
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

