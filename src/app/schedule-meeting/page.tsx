"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, CheckCircle2, Phone, Video } from "lucide-react"
import { toast } from "sonner"

export default function ScheduleMeetingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    meetingType: "phone",
    notes: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to schedule meeting")
      }

      setIsSubmitted(true)
      toast.success("Meeting request sent! We'll confirm shortly.")
    } catch (error) {
      toast.error("Failed to schedule meeting. Please call us instead.")
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy-600 to-navy-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Meeting Request Received!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in joining Thind Transport. We'll review your request and
              send you a confirmation email within 24 hours.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <p className="text-sm text-blue-900">
                <strong>What's Next?</strong><br />
                After our meeting, you'll receive a secure link to complete your full DOT driver application.
              </p>
            </div>
            <Button onClick={() => window.location.href = "/"} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-600 to-navy-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="h-6 w-6 text-orange" />
              Schedule Your Meeting
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Book a call with our owner to discuss opportunities at Thind Transport.
              This is a required step before completing your full DOT application.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Preferred Date *</Label>
                  <Input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preferred Time *</Label>
                  <select
                    required
                    className="w-full border rounded-md p-2"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  >
                    <option value="">Select time...</option>
                    <option value="9:00 AM">9:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="1:00 PM">1:00 PM</option>
                    <option value="2:00 PM">2:00 PM</option>
                    <option value="3:00 PM">3:00 PM</option>
                    <option value="4:00 PM">4:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Meeting Type *</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 ${
                      formData.meetingType === "phone"
                        ? "border-orange bg-orange/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, meetingType: "phone" })}
                  >
                    <Phone className="h-5 w-5" />
                    <span>Phone Call</span>
                  </button>
                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 ${
                      formData.meetingType === "video"
                        ? "border-orange bg-orange/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, meetingType: "video" })}
                  >
                    <Video className="h-5 w-5" />
                    <span>Video Call</span>
                  </button>
                </div>
              </div>

              <div>
                <Label>Additional Notes (Optional)</Label>
                <textarea
                  className="w-full border rounded-md p-2 min-h-[100px]"
                  placeholder="Any specific questions or topics you'd like to discuss?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-900">
                    <strong>Meeting Duration:</strong> Approximately 15-20 minutes<br />
                    <strong>Time Zone:</strong> Pacific Time (PST/PDT)
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Request Meeting
              </Button>

              <p className="text-sm text-center text-gray-500">
                Need immediate assistance? Call us at <strong>(206) 765-6300</strong>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

