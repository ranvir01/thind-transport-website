"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, CheckCircle2, Phone, Video } from "lucide-react"
import { toast } from "sonner"
import { HONEYPOT_FIELD, readHoneypotValue } from "@/lib/honeypot"
import { HoneypotField } from "@/components/shared/HoneypotField"

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
        body: JSON.stringify({ ...formData, [HONEYPOT_FIELD]: readHoneypotValue() }),
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
        <Card variant="light" className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Meeting Request Received!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in joining Thind Transport. We'll review your request and
              send you a confirmation email within 24 hours on business days.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6 text-left">
              <p className="text-sm text-slate-700">
                <strong className="text-gray-900">What&apos;s next?</strong><br />
                After our meeting, you&apos;ll receive a secure link to complete your full DOT driver application.
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
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Thind Transport</p>
          <p className="mt-1 text-white/70">One quick call with the owner before your DOT application.</p>
        </div>
        <Card variant="light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-gray-900">
              <Calendar className="h-6 w-6 text-orange-600" />
              Schedule your meeting
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Book a call with our owner to discuss opportunities at Thind Transport.
              This is a required step before completing your full DOT application.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="relative space-y-6">
              <HoneypotField />
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
                    className="mt-1.5 h-11 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-sm text-neutral-900 shadow-sm transition-colors focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25"
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
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 font-semibold transition-colors ${
                      formData.meetingType === "phone"
                        ? "border-orange-600 bg-orange-600/10 text-orange-700"
                        : "border-neutral-200 text-gray-700 hover:border-neutral-300"
                    }`}
                    onClick={() => setFormData({ ...formData, meetingType: "phone" })}
                  >
                    <Phone className="h-5 w-5" />
                    <span>Phone Call</span>
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 font-semibold transition-colors ${
                      formData.meetingType === "video"
                        ? "border-orange-600 bg-orange-600/10 text-orange-700"
                        : "border-neutral-200 text-gray-700 hover:border-neutral-300"
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
                  className="mt-1.5 min-h-[100px] w-full rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25"
                  placeholder="Any specific questions or topics you'd like to discuss?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-2">
                  <Clock className="h-5 w-5 flex-shrink-0 text-orange-600" />
                  <p className="text-sm text-slate-700">
                    <strong className="text-gray-900">Meeting duration:</strong> approximately 15&ndash;20 minutes<br />
                    <strong className="text-gray-900">Time zone:</strong> Pacific Time (PST/PDT)
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

