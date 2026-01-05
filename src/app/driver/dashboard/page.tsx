"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, FileText, Calendar, LogOut, User } from "lucide-react"

export default function DriverDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [driverData, setDriverData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/driver/login"
      return
    }

    if (status === "authenticated") {
      fetchDriverData()
    }
  }, [status])

  const fetchDriverData = async () => {
    try {
      const response = await fetch("/api/driver/profile")
      const data = await response.json()
      setDriverData(data)
    } catch (error) {
      console.error("Failed to fetch driver data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-navy">Driver Portal</h1>
            <p className="text-gray-600">Welcome back, {session?.user?.name || "Driver"}!</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/api/auth/signout")}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Application Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Application Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driverData?.applicationCompleted ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-900 font-semibold">✓ Application Submitted</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your DOT application has been received and is under review by our compliance team.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Submitted:</strong> {driverData.applicationSubmittedAt ? new Date(driverData.applicationSubmittedAt).toLocaleDateString() : "Recently"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>What's Next:</strong> Our team will review your application and contact you within 2-3 business days.
                  We may reach out for additional documentation or to schedule orientation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-900 font-semibold">Application Incomplete</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Please complete your DOT driver application to continue the onboarding process.
                  </p>
                </div>
                <Button onClick={() => router.push("/driver/application")} size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  Complete Application
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {session?.user?.email}</p>
                <p><strong>Phone:</strong> {driverData?.phone || "Not provided"}</p>
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                View and manage your submitted documents.
              </p>
              <Button variant="outline" className="w-full" size="sm" disabled>
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Need help? Contact our team.
              </p>
              <Button variant="outline" className="w-full" size="sm" onClick={() => window.location.href = "tel:+12067656300"}>
                <Calendar className="mr-2 h-4 w-4" />
                Call (206) 765-6300
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Company Info */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-600">
              <p className="font-semibold mb-2">Thind Transport LLC</p>
              <p>USDOT #4052236 | MC #1472882</p>
              <p className="mt-2">Questions? Email us at <a href="mailto:thindcarrier@gmail.com" className="text-orange hover:underline">thindcarrier@gmail.com</a></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

