"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, User, ArrowLeft, FileText, Download, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import Script from "next/script"

// SimplePDF Configuration
// Get your free company identifier at: https://simplepdf.com
// Free tier includes: Unlimited users, PDFs, submissions, email notifications, webhooks
const SIMPLEPDF_COMPANY_ID = "thindtransport" // Replace with your actual company ID from SimplePDF

// The PDF template URL (hosted on your site)
const PDF_TEMPLATE_URL = "/templates/thind-transport-application-template.pdf"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      setIsLoaded(true)
    }
  }, [status])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleStartApplication = () => {
    setShowEditor(true)
  }

  // Show loading while session is loading
  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange mx-auto" />
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    if (typeof window !== 'undefined') {
      window.location.href = "/driver/login"
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    )
  }

  // Show the PDF editor
  if (showEditor) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* SimplePDF Script - enables PDF editing */}
        <Script
          src="https://unpkg.com/@simplepdf/web-embed-pdf"
          strategy="afterInteractive"
          data-company-identifier={SIMPLEPDF_COMPANY_ID}
        />

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="text-white hover:text-orange transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold text-white">DOT Application Form</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm hidden md:block">
                {session?.user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Embedded PDF Editor */}
        <main className="flex-1 pt-16 flex flex-col">
          {/* Instructions Banner */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-yellow-800 text-sm font-medium">
                  📝 Fill out all fields directly on the PDF below
                </p>
                <p className="text-yellow-700 text-xs">
                  When done: Download your completed PDF → Email to <strong>hr@thindtransport.com</strong>
                </p>
              </div>
              <a
                href="mailto:hr@thindtransport.com?subject=Driver Application Submission"
                className="inline-flex items-center gap-1 text-sm bg-orange text-white px-3 py-1.5 rounded hover:bg-orange/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Email HR
              </a>
            </div>
          </div>

          {/* PDF Embed Container */}
          <div className="flex-1 bg-gray-200">
            {/* SimplePDF will automatically convert this link to an interactive editor */}
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl text-center">
                <FileText className="h-16 w-16 text-orange mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Thind Transport DOT Application
                </h2>
                <p className="text-gray-600 mb-6">
                  Click the button below to open the interactive PDF editor. 
                  You can fill out all fields directly in your browser, then download the completed form.
                </p>
                
                {/* This link will be intercepted by SimplePDF and opened in their editor */}
                <a
                  href="/templates/thind-transport-application-template.pdf"
                  className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  Open PDF Editor
                </a>
                
                <p className="text-gray-500 text-sm mt-6">
                  The PDF will open in an interactive editor where you can:
                </p>
                <ul className="text-gray-500 text-sm mt-2 space-y-1">
                  <li>✓ Type text in any field</li>
                  <li>✓ Check boxes and select options</li>
                  <li>✓ Add your signature</li>
                  <li>✓ Download the completed PDF</li>
                </ul>
                
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                  <p className="text-green-800 text-sm font-medium mb-2">📧 After Completing:</p>
                  <p className="text-green-700 text-sm">
                    Email your completed PDF to{' '}
                    <a href="mailto:hr@thindtransport.com?subject=Driver Application Submission" className="font-semibold underline">
                      hr@thindtransport.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Alternative: Direct iframe embed for SimplePDF editor */}
              <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm mb-2">Or use the full-page editor:</p>
                <a
                  href={`https://simplepdf.com/editor?open=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/templates/thind-transport-application-template.pdf' : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-orange hover:text-orange/80 underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in SimplePDF Editor (New Tab)
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Introduction/Welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white hover:text-orange transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">Driver Application</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm hidden sm:block">
              <User className="h-4 w-4 inline mr-1" />
              {session?.user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero section */}
          <div className="bg-gradient-to-r from-navy to-navy/90 p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <FileText className="h-12 w-12 text-orange" />
              <div>
                <h2 className="text-2xl font-bold">DOT Commercial Driver Application</h2>
                <p className="text-white/80">Thind Transport LLC</p>
              </div>
            </div>
            <p className="text-white/90">
              Complete your official DOT driver application using our interactive PDF editor. 
              Fill out the form directly in your browser - no software needed!
            </p>
          </div>

          {/* Instructions */}
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">1</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Open the PDF</h3>
                <p className="text-sm text-gray-600">
                  Click "Start Application" to open the official DOT form in an interactive editor.
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">2</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Fill All Fields</h3>
                <p className="text-sm text-gray-600">
                  Type directly into fields, check boxes, and add your signature - all in your browser.
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">3</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Download & Email</h3>
                <p className="text-sm text-gray-600">
                  Download your completed PDF and email it to <strong>hr@thindtransport.com</strong>
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">📋 What You'll Need:</h4>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Social Security Number</li>
                <li>CDL License information (number, state, expiration)</li>
                <li>Employment history (last 3 years + 10 years commercial driving)</li>
                <li>Addresses for the past 3 years</li>
                <li>Accident and violation records (past 3 years)</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">🔒 Your Privacy:</h4>
              <p className="text-sm text-blue-700">
                The PDF editor runs entirely in your browser. Your data is never uploaded to any server 
                until you choose to download and submit your completed application.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-orange hover:bg-orange/90 text-white font-semibold px-8"
                onClick={handleStartApplication}
              >
                <FileText className="h-5 w-5 mr-2" />
                Start Application
              </Button>
              <Link href="/driver/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            {/* Alternative download option */}
            <div className="text-center pt-4 border-t">
              <p className="text-gray-500 text-sm mb-2">
                Prefer to fill it out offline? Download the blank PDF:
              </p>
              <a
                href="/templates/thind-transport-application-template.pdf"
                download="Thind_Transport_DOT_Application.pdf"
                className="inline-flex items-center gap-2 text-orange hover:text-orange/80"
              >
                <Download className="h-4 w-4" />
                Download Blank Application (PDF)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
