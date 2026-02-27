"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Trash2 } from "lucide-react"

export interface FieldDefinition {
  id: string
  label: string
  type: "text" | "checkbox" | "date" | "signature" | "number"
  page: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  required: boolean
  section?: string
  checkChar?: string
}

interface FieldEditorProps {
  field: Partial<FieldDefinition> & { page: number; x: number; y: number }
  onSave: (field: FieldDefinition) => void
  onCancel: () => void
  onDelete?: () => void
  existingIds: string[]
}

export default function FieldEditor({ field, onSave, onCancel, onDelete, existingIds }: FieldEditorProps) {
  const [formData, setFormData] = useState<FieldDefinition>({
    id: field.id || "",
    label: field.label || "",
    type: field.type || "text",
    page: field.page,
    x: Math.round(field.x),
    y: Math.round(field.y),
    width: field.width || 150,
    height: field.height || 14,
    fontSize: field.fontSize || 10,
    required: field.required ?? true,
    section: field.section || "",
    checkChar: field.checkChar || "X",
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate ID
    if (!formData.id.trim()) {
      setError("Field ID is required")
      return
    }

    // Check for duplicate IDs (excluding current field if editing)
    const isDuplicate = existingIds.includes(formData.id) && formData.id !== field.id
    if (isDuplicate) {
      setError("Field ID already exists. Please use a unique ID.")
      return
    }

    // Validate label
    if (!formData.label.trim()) {
      setError("Label is required")
      return
    }

    onSave(formData)
  }

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "checkbox", label: "Checkbox" },
    { value: "date", label: "Date" },
    { value: "signature", label: "Signature" },
    { value: "number", label: "Number" },
  ]

  const sections = [
    "Applicant Information",
    "Address History",
    "Employment History",
    "CDL Information",
    "Driving Experience",
    "Accident History",
    "Violations",
    "Criminal History",
    "Education",
    "References",
    "Authorization",
    "Certification",
    "Other",
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {field.id ? "Edit Field" : "Add New Field"}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Field ID */}
          <div>
            <Label htmlFor="fieldId">Field ID (unique identifier)</Label>
            <Input
              id="fieldId"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.replace(/\s+/g, '_') })}
              placeholder="e.g., driver_name, cdl_number"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Use snake_case, no spaces</p>
          </div>

          {/* Label */}
          <div>
            <Label htmlFor="label">Display Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Driver Full Name"
              className="mt-1"
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Field Type</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FieldDefinition["type"] })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange"
            >
              {fieldTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <Label htmlFor="section">Section (for grouping)</Label>
            <select
              id="section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange"
            >
              <option value="">-- Select Section --</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="x">X Position</Label>
              <Input
                id="x"
                type="number"
                value={formData.x}
                onChange={(e) => setFormData({ ...formData, x: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="y">Y Position</Label>
              <Input
                id="y"
                type="number"
                value={formData.y}
                onChange={(e) => setFormData({ ...formData, y: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                value={formData.fontSize}
                onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Checkbox specific */}
          {formData.type === "checkbox" && (
            <div>
              <Label htmlFor="checkChar">Check Character</Label>
              <Input
                id="checkChar"
                value={formData.checkChar}
                onChange={(e) => setFormData({ ...formData, checkChar: e.target.value })}
                placeholder="X or ✓"
                className="mt-1"
                maxLength={2}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="h-4 w-4 text-orange rounded"
            />
            <Label htmlFor="required" className="!mb-0 cursor-pointer">
              Required field
            </Label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange hover:bg-orange/90">
              Save Field
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

