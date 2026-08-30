import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Fuel, TrendingDown, CreditCard, MapPin,
  CheckCircle2, DollarSign, Percent,
  Phone, FileText, Calculator,
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { FuelSavingsCalculator } from "@/components/features/FuelSavingsCalculator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"

const FUEL_LINKS = [
  {
    href: "/pay-rates",
    title: "Pay calculator",
    blurb: "Miles, rate and fuel price in — what a week actually clears, out.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/pay-breakdown",
    title: "Settlement, line by line",
    blurb: "Gross, fuel surcharge, deductions and the number that hits your account.",
    icon: DollarSign,
    kind: "Guide" as const,
  },
  {
    href: "/owner-operators",
    title: "Owner-operator terms",
    blurb: "The 90% split, no forced dispatch, and what we don't deduct.",
    icon: Percent,
    kind: "Page" as const,
  },
  {
    href: "/routes",
    title: "Lanes and fuel stops",
    blurb: "The corridors we run, with distances and transit times.",
    icon: MapPin,
    kind: "Page" as const,
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay on one screen — and it works with no signal.",
    icon: CreditCard,
    kind: "Tool" as const,
  },
  {
    href: "/apply",
    title: "Apply",
    blurb: "About a minute. Card and fuel network access start at orientation.",
    icon: FileText,
    kind: "Form" as const,
  },
]

export const metadata: Metadata = {
  title: "Fuel Card Program | Fleet Diesel Discounts for Owner Operators",
  description:
    "Thind Transport's fuel card program gives owner operators fleet-level diesel discounts at major truck stop chains nationwide, with 100% fuel surcharge pass-through. Run your own gallons through the calculator.",
  alternates: { canonical: "/fuel-program" },
}

export default function FuelProgramPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Fuel Program" category="Drivers" />
      
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 text-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-800/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-2 text-sm font-bold">
              <Fuel className="h-4 w-4 mr-1.5" />
              Fuel Card Program
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Fleet diesel pricing, <span className="text-yellow-300">passed through at cost</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Fleet-level diesel discounts at major truck stop chains nationwide. What it is worth to you depends on your gallons — the calculator below works it out.
            </p>
          </div>
        </div>
      </div>

      <div className="container py-16 -mt-10">
        {/* Key Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card variant="light" className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-green-500/20 group-hover:to-emerald-600/20 transition-colors">
              <TrendingDown className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">Fleet pricing</h3>
            <p className="text-gray-600 leading-relaxed">Our volume discount at the pump, passed through at cost — no markup, no rebate we keep</p>
          </Card>
          
          <Card variant="light" className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-orange-500/20 group-hover:to-orange-600/20 transition-colors">
              <MapPin className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">Major chains</h3>
            <p className="text-gray-600 leading-relaxed">Accepted at the national truck stop chains listed below</p>
          </Card>
          
          <Card variant="light" className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-gold-500/10 to-gold-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-gold-500/20 group-hover:to-gold-600/20 transition-colors">
              <CreditCard className="h-10 w-10 text-gold-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">No Fees</h3>
            <p className="text-gray-600 leading-relaxed">Zero transaction fees or hidden charges</p>
          </Card>
        </div>

        {/* The instrument: the discount, in the visitor's own numbers.
            Replaces a static "500 gal × 40¢ = $10,400" card that was true for
            exactly one truck and nobody else's. */}
        <div className="mb-16">
          <FuelSavingsCalculator />
        </div>

        {/* Program Details */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <Card variant="light" className="p-8 shadow-xl border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 flex items-center justify-center">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Program Features</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Weekly Direct Deposit</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Fuel advances available with settlements every Friday
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">24/7 Support</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Lost card? Need help? We're available around the clock
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Detailed Reporting</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Track fuel expenses, MPG, and generate IFTA reports easily
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Partner Perks</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Additional discounts on tires, maintenance, and truck washes
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div>
            {/* Network Partners */}
            <Card variant="light" className="p-6 shadow-xl border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Accepted Nationwide At:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  "Pilot Flying J",
                  "Love's Travel Stops",
                  "TA-Petro",
                  "Speedway",
                  "Casey's",
                  "Kwik Trip",
                  "Circle K",
                  "Shell",
                  "Ask dispatch for the current network list"
                ].map((partner, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{partner}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <Card variant="light" className="p-10 mb-16 shadow-xl border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-navy to-navy-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                1
              </div>
              <h4 className="font-bold mb-2 text-lg text-gray-900">Apply & Get Approved</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Apply once, with your onboarding paperwork</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-navy to-navy-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                2
              </div>
              <h4 className="font-bold mb-2 text-lg text-gray-900">Receive Your Card</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Your card is mailed once the issuer approves it</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-navy to-navy-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                3
              </div>
              <h4 className="font-bold mb-2 text-lg text-gray-900">Start Saving</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Use at any participating location</p>
            </div>
          </div>
        </Card>

        {/* An unattributable testimonial and a 5-star rating used to sit here.
            TRUST_INDICATORS in src/lib/constants.ts is explicit: verifiable
            indicators only, no invented ratings. The calculator above makes the
            same point with the visitor's own numbers. */}

        {/* CTA Section */}
        <Card className="p-10 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />
          <div className="relative">
          <h2 className="text-3xl font-bold mb-4">
            Start Saving on Fuel Today
          </h2>
          <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
            The card comes with onboarding, and the discount is passed through at cost.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="bg-none bg-white text-orange-600 shadow-none hover:bg-gray-100" asChild>
              <Link href="/apply">
                <FileText className="h-5 w-5 mr-2" />
                Apply Now
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10" 
              asChild
            >
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="h-5 w-5 mr-2" />
                Call {COMPANY_INFO.phone}
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-white/95">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span>No Hidden Fees</span>
            </div>
          </div>
          </div>
        </Card>
      </div>

      <RelatedLinks
        title="The rest of the money picture"
        intro="Fuel is one line on the settlement. Here's every other line, and the tools behind them."
        links={FUEL_LINKS}
      />
    </div>
  )
}
