"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'

// Dynamically import react-pdf to avoid SSR issues (uses DOMMatrix which is browser-only)
const Document = dynamic(
  () => import('react-pdf').then((mod) => {
    // Set up PDF.js worker
    const pdfjs = mod.pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    return mod.Document
  }),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-orange" /></div> }
)
const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
)

import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { OVERLAY_FIELDS, type FieldDefinition } from '@/lib/pdf-overlay-fields'
import type { DriverApplicationData } from '@/types/driver-application'

interface PDFFormOverlayProps {
  initialData?: Record<string, string>
  onSave?: (data: Record<string, string>) => void
  onSubmit?: (data: Record<string, string>) => void
  userEmail?: string
}

const STORAGE_KEY = 'thind_pdf_overlay_form'
const TOTAL_PAGES = 25

// Pages that users need to fill (others are internal use only)
const USER_PAGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const INTERNAL_PAGES = [1, 23, 24, 25] // DQ Checklist, Road Test, Process Record

export function PDFFormOverlay({ initialData, onSave, onSubmit, userEmail }: PDFFormOverlayProps) {
  const [numPages, setNumPages] = useState<number>(TOTAL_PAGES)
  const [currentPage, setCurrentPage] = useState(2) // Start at page 2 (skip DQ checklist)
  const [scale, setScale] = useState(1.0)
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Load saved data from localStorage
  useEffect(() => {
    if (userEmail) {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_${userEmail}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.formData) {
            setFormData(prev => ({ ...prev, ...parsed.formData }))
          }
          if (parsed.currentPage) {
            setCurrentPage(parsed.currentPage)
          }
        }
      } catch (e) {
        console.error('Error loading saved form data:', e)
      }
    }
    setIsLoading(false)
  }, [userEmail])

  // Measure container width for responsive sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 48) // Account for padding
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Save to localStorage when form data changes
  const saveProgress = useCallback(() => {
    if (userEmail) {
      setIsSaving(true)
      try {
        const dataToSave = {
          formData,
          currentPage,
          savedAt: new Date().toISOString()
        }
        localStorage.setItem(`${STORAGE_KEY}_${userEmail}`, JSON.stringify(dataToSave))
        onSave?.(formData)
      } catch (e) {
        console.error('Error saving form data:', e)
      }
      setTimeout(() => setIsSaving(false), 500)
    }
  }, [formData, currentPage, userEmail, onSave])

  // Auto-save on page change and field blur
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress()
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData, currentPage, saveProgress])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setPdfError('Failed to load PDF. Please refresh the page.')
    setIsLoading(false)
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleCheckboxChange = (fieldId: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: checked ? 'X' : '' }))
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
    }
  }

  const goToNextUserPage = () => {
    const currentIndex = USER_PAGES.indexOf(currentPage)
    if (currentIndex < USER_PAGES.length - 1) {
      setCurrentPage(USER_PAGES[currentIndex + 1])
    }
  }

  const goToPrevUserPage = () => {
    const currentIndex = USER_PAGES.indexOf(currentPage)
    if (currentIndex > 0) {
      setCurrentPage(USER_PAGES[currentIndex - 1])
    }
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.0))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      // Convert overlay form data to application data structure
      const applicationData = convertFormDataToApplicationData(formData)
      const pdfBytes = await generateFilledPDF(applicationData, formData)
      
      // Download the PDF - create blob from the PDF bytes
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Thind_Transport_Application_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
    setIsGenerating(false)
  }

  const handleSubmit = () => {
    // Validate required fields
    const missingFields = validateRequiredFields(formData)
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`)
      return
    }
    onSubmit?.(formData)
  }

  // Get fields for current page
  const fieldsForCurrentPage = OVERLAY_FIELDS.filter(f => f.page === currentPage)

  // Calculate page dimensions based on container width and scale
  const pageWidth = Math.min(containerWidth, 800) * scale

  // Check if current page is internal use only
  const isInternalPage = INTERNAL_PAGES.includes(currentPage)

  // Calculate progress
  const filledFieldCount = Object.values(formData).filter(v => v && v.trim() !== '').length
  const totalRequiredFields = OVERLAY_FIELDS.filter(f => f.required).length
  const progress = totalRequiredFields > 0 ? Math.round((filledFieldCount / totalRequiredFields) * 100) : 0

  return (
    <div className="flex flex-col h-full bg-gray-100" ref={containerRef}>
      {/* Header / Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm p-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevUserPage}
              disabled={USER_PAGES.indexOf(currentPage) <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm font-medium px-3">
              Page {currentPage} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextUserPage}
              disabled={USER_PAGES.indexOf(currentPage) >= USER_PAGES.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 2.0}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-gray-600">
                {isSaving ? 'Saving...' : 'Saved'}
              </span>
            </div>
            <div className="hidden sm:block text-sm text-gray-600">
              Progress: {progress}%
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Page Quick Navigation */}
        <div className="mt-2 flex gap-1 flex-wrap">
          {USER_PAGES.map(page => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                currentPage === page
                  ? 'bg-orange text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      {/* PDF Viewer with Overlay */}
      <div className="flex-1 overflow-auto p-6 flex justify-center">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
            <span className="ml-2 text-gray-600">Loading form...</span>
          </div>
        )}

        {pdfError && (
          <div className="flex items-center justify-center h-64 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            {pdfError}
          </div>
        )}

        {/* PDF Container */}
        <div className="relative inline-block shadow-xl bg-white" style={{ width: pageWidth }}>
          {isInternalPage && (
            <div className="absolute inset-0 bg-gray-900/50 z-40 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Internal Use Only</h3>
                <p className="text-gray-600 text-sm">
                  This page is for Thind Transport staff. Click &quot;Next&quot; to continue filling out your application.
                </p>
                <Button className="mt-4" onClick={goToNextUserPage}>
                  Go to Next Page
                </Button>
              </div>
            </div>
          )}

          <Document
            file="/templates/thind-transport-application-template.pdf"
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {/* Overlay Input Fields */}
          {!isInternalPage && fieldsForCurrentPage.map(field => (
            <OverlayField
              key={field.id}
              field={field}
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
              onCheckboxChange={(checked) => handleCheckboxChange(field.id, checked)}
              scale={scale}
            />
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={goToPrevUserPage}
          disabled={USER_PAGES.indexOf(currentPage) <= 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Page
        </Button>

        <div className="text-sm text-gray-600">
          {fieldsForCurrentPage.length} fields on this page
        </div>

        {USER_PAGES.indexOf(currentPage) === USER_PAGES.length - 1 ? (
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Submit Application
          </Button>
        ) : (
          <Button onClick={goToNextUserPage}>
            Next Page
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Individual overlay field component
interface OverlayFieldProps {
  field: FieldDefinition
  value: string
  onChange: (value: string) => void
  onCheckboxChange: (checked: boolean) => void
  scale: number
}

function OverlayField({ field, value, onChange, onCheckboxChange, scale }: OverlayFieldProps) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: field.height ? `${field.height}%` : 'auto',
    zIndex: 10,
  }

  if (field.type === 'checkbox') {
    return (
      <div style={baseStyle} className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={value === 'X'}
          onChange={(e) => onCheckboxChange(e.target.checked)}
          className="w-4 h-4 accent-orange cursor-pointer"
          title={field.label}
        />
      </div>
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ''}
      className={`
        bg-yellow-50/80 border border-yellow-400 rounded px-1 text-sm
        focus:bg-white focus:border-orange focus:ring-1 focus:ring-orange
        ${field.required && !value ? 'border-red-400' : ''}
      `}
      style={{
        ...baseStyle,
        fontSize: `${(field.fontSize || 10) * scale}px`,
      }}
      title={field.label}
    />
  )
}

// Helper function to validate required fields
function validateRequiredFields(formData: Record<string, string>): string[] {
  const missing: string[] = []
  for (const field of OVERLAY_FIELDS) {
    if (field.required && (!formData[field.id] || formData[field.id].trim() === '')) {
      missing.push(field.label || field.id)
    }
  }
  return missing
}

// Helper function to convert overlay form data to application data structure
function convertFormDataToApplicationData(formData: Record<string, string>): DriverApplicationData {
  // This maps the overlay form field IDs to the application data structure
  return {
    applicationDate: formData['applicationDate'] || new Date().toLocaleDateString(),
    positionApplyingFor: formData['position_contract'] ? 'contract_driver' : 
                         formData['position_contractors'] ? 'contractors_driver' : 'both',
    personalInfo: {
      firstName: formData['firstName'] || '',
      middleName: formData['middleName'] || '',
      lastName: formData['lastName'] || '',
      dateOfBirth: formData['dateOfBirth'] || '',
      age: formData['age'] || '',
      socialSecurityNumber: formData['ssn'] || '',
      phone: formData['phone'] || '',
      emergencyPhone: formData['emergencyPhone'] || '',
      physicalExamExpiration: formData['physicalExamExp'] || '',
      currentAddress: {
        street: formData['currentAddress_street'] || '',
        city: formData['currentAddress_city'] || '',
        state: formData['currentAddress_state'] || '',
        zip: formData['currentAddress_zip'] || '',
        from: formData['currentAddress_from'] || '',
        to: formData['currentAddress_to'] || 'Present',
      },
      previousAddresses: [],
      workedForCompanyBefore: formData['workedBefore_yes'] ? 'true' : 'false',
      education: {
        gradeSchool: parseInt(formData['education_gradeSchool'] || '12'),
        college: parseInt(formData['education_college'] || '0'),
        postGraduate: parseInt(formData['education_postGrad'] || '0'),
      },
    },
    employmentHistory: {
      entries: [],
    },
    drivingRecord: {
      cdlLicenses: [{
        licenseNumber: formData['cdl_number'] || '',
        state: formData['cdl_state'] || '',
        type: formData['cdl_type'] || '',
        endorsements: formData['cdl_endorsements'] || '',
        expirationDate: formData['cdl_expiration'] || '',
      }],
      deniedLicense: formData['denied_yes'] === 'X',
      suspendedLicense: formData['suspended_yes'] === 'X',
      felonyConviction: formData['felony_yes'] === 'X',
      accidents: [],
      violations: [],
    },
    experienceQualifications: {
      drivingExperience: [],
      statesOperated: (formData['statesOperated'] || '').split(',').map(s => s.trim()).filter(Boolean),
      specialCourses: formData['specialCourses'] || '',
      safetyAwards: formData['safetyAwards'] || '',
      otherTraining: formData['otherTraining'] || '',
      specialEquipment: formData['specialEquipment'] || '',
    },
    pspAuthorization: {
      acknowledgeDisclosure: formData['psp_acknowledge'] === 'X',
      authorizeBackgroundCheck: formData['psp_authorize'] === 'X',
      understandDataQs: true,
      understandCrashDisplay: true,
      understandInspectionDisplay: true,
      acknowledgeADANotice: formData['ada_acknowledge'] === 'X',
      certifyInformationTrue: formData['certify_true'] === 'X',
      authorizeInvestigation: formData['authorize_investigation'] === 'X',
      signatureDate: formData['signatureDate'] || '',
      fullName: formData['signatureName'] || '',
    },
    driverId: '',
  }
}

// Generate filled PDF using overlay data
async function generateFilledPDF(applicationData: DriverApplicationData, overlayData: Record<string, string>): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const templateUrl = `${baseUrl}/templates/thind-transport-application-template.pdf`
  
  const response = await fetch(templateUrl)
  if (!response.ok) {
    throw new Error(`Failed to load PDF template: ${response.status}`)
  }
  
  const templateBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const pages = pdfDoc.getPages()
  
  // Map overlay field positions to PDF coordinates
  for (const field of OVERLAY_FIELDS) {
    const value = overlayData[field.id]
    if (!value || value.trim() === '') continue
    
    const page = pages[field.page - 1] // Pages are 0-indexed in pdf-lib
    if (!page) continue
    
    const { width, height } = page.getSize()
    
    // Convert percentage positions to PDF coordinates
    const x = (field.x / 100) * width
    const y = height - ((field.y / 100) * height) - 10 // PDF coordinates are from bottom
    
    if (field.type === 'checkbox' && value === 'X') {
      page.drawText('X', {
        x,
        y,
        size: field.fontSize || 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
    } else if (field.type === 'text' || field.type === 'date') {
      page.drawText(value, {
        x,
        y,
        size: field.fontSize || 10,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }
  
  return await pdfDoc.save()
}

