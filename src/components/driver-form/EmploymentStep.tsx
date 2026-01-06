"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import type { EmploymentHistory, EmployerEntry } from "@/types/driver-application-form"

interface EmploymentStepProps {
  data: EmploymentHistory
  onChange: (data: EmploymentHistory) => void
  errors?: Record<string, string>
}

const emptyEmployer: EmployerEntry = {
  from: '',
  to: '',
  name: '',
  address: '',
  phone: '',
  position: '',
  salary: '',
  supervisor: '',
  reason: '',
}

export function EmploymentStep({ data, onChange, errors = {} }: EmploymentStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>
  
  const inputClass = (field: string) => `
    w-full px-3 py-2 border rounded-lg transition-colors
    ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  const addEmployer = () => {
    const newEmployers = [...(data.employers || []), { ...emptyEmployer }]
    onChange({ ...data, employers: newEmployers })
    setExpandedIndex(newEmployers.length - 1)
  }

  const removeEmployer = (index: number) => {
    const newEmployers = data.employers.filter((_, i) => i !== index)
    onChange({ ...data, employers: newEmployers })
    if (expandedIndex === index) {
      setExpandedIndex(newEmployers.length > 0 ? 0 : null)
    }
  }

  const updateEmployer = (index: number, field: keyof EmployerEntry, value: string | boolean) => {
    const newEmployers = [...data.employers]
    newEmployers[index] = { ...newEmployers[index], [field]: value }
    onChange({ ...data, employers: newEmployers })
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Employment History</h2>
        <p className="text-orange-100 text-sm mt-1">
          List all employment for the past 10 years (CDL experience) or past 3 years (all other).
          You MUST account for all time periods.
        </p>
      </div>

      {/* Employer Cards */}
      {data.employers?.map((employer, index) => (
        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Accordion Header */}
          <div 
            className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex items-center gap-3">
              <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-gray-800">
                  {employer.name || `Employer ${index + 1}`}
                </h3>
                {employer.from && employer.to && (
                  <p className="text-sm text-gray-500">{employer.from} - {employer.to}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.employers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeEmployer(index)
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {expandedIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>

          {/* Accordion Content */}
          {expandedIndex === index && (
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    From (Mo/Yr)<RequiredMark />
                  </Label>
                  <Input
                    value={employer.from}
                    onChange={(e) => updateEmployer(index, 'from', e.target.value)}
                    placeholder="01/2020"
                    className={inputClass(`employer_${index}_from`)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    To (Mo/Yr)<RequiredMark />
                  </Label>
                  <Input
                    value={employer.to}
                    onChange={(e) => updateEmployer(index, 'to', e.target.value)}
                    placeholder="Present"
                    className={inputClass(`employer_${index}_to`)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Phone
                  </Label>
                  <Input
                    value={employer.phone}
                    onChange={(e) => updateEmployer(index, 'phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={inputClass(`employer_${index}_phone`)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Company Name<RequiredMark />
                </Label>
                <Input
                  value={employer.name}
                  onChange={(e) => updateEmployer(index, 'name', e.target.value)}
                  placeholder="ABC Trucking Company"
                  className={inputClass(`employer_${index}_name`)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Address
                </Label>
                <Input
                  value={employer.address}
                  onChange={(e) => updateEmployer(index, 'address', e.target.value)}
                  placeholder="123 Industrial Blvd, City, State ZIP"
                  className={inputClass(`employer_${index}_address`)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Position Held<RequiredMark />
                  </Label>
                  <Input
                    value={employer.position}
                    onChange={(e) => updateEmployer(index, 'position', e.target.value)}
                    placeholder="OTR Driver"
                    className={inputClass(`employer_${index}_position`)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Salary/Wage
                  </Label>
                  <Input
                    value={employer.salary}
                    onChange={(e) => updateEmployer(index, 'salary', e.target.value)}
                    placeholder="$0.55/mile"
                    className={inputClass(`employer_${index}_salary`)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Supervisor
                  </Label>
                  <Input
                    value={employer.supervisor}
                    onChange={(e) => updateEmployer(index, 'supervisor', e.target.value)}
                    placeholder="John Manager"
                    className={inputClass(`employer_${index}_supervisor`)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Reason for Leaving<RequiredMark />
                </Label>
                <Input
                  value={employer.reason}
                  onChange={(e) => updateEmployer(index, 'reason', e.target.value)}
                  placeholder="Better opportunity"
                  className={inputClass(`employer_${index}_reason`)}
                />
              </div>

              {/* FMCSR and DOT Questions */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm text-gray-700">
                      Was this position subject to FMCSR (49 CFR Part 391)?
                    </span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={employer.fmcsr_yes || false}
                          onCheckedChange={(checked) => {
                            updateEmployer(index, 'fmcsr_yes', !!checked)
                            if (checked) updateEmployer(index, 'fmcsr_no', false)
                          }}
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={employer.fmcsr_no || false}
                          onCheckedChange={(checked) => {
                            updateEmployer(index, 'fmcsr_no', !!checked)
                            if (checked) updateEmployer(index, 'fmcsr_yes', false)
                          }}
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm text-gray-700">
                      Was this position subject to DOT drug & alcohol testing?
                    </span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={employer.drug_yes || false}
                          onCheckedChange={(checked) => {
                            updateEmployer(index, 'drug_yes', !!checked)
                            if (checked) updateEmployer(index, 'drug_no', false)
                          }}
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={employer.drug_no || false}
                          onCheckedChange={(checked) => {
                            updateEmployer(index, 'drug_no', !!checked)
                            if (checked) updateEmployer(index, 'drug_yes', false)
                          }}
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Employer Button */}
      {(data.employers?.length || 0) < 8 && (
        <Button
          type="button"
          variant="outline"
          onClick={addEmployer}
          className="w-full border-dashed border-2 border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Employer
        </Button>
      )}

      {/* Employment Gaps */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <Label className="text-sm font-semibold text-yellow-800 mb-2 block">
          Gaps in Employment
        </Label>
        <p className="text-sm text-yellow-700 mb-3">
          List and explain any gaps in employment (unemployment, illness, education, etc.)
        </p>
        <Textarea
          value={data.employment_gaps || ''}
          onChange={(e) => onChange({ ...data, employment_gaps: e.target.value })}
          placeholder="E.g., 03/2019 - 06/2019: Took time off for family reasons"
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}

