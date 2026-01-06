"use client"

import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  AlertCircle, 
  Edit, 
  Download, 
  Loader2,
  User,
  MapPin,
  Briefcase,
  Car,
  Shield,
  GraduationCap,
  Award,
  FileText
} from "lucide-react"
import type { DriverApplicationFormData } from "@/types/driver-application-form"

interface ReviewStepProps {
  data: DriverApplicationFormData
  onEditStep: (step: number) => void
  onGeneratePDF: () => void
  onSubmit: () => void
  isGenerating: boolean
  isSubmitting: boolean
  generatedPdfUrl: string | null
}

export function ReviewStep({ 
  data, 
  onEditStep, 
  onGeneratePDF, 
  onSubmit,
  isGenerating,
  isSubmitting,
  generatedPdfUrl 
}: ReviewStepProps) {

  const sections = [
    {
      id: 1,
      title: "Personal Information",
      icon: User,
      complete: !!(data.personal?.applicant_name && data.personal?.email),
      summary: data.personal?.applicant_name || "Not provided"
    },
    {
      id: 2,
      title: "Address History",
      icon: MapPin,
      complete: !!data.address?.addr1_street,
      summary: data.address?.addr1_street || "Not provided"
    },
    {
      id: 3,
      title: "Employment History",
      icon: Briefcase,
      complete: (data.employment?.employers?.length || 0) > 0,
      summary: `${data.employment?.employers?.length || 0} employer(s) listed`
    },
    {
      id: 4,
      title: "Accidents & Violations",
      icon: Shield,
      complete: !!(data.accidents?.no_accidents || (data.accidents?.accidents?.length || 0) > 0),
      summary: data.accidents?.no_accidents 
        ? "No accidents reported" 
        : `${data.accidents?.accidents?.length || 0} accident(s) listed`
    },
    {
      id: 5,
      title: "CDL Information",
      icon: Car,
      complete: (data.cdl?.licenses?.length || 0) > 0,
      summary: `${data.cdl?.licenses?.length || 0} license(s) listed`
    },
    {
      id: 6,
      title: "Driving Experience",
      icon: GraduationCap,
      complete: true, // Optional section
      summary: data.experience?.states_operated 
        ? `States: ${data.experience.states_operated.substring(0, 30)}...` 
        : "No experience listed"
    },
    {
      id: 7,
      title: "Training & Skills",
      icon: Award,
      complete: true, // Optional section
      summary: `${data.training?.training?.length || 0} training item(s)`
    },
    {
      id: 8,
      title: "Certification",
      icon: FileText,
      complete: !!data.certification?.main_signature,
      summary: data.certification?.main_signature 
        ? `Signed by: ${data.certification.main_signature}` 
        : "Not signed"
    },
  ]

  const allComplete = sections.every(s => s.complete)

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Review & Submit</h2>
        <p className="text-orange-100 text-sm mt-1">
          Review your application before generating the PDF and submitting.
        </p>
      </div>

      {/* Completion Status */}
      <div className={`p-4 rounded-lg border-2 ${
        allComplete 
          ? 'bg-green-50 border-green-300' 
          : 'bg-yellow-50 border-yellow-300'
      }`}>
        <div className="flex items-center gap-3">
          {allComplete ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="font-semibold text-green-800">Application Complete!</h3>
                <p className="text-sm text-green-700">All required sections have been filled out.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-yellow-800">Application Incomplete</h3>
                <p className="text-sm text-yellow-700">Please complete all required sections before submitting.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section Summary Cards */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div 
              key={section.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                section.complete 
                  ? 'bg-white border-gray-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  section.complete ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    section.complete ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{section.title}</h4>
                  <p className="text-sm text-gray-500">{section.summary}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {section.complete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(section.id)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-center">Ready to Submit?</h3>
        
        {!generatedPdfUrl ? (
          <>
            <p className="text-sm text-gray-600 text-center">
              First, generate your filled application PDF for review.
            </p>
            <Button
              onClick={onGeneratePDF}
              disabled={isGenerating || !allComplete}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Generate Application PDF
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-800">PDF Generated Successfully!</p>
              <p className="text-sm text-green-600 mt-1">
                Please download and review your application before submitting.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <a
                href={generatedPdfUrl}
                download="Thind_Transport_Application.pdf"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </a>
              
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="py-3 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By submitting, your application will be sent to Thind Transport HR for review.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

