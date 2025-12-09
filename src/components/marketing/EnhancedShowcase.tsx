"use client"

import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { TestimonialsCarousel } from "@/components/shared/TestimonialsCarousel"
import { PayRatesTabs } from "@/components/features/PayRatesTabs"
import { JobDetailsDialog } from "@/components/features/JobDetailsDialog"
import { AnnouncementAlert } from "@/components/shared/AnnouncementAlert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import Link from "next/link"

export function EnhancedShowcase() {
  const [showAlert, setShowAlert] = useState(true)

  return (
    <div className="w-full space-y-12">
      {/* Alert Section */}
      {showAlert && (
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Urgent Announcement</h2>
            <p className="text-gray-600">Stay informed about limited opportunities</p>
          </div>
          <AnnouncementAlert onClose={() => setShowAlert(false)} />
        </section>
      )}

      {/* Job Details Dialog Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Position Details</h2>
          <p className="text-gray-600">Click to view comprehensive job information</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                CDL Class A Company Driver
                <Badge>Full-Time</Badge>
              </CardTitle>
              <CardDescription>
                Competitive pay, excellent benefits, and flexible routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Annual Salary</span>
                  <span className="font-semibold">$50K-$78K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Home Time</span>
                  <span className="font-semibold">Flexible</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Start Date</span>
                  <span className="font-semibold">Immediate</span>
                </div>
              </div>
              <JobDetailsDialog jobType="company" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Owner Operator
                <Badge variant="secondary">Independent</Badge>
              </CardTitle>
              <CardDescription>
                High commission rates with no forced dispatch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Commission</span>
                  <span className="font-semibold">90%+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Annual Potential</span>
                  <span className="font-semibold">$180K-$280K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dispatch</span>
                  <span className="font-semibold">Your Choice</span>
                </div>
              </div>
              <JobDetailsDialog jobType="owner" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pay Rates Tabs Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Compensation Structure</h2>
          <p className="text-gray-600">Detailed breakdown of pay rates and benefits for each position type</p>
        </div>
        <PayRatesTabs />
      </section>

      {/* Testimonials Carousel Section */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What Our Drivers Say</h2>
          <p className="text-gray-600">Real feedback from real drivers in our fleet</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-600 font-semibold">4.8/5 from 75+ drivers</span>
          </div>
        </div>
        <TestimonialsCarousel />
      </section>

      {/* FAQ Accordion Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
          <p className="text-gray-600">Get answers to common questions about working with us</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <FAQAccordion />
          </CardContent>
        </Card>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-blue-600 to-red-600 rounded-xl p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Join Our Team?</h2>
        <p className="text-xl mb-6">Apply now and start earning more in just 60 seconds</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/apply"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors inline-block"
          >
            Start Application →
          </Link>
          <a 
            href="tel:+12067656300"
            className="bg-green-500 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
          >
            📞 Call (206) 765-6300
          </a>
        </div>
      </section>
    </div>
  )
}

