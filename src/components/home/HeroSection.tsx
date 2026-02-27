import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Award,
  BadgeCheck,
} from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"

export function HeroSection() {
  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline & CTA */}
          <div>
            {/* Urgency Badge */}
            <div className="mb-4">
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2">
                ⚡ IMMEDIATE OPENINGS • APPLY TODAY
              </Badge>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
              Hiring <span className="text-[#001F3F]">CDL Drivers</span> Nationwide
              <br />
              <span className="text-[#E68600]">$65K-$95K/Year</span>
            </h1>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-lg p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#001F3F] mb-1">📦 Company Drivers:</p>
                  <p className="text-gray-700">$78K-$110K/year • $0.60-$0.65/mile</p>
                </div>
                <div>
                  <p className="font-semibold text-[#001F3F] mb-1">🚛 Owner Operators:</p>
                  <p className="text-gray-700">91% Commission • $180K-$280K/year</p>
                </div>
              </div>
            </div>

            <p className="text-lg text-gray-700 mb-6 font-medium">
              Based in Kent, WA • Hiring drivers from all 48 states • Flatbed, Reefer, Dry Van
            </p>

            {/* Social Proof */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>
                  <span className="font-bold" id="applicantsToday">
                    12
                  </span>{" "}
                  drivers applied today
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-700 font-medium">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{STATS.yearsInBusiness}+ years in business</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-[#001F3F]" />
                  <span>DOT Compliant</span>
                </div>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {["$1,000 Sign-On Bonus", "91% O/O Rate", "Weekly Pay", "Flexible Home Time", "Flatbed/Reefer/Dry Van", "Fast Growing Fleet"].map(
                (benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold">{benefit}</span>
                  </div>
                )
              )}
            </div>

            {/* Primary CTA */}
            <div className="space-y-3">
              <Button asChild className="hero-cta-button w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-none">
                <Link href="/apply">
                  <FileText className="mr-2 h-5 w-5" />
                  Apply Now - Takes 60 Seconds
                </Link>
              </Button>
              <div className="flex items-center justify-center gap-4 text-sm">
                <Link
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="text-[#001F3F] font-semibold hover:underline flex items-center gap-1"
                >
                  <Phone className="h-4 w-4" />
                  {COMPANY_INFO.phone}
                </Link>
                <span className="text-gray-400">•</span>
                <span className="text-gray-700 font-medium">Available 24/7</span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  FMCSA Certified
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#001F3F]" />
                  DOT Compliant
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  A+ Safety Rating
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual Proof */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="relative h-64 mb-4 rounded-lg overflow-hidden">
                <Image
                  src="/images/generated/fleet-kent-wa.png"
                  alt="Thind Transport Fleet"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Live Stats Card */}
              <div className="gradient-brand text-white rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{STATS.activeDrivers}+</div>
                    <div className="text-xs opacity-90">Drivers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{STATS.trucksInFleet}+</div>
                    <div className="text-xs opacity-90">Trucks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{STATS.yearsInBusiness}</div>
                    <div className="text-xs opacity-90">Years</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Trust Badge */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white rounded-full p-3 shadow-lg">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
