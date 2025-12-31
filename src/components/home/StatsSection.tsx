"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, DollarSign, Percent, Clock, 
  Fuel, Shield, Home, Calendar, ArrowRight,
  CheckCircle2
} from "lucide-react"
import { PAY_RATES } from "@/lib/constants"

export function StatsSection() {
  // Calculate weekly and monthly earnings
  const ownerOperatorWeekly = Math.round((150000 + 250000) / 2 / 52)
  const companyDriverWeekly = Math.round((65000 + 95000) / 2 / 52)
  
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700">
            <DollarSign className="h-3 w-3 mr-1" />
            Driver Earnings Dashboard
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Your Earning Potential at Thind Transport
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare pay rates, understand your take-home, and see how much you can earn
          </p>
        </div>

        {/* Main Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Owner Operator Card */}
          <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Owner Operator</h3>
              <Badge className="bg-green-600 text-white">Best Rates</Badge>
            </div>

            {/* Annual Earnings */}
            <div className="mb-6 p-4 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Annual Earnings</div>
              <div className="text-4xl font-black text-green-600 mb-2">
                {PAY_RATES.ownerOperator.annualGross}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Average: $200K/year</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Percent className="h-4 w-4" />
                  <span className="text-xs">Commission</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{PAY_RATES.ownerOperator.commission}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Per Mile</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{PAY_RATES.ownerOperator.perMile}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Weekly Avg</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">${ownerOperatorWeekly.toLocaleString()}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Fuel className="h-4 w-4" />
                  <span className="text-xs">Fuel Surcharge</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{PAY_RATES.ownerOperator.fuelSurcharge}</div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Sign-on bonus: {PAY_RATES.ownerOperator.signOnBonus}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>No forced dispatch - choose your loads</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Weekly settlements - Every Friday</span>
              </div>
            </div>

            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link href="/apply?type=owner">
                Apply as Owner Operator
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>

          {/* Company Driver Card */}
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Company Driver</h3>
              <Badge className="bg-blue-600 text-white">Benefits Included</Badge>
            </div>

            {/* Annual Earnings */}
            <div className="mb-6 p-4 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Annual Earnings</div>
              <div className="text-4xl font-black text-blue-600 mb-2">
                $78K-$110K
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>Average: $80K/year</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Per Mile</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">$0.60-$0.65</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Weekly Avg</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">${companyDriverWeekly.toLocaleString()}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Home className="h-4 w-4" />
                  <span className="text-xs">Home Time</span>
                </div>
                <div className="text-lg font-bold text-gray-900">Flexible</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs">Benefits</span>
                </div>
                <div className="text-lg font-bold text-gray-900">Included</div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Sign-on bonus: {PAY_RATES.companyDriver.signOnBonus}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Weekly direct deposit - Every Friday</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Local, Regional, & OTR options</span>
              </div>
            </div>

            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link href="/apply?type=company">
                Apply as Company Driver
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        </div>

        {/* Additional Value Sections */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Fuel Savings */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-bold text-gray-900">Fuel Program</h4>
            </div>
            <div className="text-3xl font-black text-orange-600 mb-2">
              $10,400/yr
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Average savings with our fuel card program at participating locations
            </p>
            <Link href="/fuel-program" className="text-blue-600 hover:underline text-sm font-semibold">
              Learn more →
            </Link>
          </Card>

          {/* Weekly Settlements */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900">Weekly Pay</h4>
            </div>
            <div className="text-3xl font-black text-green-600 mb-2">
              Every Friday
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Guaranteed weekly settlements with transparent pay statements
            </p>
            <Link href="/pay-rates" className="text-blue-600 hover:underline text-sm font-semibold">
              Pay calculator →
            </Link>
          </Card>

          {/* No Hidden Fees */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">Transparent</h4>
            </div>
            <div className="text-3xl font-black text-blue-600 mb-2">
              0 Fees
            </div>
            <p className="text-sm text-gray-600 mb-4">
              No hidden fees, no deductions. What you earn is what you get
            </p>
            <Link href="/testimonials" className="text-blue-600 hover:underline text-sm font-semibold">
              See reviews →
            </Link>
          </Card>
        </div>

        {/* CTA Banner */}
        <Card className="p-8 bg-gradient-to-r from-blue-600 to-green-600 text-white text-center border-0">
          <h3 className="text-2xl font-bold mb-4 text-white">
            Ready to Start Earning More?
          </h3>
          <p className="text-lg mb-6 text-white/95 max-w-2xl mx-auto">
            Use our interactive pay calculator to see your exact earnings potential based on your experience and route preferences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-lg" asChild>
              <Link href="/pay-rates">
                <DollarSign className="h-5 w-5 mr-2" />
                Calculate Your Pay
              </Link>
            </Button>
            <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white border-2 border-white/30 font-semibold shadow-lg" asChild>
              <Link href="/apply">
                Apply Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  )
}

