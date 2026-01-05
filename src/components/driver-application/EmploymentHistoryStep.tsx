"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Plus, Trash2, Briefcase } from "lucide-react"
import { toast } from "sonner"
import type { EmploymentHistoryEntry } from "@/types/driver-application"

// Auto-format helpers
const formatMonthYear = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

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

  const handleDateChange = (index: number, field: 'fromDate' | 'toDate', value: string) => {
    const formatted = formatMonthYear(value)
    updateEntry(index, field, formatted)
  }

  const handlePhoneChange = (index: number, value: string) => {
    const formatted = formatPhone(value)
    updateEntry(index, 'phone', formatted)
  }

  const handleSubmit = () => {
    // Validate at least one complete entry
    const firstEntry = entries[0]
    if (!firstEntry.employerName || !firstEntry.fromDate || !firstEntry.toDate || !firstEntry.position) {
      toast.error("Please complete at least one employment entry with employer name, dates, and position")
      return
    }
    onNext({ employmentHistory: { entries } })
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-navy to-navy/90 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Briefcase className="h-6 w-6 text-orange" />
          Employment History (Last 3 Years Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>DOT Requirement:</strong> You must provide complete employment history for the past 3 years. 
            Include ALL employment, unemployment periods, and self-employment.
          </p>
        </div>

        {entries.map((entry, index) => (
          <div key={index} className="border-2 border-gray-200 rounded-lg p-5 space-y-4 bg-gray-50 hover:border-orange/50 transition-colors">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-lg">Employer #{index + 1}</h4>
              {entries.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeEntry(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-800 font-semibold">From (MM/YY) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="01/21"
                  value={entry.fromDate}
                  onChange={(e) => handleDateChange(index, "fromDate", e.target.value)}
                  className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              </div>
              <div>
                <Label className="text-gray-800 font-semibold">To (MM/YY) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="12/23 or Present"
                  value={entry.toDate}
                  onChange={(e) => handleDateChange(index, "toDate", e.target.value)}
                  className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Type "Present" if current</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-800 font-semibold">Employer Name <span className="text-red-500">*</span></Label>
              <Input
                value={entry.employerName}
                onChange={(e) => updateEntry(index, "employerName", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Company Name LLC"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-800 font-semibold">Position <span className="text-red-500">*</span></Label>
                <Input
                  value={entry.position}
                  onChange={(e) => updateEntry(index, "position", e.target.value)}
                  className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                  placeholder="OTR Driver"
                />
              </div>
              <div>
                <Label className="text-gray-800 font-semibold">Phone <span className="text-red-500">*</span></Label>
                <Input
                  type="tel"
                  value={entry.phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                  placeholder="(XXX) XXX-XXXX"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-formats as you type</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-800 font-semibold">Address <span className="text-red-500">*</span></Label>
              <Input
                value={entry.address}
                onChange={(e) => updateEntry(index, "address", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="123 Main St, City, State ZIP"
              />
            </div>

            <div>
              <Label className="text-gray-800 font-semibold">Reason for Leaving <span className="text-red-500">*</span></Label>
              <Input
                value={entry.reasonForLeaving}
                onChange={(e) => updateEntry(index, "reasonForLeaving", e.target.value)}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                placeholder="Better opportunity, relocation, etc."
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.subjectToFMCSR}
                  onChange={(e) => updateEntry(index, "subjectToFMCSR", e.target.checked)}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300 rounded"
                />
                <span className="text-gray-800">Were you subject to FMCSRs while employed here?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.safetyFunctioning}
                  onChange={(e) => updateEntry(index, "safetyFunctioning", e.target.checked)}
                  className="w-4 h-4 text-orange focus:ring-orange border-gray-300 rounded"
                />
                <span className="text-gray-800">Was your job designated as safety-sensitive (DOT drug/alcohol testing)?</span>
              </label>
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          onClick={addEntry} 
          className="w-full border-2 border-dashed border-gray-300 hover:border-orange hover:bg-orange/5 text-gray-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Another Employer
        </Button>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-orange hover:bg-orange/90 text-white font-semibold py-3">
            Continue to Driving Record
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

