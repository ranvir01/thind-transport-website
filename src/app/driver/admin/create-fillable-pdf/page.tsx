"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PDFDocument, rgb } from "pdf-lib"
import { Download, Loader2, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"

// Field definitions for the fillable PDF
const FORM_FIELDS = [
  // PAGE 1: DQ Checklist
  { name: "dq_driver_name", page: 0, x: 180, y: 720, width: 250, height: 14, type: "text" },
  { name: "dq_hire_date", page: 0, x: 120, y: 700, width: 80, height: 14, type: "text" },
  { name: "dq_complete_date", page: 0, x: 320, y: 700, width: 80, height: 14, type: "text" },
  { name: "dq_address", page: 0, x: 100, y: 680, width: 400, height: 14, type: "text" },
  { name: "dq_phone", page: 0, x: 90, y: 660, width: 120, height: 14, type: "text" },

  // PAGE 2: Applicant Information
  { name: "app_date", page: 1, x: 480, y: 700, width: 90, height: 14, type: "text" },
  { name: "position_contract", page: 1, x: 200, y: 680, width: 12, height: 12, type: "checkbox" },
  { name: "position_contractor", page: 1, x: 320, y: 680, width: 12, height: 12, type: "checkbox" },
  { name: "applicant_name", page: 1, x: 100, y: 650, width: 280, height: 14, type: "text" },
  { name: "phone", page: 1, x: 400, y: 650, width: 120, height: 14, type: "text" },
  { name: "emergency_phone", page: 1, x: 400, y: 630, width: 120, height: 14, type: "text" },
  { name: "age", page: 1, x: 100, y: 610, width: 50, height: 14, type: "text" },
  { name: "dob", page: 1, x: 200, y: 610, width: 100, height: 14, type: "text" },
  { name: "ssn", page: 1, x: 400, y: 610, width: 120, height: 14, type: "text" },
  { name: "physical_exam_exp", page: 1, x: 250, y: 580, width: 100, height: 14, type: "text" },
  
  // Addresses
  { name: "address1", page: 1, x: 72, y: 540, width: 300, height: 14, type: "text" },
  { name: "address1_from", page: 1, x: 400, y: 540, width: 60, height: 14, type: "text" },
  { name: "address1_to", page: 1, x: 480, y: 540, width: 60, height: 14, type: "text" },
  { name: "address2", page: 1, x: 72, y: 520, width: 300, height: 14, type: "text" },
  { name: "address2_from", page: 1, x: 400, y: 520, width: 60, height: 14, type: "text" },
  { name: "address2_to", page: 1, x: 480, y: 520, width: 60, height: 14, type: "text" },
  { name: "address3", page: 1, x: 72, y: 500, width: 300, height: 14, type: "text" },
  { name: "address3_from", page: 1, x: 400, y: 500, width: 60, height: 14, type: "text" },
  { name: "address3_to", page: 1, x: 480, y: 500, width: 60, height: 14, type: "text" },
  
  // Worked before
  { name: "worked_before_yes", page: 1, x: 280, y: 470, width: 12, height: 12, type: "checkbox" },
  { name: "worked_before_no", page: 1, x: 340, y: 470, width: 12, height: 12, type: "checkbox" },
  { name: "worked_dates_from", page: 1, x: 200, y: 450, width: 60, height: 14, type: "text" },
  { name: "worked_dates_to", page: 1, x: 280, y: 450, width: 60, height: 14, type: "text" },
  { name: "worked_reason", page: 1, x: 200, y: 430, width: 340, height: 14, type: "text" },
  
  // Education
  { name: "edu_grade", page: 1, x: 200, y: 400, width: 30, height: 14, type: "text" },
  { name: "edu_college", page: 1, x: 320, y: 400, width: 30, height: 14, type: "text" },
  { name: "edu_postgrad", page: 1, x: 440, y: 400, width: 30, height: 14, type: "text" },

  // PAGE 3: Employment History - Employer 1
  { name: "emp1_from", page: 2, x: 72, y: 720, width: 50, height: 14, type: "text" },
  { name: "emp1_to", page: 2, x: 140, y: 720, width: 50, height: 14, type: "text" },
  { name: "emp1_name", page: 2, x: 220, y: 720, width: 300, height: 14, type: "text" },
  { name: "emp1_position", page: 2, x: 72, y: 700, width: 150, height: 14, type: "text" },
  { name: "emp1_address", page: 2, x: 250, y: 700, width: 270, height: 14, type: "text" },
  { name: "emp1_reason", page: 2, x: 72, y: 680, width: 200, height: 14, type: "text" },
  { name: "emp1_phone", page: 2, x: 350, y: 680, width: 120, height: 14, type: "text" },
  { name: "emp1_fmcsr_yes", page: 2, x: 420, y: 660, width: 12, height: 12, type: "checkbox" },
  { name: "emp1_fmcsr_no", page: 2, x: 480, y: 660, width: 12, height: 12, type: "checkbox" },
  { name: "emp1_drug_yes", page: 2, x: 420, y: 640, width: 12, height: 12, type: "checkbox" },
  { name: "emp1_drug_no", page: 2, x: 480, y: 640, width: 12, height: 12, type: "checkbox" },

  // Employer 2
  { name: "emp2_from", page: 2, x: 72, y: 600, width: 50, height: 14, type: "text" },
  { name: "emp2_to", page: 2, x: 140, y: 600, width: 50, height: 14, type: "text" },
  { name: "emp2_name", page: 2, x: 220, y: 600, width: 300, height: 14, type: "text" },
  { name: "emp2_position", page: 2, x: 72, y: 580, width: 150, height: 14, type: "text" },
  { name: "emp2_address", page: 2, x: 250, y: 580, width: 270, height: 14, type: "text" },
  { name: "emp2_reason", page: 2, x: 72, y: 560, width: 200, height: 14, type: "text" },
  { name: "emp2_phone", page: 2, x: 350, y: 560, width: 120, height: 14, type: "text" },
  { name: "emp2_fmcsr_yes", page: 2, x: 420, y: 540, width: 12, height: 12, type: "checkbox" },
  { name: "emp2_fmcsr_no", page: 2, x: 480, y: 540, width: 12, height: 12, type: "checkbox" },
  { name: "emp2_drug_yes", page: 2, x: 420, y: 520, width: 12, height: 12, type: "checkbox" },
  { name: "emp2_drug_no", page: 2, x: 480, y: 520, width: 12, height: 12, type: "checkbox" },

  // Employer 3
  { name: "emp3_from", page: 2, x: 72, y: 480, width: 50, height: 14, type: "text" },
  { name: "emp3_to", page: 2, x: 140, y: 480, width: 50, height: 14, type: "text" },
  { name: "emp3_name", page: 2, x: 220, y: 480, width: 300, height: 14, type: "text" },
  { name: "emp3_position", page: 2, x: 72, y: 460, width: 150, height: 14, type: "text" },
  { name: "emp3_address", page: 2, x: 250, y: 460, width: 270, height: 14, type: "text" },
  { name: "emp3_reason", page: 2, x: 72, y: 440, width: 200, height: 14, type: "text" },
  { name: "emp3_phone", page: 2, x: 350, y: 440, width: 120, height: 14, type: "text" },

  // PAGE 4: Accidents, Traffic, CDL, Experience
  // Accident 1
  { name: "acc1_date", page: 3, x: 72, y: 700, width: 80, height: 14, type: "text" },
  { name: "acc1_details", page: 3, x: 160, y: 700, width: 200, height: 14, type: "text" },
  { name: "acc1_fatalities", page: 3, x: 370, y: 700, width: 50, height: 14, type: "text" },
  { name: "acc1_injuries", page: 3, x: 430, y: 700, width: 50, height: 14, type: "text" },
  // Accident 2
  { name: "acc2_date", page: 3, x: 72, y: 680, width: 80, height: 14, type: "text" },
  { name: "acc2_details", page: 3, x: 160, y: 680, width: 200, height: 14, type: "text" },
  { name: "acc2_fatalities", page: 3, x: 370, y: 680, width: 50, height: 14, type: "text" },
  { name: "acc2_injuries", page: 3, x: 430, y: 680, width: 50, height: 14, type: "text" },

  // Traffic 1
  { name: "traffic1_location", page: 3, x: 72, y: 620, width: 100, height: 14, type: "text" },
  { name: "traffic1_date", page: 3, x: 180, y: 620, width: 70, height: 14, type: "text" },
  { name: "traffic1_charge", page: 3, x: 260, y: 620, width: 150, height: 14, type: "text" },
  { name: "traffic1_penalty", page: 3, x: 420, y: 620, width: 100, height: 14, type: "text" },
  // Traffic 2
  { name: "traffic2_location", page: 3, x: 72, y: 600, width: 100, height: 14, type: "text" },
  { name: "traffic2_date", page: 3, x: 180, y: 600, width: 70, height: 14, type: "text" },
  { name: "traffic2_charge", page: 3, x: 260, y: 600, width: 150, height: 14, type: "text" },
  { name: "traffic2_penalty", page: 3, x: 420, y: 600, width: 100, height: 14, type: "text" },

  // License
  { name: "license_number", page: 3, x: 72, y: 540, width: 120, height: 14, type: "text" },
  { name: "license_state", page: 3, x: 200, y: 540, width: 50, height: 14, type: "text" },
  { name: "license_type", page: 3, x: 260, y: 540, width: 150, height: 14, type: "text" },
  { name: "license_exp", page: 3, x: 420, y: 540, width: 100, height: 14, type: "text" },

  // A, B, C Questions
  { name: "denied_yes", page: 3, x: 480, y: 490, width: 12, height: 12, type: "checkbox" },
  { name: "denied_no", page: 3, x: 520, y: 490, width: 12, height: 12, type: "checkbox" },
  { name: "suspended_yes", page: 3, x: 480, y: 470, width: 12, height: 12, type: "checkbox" },
  { name: "suspended_no", page: 3, x: 520, y: 470, width: 12, height: 12, type: "checkbox" },
  { name: "felony_yes", page: 3, x: 480, y: 450, width: 12, height: 12, type: "checkbox" },
  { name: "felony_no", page: 3, x: 520, y: 450, width: 12, height: 12, type: "checkbox" },
  { name: "abc_explain", page: 3, x: 72, y: 420, width: 450, height: 28, type: "text" },

  // Driving Experience
  { name: "exp_straight_type", page: 3, x: 150, y: 370, width: 80, height: 14, type: "text" },
  { name: "exp_straight_from", page: 3, x: 240, y: 370, width: 60, height: 14, type: "text" },
  { name: "exp_straight_to", page: 3, x: 310, y: 370, width: 60, height: 14, type: "text" },
  { name: "exp_straight_miles", page: 3, x: 380, y: 370, width: 80, height: 14, type: "text" },

  { name: "exp_semi_type", page: 3, x: 150, y: 350, width: 80, height: 14, type: "text" },
  { name: "exp_semi_from", page: 3, x: 240, y: 350, width: 60, height: 14, type: "text" },
  { name: "exp_semi_to", page: 3, x: 310, y: 350, width: 60, height: 14, type: "text" },
  { name: "exp_semi_miles", page: 3, x: 380, y: 350, width: 80, height: 14, type: "text" },

  { name: "exp_double_type", page: 3, x: 150, y: 330, width: 80, height: 14, type: "text" },
  { name: "exp_double_from", page: 3, x: 240, y: 330, width: 60, height: 14, type: "text" },
  { name: "exp_double_to", page: 3, x: 310, y: 330, width: 60, height: 14, type: "text" },
  { name: "exp_double_miles", page: 3, x: 380, y: 330, width: 80, height: 14, type: "text" },

  { name: "exp_other_class", page: 3, x: 72, y: 310, width: 70, height: 14, type: "text" },
  { name: "exp_other_type", page: 3, x: 150, y: 310, width: 80, height: 14, type: "text" },
  { name: "exp_other_from", page: 3, x: 240, y: 310, width: 60, height: 14, type: "text" },
  { name: "exp_other_to", page: 3, x: 310, y: 310, width: 60, height: 14, type: "text" },
  { name: "exp_other_miles", page: 3, x: 380, y: 310, width: 80, height: 14, type: "text" },

  // PAGE 5: States, Training, Awards
  { name: "states_operated", page: 4, x: 72, y: 720, width: 450, height: 14, type: "text" },
  { name: "special_courses", page: 4, x: 72, y: 680, width: 450, height: 28, type: "text" },
  { name: "safe_awards", page: 4, x: 72, y: 630, width: 450, height: 28, type: "text" },
  { name: "other_courses", page: 4, x: 72, y: 580, width: 450, height: 28, type: "text" },
  { name: "special_equipment", page: 4, x: 72, y: 530, width: 450, height: 28, type: "text" },

  // Signature pages - add signature fields
  { name: "applicant_signature", page: 5, x: 72, y: 200, width: 250, height: 20, type: "text" },
  { name: "applicant_sign_date", page: 5, x: 400, y: 200, width: 100, height: 14, type: "text" },

  // PSP Authorization (typically page 21-22)
  { name: "psp_date", page: 21, x: 72, y: 250, width: 100, height: 14, type: "text" },
  { name: "psp_signature", page: 21, x: 72, y: 220, width: 250, height: 20, type: "text" },
  { name: "psp_name", page: 21, x: 72, y: 190, width: 200, height: 14, type: "text" },

  // Road Test (page 22-23)
  { name: "road_driver_name", page: 22, x: 180, y: 720, width: 200, height: 14, type: "text" },
  { name: "road_phone", page: 22, x: 450, y: 720, width: 100, height: 14, type: "text" },
  { name: "road_address", page: 22, x: 150, y: 700, width: 350, height: 14, type: "text" },
  { name: "road_city", page: 22, x: 100, y: 680, width: 150, height: 14, type: "text" },
  { name: "road_state", page: 22, x: 270, y: 680, width: 50, height: 14, type: "text" },
  { name: "road_zip", page: 22, x: 340, y: 680, width: 80, height: 14, type: "text" },
  { name: "road_equipment", page: 22, x: 220, y: 400, width: 280, height: 14, type: "text" },
  { name: "road_date", page: 22, x: 72, y: 370, width: 100, height: 14, type: "text" },
  { name: "road_examiner", page: 22, x: 300, y: 370, width: 200, height: 20, type: "text" },

  // Internal Process (page 24)
  { name: "review_date", page: 24, x: 150, y: 700, width: 100, height: 14, type: "text" },
  { name: "hired", page: 24, x: 150, y: 680, width: 100, height: 14, type: "text" },
  { name: "rejected", page: 24, x: 320, y: 680, width: 100, height: 14, type: "text" },
  { name: "reject_reasons", page: 24, x: 72, y: 640, width: 450, height: 40, type: "text" },
  { name: "employ_date", page: 24, x: 150, y: 590, width: 100, height: 14, type: "text" },
  { name: "department", page: 24, x: 150, y: 570, width: 150, height: 14, type: "text" },
  { name: "classification", page: 24, x: 380, y: 570, width: 140, height: 14, type: "text" },
]

export default function CreateFillablePDFPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFillablePDF = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Load the original PDF
      const pdfUrl = "/templates/thind-transport-application-template.pdf"
      const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)

      // Get the form (create if doesn't exist)
      const form = pdfDoc.getForm()
      const pages = pdfDoc.getPages()

      // Add form fields
      for (const fieldDef of FORM_FIELDS) {
        // Skip if page doesn't exist
        if (fieldDef.page >= pages.length) continue

        const page = pages[fieldDef.page]

        try {
          if (fieldDef.type === "checkbox") {
            const checkbox = form.createCheckBox(fieldDef.name)
            checkbox.addToPage(page, {
              x: fieldDef.x,
              y: fieldDef.y,
              width: fieldDef.width,
              height: fieldDef.height,
            })
          } else {
            const textField = form.createTextField(fieldDef.name)
            textField.addToPage(page, {
              x: fieldDef.x,
              y: fieldDef.y,
              width: fieldDef.width,
              height: fieldDef.height,
              borderWidth: 0,
              backgroundColor: rgb(1, 1, 0.9), // Light yellow for visibility
            })
            textField.setFontSize(10)
          }
        } catch (e) {
          // Field might already exist, skip
          console.warn(`Could not add field ${fieldDef.name}:`, e)
        }
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save()

      // Download - handle TypeScript strict ArrayBuffer typing
      const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer
      const blob = new Blob([arrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Thind_Transport_Application_FILLABLE.pdf"
      a.click()
      URL.revokeObjectURL(url)

      setIsComplete(true)
    } catch (err: any) {
      console.error("Error creating fillable PDF:", err)
      setError(err.message || "Failed to create fillable PDF")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-white">Create Fillable PDF</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10" />
              <div>
                <h2 className="text-xl font-bold">Convert to Fillable PDF</h2>
                <p className="text-white/80 text-sm">Add editable form fields to your PDF</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!isComplete ? (
              <>
                <p className="text-gray-700">
                  This tool will take your Thind Transport Application PDF and add 
                  <strong> editable form fields</strong> to it. The resulting PDF can be:
                </p>

                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Filled out directly in Adobe Reader, Chrome, or any PDF viewer</li>
                  <li>Saved with the entered data</li>
                  <li>Emailed back to you</li>
                  <li>Printed when complete</li>
                </ul>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> Form fields will be added at estimated positions. 
                    You may need to adjust the field positions in a PDF editor like Adobe Acrobat 
                    for perfect alignment.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={createFillablePDF}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Creating Fillable PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        Create & Download Fillable PDF
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Fillable PDF Created!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your PDF has been downloaded. Open it in any PDF viewer to fill out the form fields.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setIsComplete(false)} variant="outline">
                    Create Another
                  </Button>
                  <Link href="/driver/admin/field-mapper">
                    <Button className="bg-orange hover:bg-orange/90">
                      Go to Field Mapper
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/driver/admin/field-mapper" className="text-orange hover:underline">
            ← Back to Field Mapper
          </Link>
        </div>
      </div>
    </div>
  )
}

