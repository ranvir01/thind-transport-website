"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, Plus, Trash2, Briefcase, Clock, User } from "lucide-react"
import { toast } from "sonner"
import type { EmploymentHistoryEntry } from "@/types/driver-application"

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

type EntryType = 'employment' | 'unemployment' | 'self-employment'

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
        isUnemployment: false,
        isSelfEmployment: false,
      },
    ]
  )

  const addEntry = (type: EntryType) => {
    const newEntry: EmploymentHistoryEntry = {
      fromDate: "",
      toDate: "",
      employerName: type === 'unemployment' ? 'UNEMPLOYMENT' : (type === 'self-employment' ? '' : ''),
      position: type === 'unemployment' ? 'Unemployed' : '',
      address: "",
      phone: "",
      reasonForLeaving: "",
      subjectToFMCSR: false,
      safetyFunctioning: false,
      isUnemployment: type === 'unemployment',
      isSelfEmployment: type === 'self-employment',
    }
    setEntries([...entries, newEntry])
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
    const hasValidEntry = entries.some(entry => {
      if (entry.isUnemployment) {
        return entry.fromDate && entry.toDate
      }
      return entry.employerName && entry.fromDate && entry.toDate && entry.position
    })
    
    if (!hasValidEntry) {
      toast.error("Please complete at least one employment entry with employer name, dates, and position")
      return
    }
    onNext({ employmentHistory: { entries } })
  }

  const getEntryTitle = (entry: EmploymentHistoryEntry, index: number) => {
    if (entry.isUnemployment) return `Unemployment Period #${index + 1}`
    if (entry.isSelfEmployment) return `Self-Employment #${index + 1}`
    return `Employer #${index + 1}`
  }

  const getEntryIcon = (entry: EmploymentHistoryEntry) => {
    if (entry.isUnemployment) return <Clock className="h-5 w-5 text-yellow-600" />
    if (entry.isSelfEmployment) return <User className="h-5 w-5 text-green-600" />
    return <Briefcase className="h-5 w-5 text-orange" />
  }

  const getEntryBorderColor = (entry: EmploymentHistoryEntry) => {
    if (entry.isUnemployment) return 'border-yellow-300 bg-yellow-50'
    if (entry.isSelfEmployment) return 'border-green-300 bg-green-50'
    return 'border-gray-200 bg-gray-50'
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <Briefcase className="h-6 w-6 text-orange" />
          Employment History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>DOT Requirement:</strong> Provide complete employment history for the past 3 years, plus 10 years of commercial driving experience. 
            Include ALL employment, unemployment periods, and self-employment. Account for all time with no gaps.
          </p>
        </div>

        {entries.map((entry, index) => (
          <div key={index} className={`border-2 rounded-lg p-5 space-y-4 hover:border-orange/50 transition-colors ${getEntryBorderColor(entry)}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getEntryIcon(entry)}
                <h4 className="font-bold text-gray-900 text-lg">{getEntryTitle(entry, index)}</h4>
              </div>
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

            {/* Unemployment-specific fields */}
            {entry.isUnemployment && (
              <div className="p-3 bg-yellow-100 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Unemployment Period:</strong> Explain how you supported yourself during this time.
                </p>
                <div className="mt-3">
                  <Label className="text-gray-800 font-semibold">Explanation</Label>
                  <Input
                    value={entry.reasonForLeaving}
                    onChange={(e) => updateEntry(index, "reasonForLeaving", e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="e.g., Unemployment benefits, savings, family support"
                  />
                </div>
              </div>
            )}

            {/* Self-employment specific fields */}
            {entry.isSelfEmployment && (
              <>
                <div>
                  <Label className="text-gray-800 font-semibold">Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={entry.employerName}
                    onChange={(e) => updateEntry(index, "employerName", e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="Your Business Name or DBA"
                  />
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">Type of Business / Position <span className="text-red-500">*</span></Label>
                  <Input
                    value={entry.position}
                    onChange={(e) => updateEntry(index, "position", e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="Owner-Operator, Trucking Business, etc."
                  />
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">Business Address</Label>
                  <Input
                    value={entry.address}
                    onChange={(e) => updateEntry(index, "address", e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">Business Phone</Label>
                  <Input
                    type="tel"
                    value={entry.phone}
                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="(XXX) XXX-XXXX"
                  />
                </div>
                <div>
                  <Label className="text-gray-800 font-semibold">Reason for Leaving</Label>
                  <Input
                    value={entry.reasonForLeaving}
                    onChange={(e) => updateEntry(index, "reasonForLeaving", e.target.value)}
                    className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
                    placeholder="Sold business, seeking company position, etc."
                  />
                </div>
              </>
            )}

            {/* Standard employment fields */}
            {!entry.isUnemployment && !entry.isSelfEmployment && (
              <>
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
              </>
            )}

            {/* FMCSR Questions - only for employment/self-employment */}
            {!entry.isUnemployment && (
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
            )}
          </div>
        ))}

        {/* Add Entry Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            onClick={() => addEntry('employment')} 
            className="border-2 border-dashed border-gray-300 hover:border-orange hover:bg-orange/5 text-gray-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Employer
          </Button>
          <Button 
            variant="outline" 
            onClick={() => addEntry('unemployment')} 
            className="border-2 border-dashed border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50 text-yellow-700"
          >
            <Clock className="mr-2 h-5 w-5" />
            Add Unemployment Period
          </Button>
          <Button 
            variant="outline" 
            onClick={() => addEntry('self-employment')} 
            className="border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-700"
          >
            <User className="mr-2 h-5 w-5" />
            Add Self-Employment
          </Button>
        </div>

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
