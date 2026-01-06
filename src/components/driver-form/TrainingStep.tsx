"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { Training, TrainingEntry } from "@/types/driver-application-form"

interface TrainingStepProps {
  data: Training
  onChange: (data: Training) => void
  errors?: Record<string, string>
}

const emptyTraining: TrainingEntry = {
  name: '',
  date: '',
  cert: '',
}

export function TrainingStep({ data, onChange, errors = {} }: TrainingStepProps) {
  const inputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  const addTraining = () => {
    const newTraining = [...(data.training || []), { ...emptyTraining }]
    onChange({ ...data, training: newTraining })
  }

  const removeTraining = (index: number) => {
    const newTraining = data.training.filter((_, i) => i !== index)
    onChange({ ...data, training: newTraining })
  }

  const updateTraining = (index: number, field: keyof TrainingEntry, value: string) => {
    const newTraining = [...data.training]
    newTraining[index] = { ...newTraining[index], [field]: value }
    onChange({ ...data, training: newTraining })
  }

  const updateField = (field: string, value: string | boolean) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Training & Skills</h2>
        <p className="text-orange-100 text-sm mt-1">
          Provide information about your training, awards, military service, and references.
        </p>
      </div>

      {/* Training/Courses */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Training & Courses
        </h3>

        {data.training?.map((t, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">Training #{index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTraining(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Course/Program Name</Label>
                <Input
                  value={t.name}
                  onChange={(e) => updateTraining(index, 'name', e.target.value)}
                  placeholder="CDL Training School"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Completion Date</Label>
                <Input
                  type="date"
                  value={t.date}
                  onChange={(e) => updateTraining(index, 'date', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Certificate/License #</Label>
                <Input
                  value={t.cert}
                  onChange={(e) => updateTraining(index, 'cert', e.target.value)}
                  placeholder="CERT-12345"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addTraining}
          className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Training
        </Button>
      </div>

      {/* Awards & Qualifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Awards & Qualifications
        </h3>

        <div>
          <Label className="text-sm font-medium text-gray-700">
            Safe Driving Awards
          </Label>
          <Textarea
            value={data.safe_driving_awards || ''}
            onChange={(e) => updateField('safe_driving_awards', e.target.value)}
            placeholder="List any safe driving awards received..."
            className="mt-2 min-h-[60px]"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700">
            Other Qualifications
          </Label>
          <Textarea
            value={data.other_qualifications || ''}
            onChange={(e) => updateField('other_qualifications', e.target.value)}
            placeholder="List any other relevant qualifications..."
            className="mt-2 min-h-[60px]"
          />
        </div>
      </div>

      {/* Military Service */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Military Service
        </h3>

        <div className="flex items-center justify-between flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-700">
            Have you served in the military?
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.military_yes || false}
                onCheckedChange={(checked) => {
                  updateField('military_yes', !!checked)
                  if (checked) updateField('military_no', false)
                }}
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.military_no || false}
                onCheckedChange={(checked) => {
                  updateField('military_no', !!checked)
                  if (checked) updateField('military_yes', false)
                }}
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {data.military_yes && (
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <Label className="text-sm text-gray-600">Branch</Label>
              <Input
                value={data.military_branch || ''}
                onChange={(e) => updateField('military_branch', e.target.value)}
                placeholder="U.S. Army"
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Rank at Discharge</Label>
              <Input
                value={data.military_rank || ''}
                onChange={(e) => updateField('military_rank', e.target.value)}
                placeholder="Sergeant"
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">From</Label>
              <Input
                value={data.military_from || ''}
                onChange={(e) => updateField('military_from', e.target.value)}
                placeholder="01/2010"
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">To</Label>
              <Input
                value={data.military_to || ''}
                onChange={(e) => updateField('military_to', e.target.value)}
                placeholder="12/2014"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm text-gray-600">Driving Experience in Military</Label>
              <Input
                value={data.military_driving_exp || ''}
                onChange={(e) => updateField('military_driving_exp', e.target.value)}
                placeholder="Describe any military driving experience..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* References */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Personal References (Non-Family)
        </h3>
        <p className="text-sm text-gray-600">
          Provide 3 personal references who are not related to you.
        </p>

        {[1, 2, 3].map((num) => (
          <div key={num} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-700 mb-3">Reference #{num}</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Name</Label>
                <Input
                  value={(data as any)[`ref${num}_name`] || ''}
                  onChange={(e) => updateField(`ref${num}_name`, e.target.value)}
                  placeholder="John Smith"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Phone</Label>
                <Input
                  value={(data as any)[`ref${num}_phone`] || ''}
                  onChange={(e) => updateField(`ref${num}_phone`, e.target.value)}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Relationship</Label>
                <Input
                  value={(data as any)[`ref${num}_relationship`] || ''}
                  onChange={(e) => updateField(`ref${num}_relationship`, e.target.value)}
                  placeholder="Former coworker"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

