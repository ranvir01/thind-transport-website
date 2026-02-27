"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Phone, TrendingUp, Clock, Gift, ArrowRight } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

interface InlineCTAProps {
  variant?: "default" | "compact" | "banner"
  showStats?: boolean
}

export function InlineCTA({ variant = "default", showStats = true }: InlineCTAProps) {
  if (variant === "compact") {
    return (
      <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Ready to Apply?</div>
              <div className="text-sm text-gray-700 font-medium">Get your $1,500-$2,500 sign-on bonus</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="border-green-600 text-green-600">
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
              <Link href="/apply">
                Apply Now
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (variant === "banner") {
    return (
      <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 text-white border-0 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <Badge className="mb-3 bg-green-400 text-green-900 font-bold shadow-lg">
              <Clock className="h-4 w-4 mr-1" />
              Limited Time
            </Badge>
            <h3 className="text-3xl font-black mb-2">Start Earning This Week</h3>
            <p className="text-white/90 text-lg font-light">Apply today, start next week • Sign-on bonus included</p>
          </div>
          <div className="flex gap-4">
            <Button asChild size="lg" className="h-14 bg-white text-blue-900 hover:bg-gray-50 font-bold shadow-xl hover:scale-105 transition-all rounded-2xl">
              <Link href="/apply">
                <FileText className="h-5 w-5 mr-2" />
                Apply Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-md font-bold rounded-2xl">
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="h-5 w-5 mr-2" />
                {COMPANY_INFO.phone}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 border-2 border-green-200">
      <div className="text-center mb-6">
        <Badge className="mb-3 bg-green-600 text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          Join Our Growing Team
        </Badge>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">
          Ready to Start Your Journey?
        </h3>
        <p className="text-lg text-gray-700 font-medium">
          Apply in 60 seconds and get started earning competitive pay
        </p>
      </div>

      {showStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-black text-green-600">$65K-$250K</div>
            <div className="text-sm text-gray-700 font-semibold">Annual Earnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-blue-600">91%</div>
            <div className="text-sm text-gray-700 font-semibold">O/O Commission</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-green-600">$1K-$2.5K</div>
            <div className="text-sm text-gray-700 font-semibold">Sign-On Bonus</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold">
          <Link href="/apply">
            <FileText className="h-5 w-5 mr-2" />
            Start Application
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 font-semibold">
          <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
            <Phone className="h-5 w-5 mr-2" />
            Call {COMPANY_INFO.phone}
          </Link>
        </Button>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-700 font-medium">
          <Clock className="h-4 w-4" />
          <span>Application takes 60 seconds • Response within 24 hours</span>
        </div>
      </div>
    </Card>
  )
}
