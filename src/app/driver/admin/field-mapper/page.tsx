"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, 
  Upload, Trash2, Eye, List, Save, Plus, AlertCircle
} from "lucide-react"
import FieldEditor, { type FieldDefinition } from "@/components/pdf-mapper/FieldEditor"

// Dynamic import to avoid SSR issues with PDF.js
const PDFPageViewer = dynamic(
  () => import("@/components/pdf-mapper/PDFPageViewer"),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse" /> }
)

const PDF_URL = "/templates/thind-transport-application-template.pdf"
const STORAGE_KEY = "thind_field_map"

export default function FieldMapperPage() {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(25)
  const [scale, setScale] = useState(1.2)
  const [showEditor, setShowEditor] = useState(false)
  const [editingField, setEditingField] = useState<Partial<FieldDefinition> | null>(null)
  const [showFieldList, setShowFieldList] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load saved fields from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.fields && Array.isArray(parsed.fields)) {
          setFields(parsed.fields)
        }
      } catch (e) {
        console.error("Failed to parse saved fields:", e)
      }
    }
  }, [])

  // Auto-save to localStorage whenever fields change
  useEffect(() => {
    if (fields.length > 0) {
      const data = { version: 1, fields }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [fields])

  // Show notification
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handle click on PDF page to add new field
  const handlePageClick = useCallback((x: number, y: number) => {
    setEditingField({
      page: currentPage,
      x,
      y,
      width: 150,
      height: 14,
      fontSize: 10,
      type: "text",
      required: true,
    })
    setShowEditor(true)
  }, [currentPage])

  // Handle click on existing field to edit
  const handleFieldClick = useCallback((field: FieldDefinition) => {
    setEditingField(field)
    setShowEditor(true)
  }, [])

  // Save new or edited field
  const handleSaveField = useCallback((field: FieldDefinition) => {
    setFields(prev => {
      const existing = prev.findIndex(f => f.id === field.id)
      if (existing >= 0) {
        // Update existing
        const updated = [...prev]
        updated[existing] = field
        return updated
      } else {
        // Add new
        return [...prev, field]
      }
    })
    setShowEditor(false)
    setEditingField(null)
    setHasUnsavedChanges(true)
    showNotification("success", `Field "${field.label}" saved!`)
  }, [])

  // Delete field
  const handleDeleteField = useCallback(() => {
    if (!editingField?.id) return
    setFields(prev => prev.filter(f => f.id !== editingField.id))
    setShowEditor(false)
    setEditingField(null)
    setHasUnsavedChanges(true)
    showNotification("success", "Field deleted")
  }, [editingField])

  // Export fields as JSON
  const handleExport = useCallback(() => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pdfTemplate: PDF_URL,
      fields,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "field-map.json"
    a.click()
    URL.revokeObjectURL(url)
    setHasUnsavedChanges(false)
    showNotification("success", "Field map exported! Place it in public/field-map.json")
  }, [fields])

  // Import fields from JSON
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.fields && Array.isArray(data.fields)) {
          setFields(data.fields)
          showNotification("success", `Imported ${data.fields.length} fields`)
        }
      } catch (err) {
        showNotification("error", "Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = "" // Reset input
  }, [])

  // Clear all fields
  const handleClearAll = useCallback(() => {
    if (confirm("Are you sure you want to delete ALL fields? This cannot be undone.")) {
      setFields([])
      localStorage.removeItem(STORAGE_KEY)
      showNotification("success", "All fields cleared")
    }
  }, [])

  // Count fields per page
  const fieldsOnCurrentPage = fields.filter(f => f.page === currentPage).length
  const existingIds = fields.map(f => f.id)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">PDF Field Mapper</h1>
            <p className="text-sm text-white/70">Click on the PDF to place form fields</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-white/20 px-3 py-1 rounded">
              {fields.length} fields mapped
            </span>
            {hasUnsavedChanges && (
              <span className="text-sm bg-yellow-500/80 px-3 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.min(totalPages, Math.max(1, Number(e.target.value))))}
                className="w-16 px-2 py-1 border rounded text-center"
              />
              <span className="text-gray-600">/ {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm text-gray-500">
              ({fieldsOnCurrentPage} fields on this page)
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFieldList(!showFieldList)}
            >
              <List className="h-4 w-4 mr-1" />
              Field List
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={fields.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={fields.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-8 px-4">
        <div className="max-w-7xl mx-auto flex gap-4">
          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto">
            <PDFPageViewer
              pdfUrl={PDF_URL}
              pageNumber={currentPage}
              fields={fields}
              onClickPage={handlePageClick}
              onClickField={handleFieldClick}
              scale={scale}
            />
          </div>

          {/* Field List Sidebar */}
          {showFieldList && (
            <div className="w-80 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-160px)]">
              <div className="p-3 bg-gray-50 border-b font-semibold flex items-center justify-between">
                <span>All Fields ({fields.length})</span>
                <button
                  onClick={() => setShowFieldList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {fields.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No fields mapped yet</p>
                    <p className="text-sm">Click on the PDF to add fields</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {fields.map((field) => (
                      <li
                        key={field.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer ${
                          field.page === currentPage ? "bg-orange/5" : ""
                        }`}
                        onClick={() => {
                          setCurrentPage(field.page)
                          handleFieldClick(field)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{field.label}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            Page {field.page}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {field.id} • {field.type} {field.required && "• required"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Instructions */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-blue-800 mb-2">How to Use:</h4>
        <ol className="list-decimal list-inside text-blue-700 space-y-1">
          <li>Navigate to a page using arrows</li>
          <li>Click anywhere on the PDF to place a field</li>
          <li>Configure the field properties</li>
          <li>Click existing fields to edit them</li>
          <li>Export JSON when done</li>
        </ol>
      </div>

      {/* Field Editor Modal */}
      {showEditor && editingField && (
        <FieldEditor
          field={editingField as Partial<FieldDefinition> & { page: number; x: number; y: number }}
          onSave={handleSaveField}
          onCancel={() => {
            setShowEditor(false)
            setEditingField(null)
          }}
          onDelete={editingField.id ? handleDeleteField : undefined}
          existingIds={existingIds}
        />
      )}
    </div>
  )
}

