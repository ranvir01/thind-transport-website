"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle2,
  FileText,
  LogOut,
  Phone,
  Mail,
  Clock,
  ClipboardList,
  UserCheck,
  ArrowRight,
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

interface ApplicationSummary {
  id: string
  status: "submitted" | "under_review" | "approved" | "needs_info"
  submittedAt: string
  hasPdf: boolean
}

interface DriverProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt?: string
  applicationCompleted: boolean
  application: ApplicationSummary | null
}

const STATUS_LABELS: Record<ApplicationSummary["status"], { label: string; note: string }> = {
  submitted: {
    label: "Submitted — In Review Queue",
    note: "We received your DOT application. Our team reviews applications within 2-3 business days.",
  },
  under_review: {
    label: "Under Review",
    note: "Our compliance team is reviewing your application. We may call to verify details.",
  },
  approved: {
    label: "Approved",
    note: "Congratulations! Our team will contact you to schedule orientation.",
  },
  needs_info: {
    label: "More Info Needed",
    note: "We need a few more details — check your email or give us a call.",
  },
}

export default function DriverDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [driverData, setDriverData] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDriverData = useCallback(async () => {
    try {
      const response = await fetch("/api/driver/profile")
      if (response.ok) {
        const data = await response.json()
        setDriverData(data)
      }
    } catch (error) {
      console.error("Failed to fetch driver data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/driver/login")
      return
    }
    if (status === "authenticated") {
      fetchDriverData()
    }
  }, [status, router, fetchDriverData])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    )
  }

  const application = driverData?.application
  const submitted = Boolean(application) || Boolean(driverData?.applicationCompleted)
  const statusInfo = application ? STATUS_LABELS[application.status] : null

  // Onboarding journey steps for the timeline
  const journey = [
    { label: "Account created", done: true, icon: UserCheck },
    { label: "DOT application submitted", done: submitted, icon: ClipboardList },
    { label: "Review by our team", done: application?.status === "approved", active: submitted, icon: Clock },
    { label: "Orientation & first load", done: false, icon: CheckCircle2 },
  ]

  return (
    <div className="portal-light min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-navy">Driver Portal</h1>
            <p className="text-gray-600">
              Welcome back, {driverData?.firstName || session?.user?.name || "Driver"}!
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/driver/login" })}
            className="self-start sm:self-auto bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Application Status Card */}
          <Card variant="light" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-600" />
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-fleet">
                    <p className="text-green-900 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {statusInfo?.label || "Submitted — In Review Queue"}
                    </p>
                    <p className="text-sm text-green-800 mt-1">
                      {statusInfo?.note ||
                        "Your DOT application has been received and is being reviewed by our team."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                    <p>
                      <strong>Submitted:</strong>{" "}
                      {application?.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recently"}
                    </p>
                    <p>
                      <strong>Reference:</strong>{" "}
                      <span className="font-mono text-xs">{application?.id?.slice(0, 18) || "—"}</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Questions about your application? Call us at{" "}
                    <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-orange-600 font-semibold hover:underline">
                      {COMPANY_INFO.phone}
                    </a>{" "}
                    — a real person answers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-fleet">
                    <p className="text-amber-900 font-semibold">Application Not Started</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Complete your official DOT driver application online. It auto-saves as you go,
                      and we turn it into the signed PDF our team needs — no printing required.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/driver/application")}
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold w-full sm:w-auto"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Start DOT Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Onboarding Journey */}
          <Card variant="light">
            <CardHeader>
              <CardTitle className="text-lg">Your Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {journey.map((step) => {
                  const Icon = step.icon
                  return (
                    <li key={step.label} className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done
                            ? "bg-green-100 text-green-600"
                            : step.active
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="pt-1">
                        <p
                          className={`text-sm font-medium ${
                            step.done ? "text-gray-900" : step.active ? "text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="light">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Name:</strong>{" "}
                  {driverData ? `${driverData.firstName} ${driverData.lastName}` : session?.user?.name}
                </p>
                <p>
                  <strong>Email:</strong> {driverData?.email || session?.user?.email}
                </p>
                <p>
                  <strong>Phone:</strong> {driverData?.phone || "Not provided"}
                </p>
                {driverData?.createdAt && (
                  <p>
                    <strong>Member since:</strong>{" "}
                    {new Date(driverData.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="light">
            <CardHeader>
              <CardTitle className="text-lg">DOT Application</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {submitted
                  ? "Need to update something on your application? Call us and we'll walk through it together."
                  : "Fill it out online — your progress saves automatically."}
              </p>
              <Button
                variant="outline"
                className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => router.push("/driver/application")}
              >
                <FileText className="mr-2 h-4 w-4" />
                {submitted ? "View Application" : "Continue Application"}
              </Button>
            </CardContent>
          </Card>

          <Card variant="light">
            <CardHeader>
              <CardTitle className="text-lg">Talk to Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Dispatch and recruiting answer the phone — days, nights, and weekends.
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900" asChild>
                  <a href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call {COMPANY_INFO.phone}
                  </a>
                </Button>
                <Button variant="outline" className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900" asChild>
                  <a href={`mailto:${COMPANY_INFO.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email Us
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Info */}
        <Card variant="light" className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-600">
              <p className="font-semibold mb-2">Thind Transport LLC</p>
              <p>
                USDOT #{COMPANY_INFO.dot} | MC-{COMPANY_INFO.mc}
              </p>
              <p className="mt-2">
                Questions? Email us at{" "}
                <Link href={`mailto:${COMPANY_INFO.email}`} className="text-orange-600 hover:underline">
                  {COMPANY_INFO.email}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
