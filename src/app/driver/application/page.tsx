"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, User, RotateCcw, FileText, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { PDFFormOverlay } from "@/components/driver-application/PDFFormOverlay"
import Link from "next/link"

const STORAGE_KEY = "thind_pdf_overlay_form"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  // Check if user has started the form before
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_${session.user.email}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.formData && Object.keys(parsed.formData).length > 0) {
            setShowIntro(false) // Skip intro if they have saved data
          }
        }
      } catch (e) {
        console.error("Error checking saved data:", e)
      }
      setIsLoaded(true)
    }
  }, [status, session?.user?.email])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleResetApplication = () => {
    if (confirm("Are you sure you want to reset your application? All your progress will be lost.")) {
      if (session?.user?.email) {
        localStorage.removeItem(`${STORAGE_KEY}_${session.user.email}`)
        toast.success("Application reset. You can start fresh.")
        setShowIntro(true)
      }
    }
  }

  const handleStartForm = () => {
    setShowIntro(false)
  }

  const handleSave = (data: Record<string, string>) => {
    // Auto-save is handled by the component, this is just for feedback
    console.log("Form data saved:", Object.keys(data).length, "fields")
  }

  const handleSubmit = async (data: Record<string, string>) => {
    if (!session?.user?.email) {
      toast.error("Please log in to submit your application")
      return
    }

    try {
      const response = await fetch("/api/driver/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          formData: data,
          submittedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit application")
      }

      toast.success("Application submitted successfully! We'll review it within 1-2 weeks.")
      
      // Clear saved data
      localStorage.removeItem(`${STORAGE_KEY}_${session.user.email}`)
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/driver/dashboard"
      }, 3000)
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application")
    }
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

  // Introduction/Welcome screen
  if (showIntro) {
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
                Complete your official DOT driver application directly on the form. 
                Your progress is automatically saved as you fill each field.
              </p>
            </div>

            {/* Instructions */}
            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-orange">1</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Fill Directly on PDF</h3>
                  <p className="text-sm text-gray-600">
                    You'll see the actual DOT form with input fields positioned exactly where they need to be.
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-orange">2</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Auto-Save Progress</h3>
                  <p className="text-sm text-gray-600">
                    Your data is saved automatically. Come back anytime to continue where you left off.
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-orange">3</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Download & Submit</h3>
                  <p className="text-sm text-gray-600">
                    Download your completed PDF or submit directly through the portal.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">📋 What You'll Need:</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Social Security Number</li>
                  <li>CDL License information</li>
                  <li>Employment history (last 3 years + 10 years commercial driving)</li>
                  <li>Addresses for the past 3 years</li>
                  <li>Accident and violation records (past 3 years)</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  className="bg-orange hover:bg-orange/90 text-white font-semibold px-8"
                  onClick={handleStartForm}
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main form view with PDF overlay
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-navy shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIntro(true)}
              className="text-white hover:text-orange transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-white">DOT Application Form</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetApplication}
              className="text-white/70 hover:text-white hover:bg-white/10"
              title="Reset Application"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
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

      {/* Main Content - PDF Form Overlay */}
      <main className="flex-1 pt-16">
        <PDFFormOverlay
          onSave={handleSave}
          onSubmit={handleSubmit}
          userEmail={session?.user?.email || undefined}
        />
      </main>
    </div>
  )
}
