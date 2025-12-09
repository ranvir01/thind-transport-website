import { Metadata } from "next"
import { PayCalculator } from "@/components/features/PayCalculator"
import { PayRateVisualizations } from "@/components/features/PayRateVisualizations"
import { JobDetailsDialog } from "@/components/features/JobDetailsDialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, TrendingUp, Calendar, Shield, 
  Fuel, Home, CheckCircle2, Percent
} from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `Pay Rates - 91% O/O Split, ${PAY_RATES.companyDriver.regional.perMile}/mi Company | ${COMPANY_INFO.name}`,
  description: `Transparent trucking pay: Owner Operators keep 91% gross (${PAY_RATES.ownerOperator.annualGross}/year). Company Drivers ${PAY_RATES.companyDriver.regional.perMile}/mi (${PAY_RATES.companyDriver.regional.annual}/year). Weekly pay, no hidden fees.`,
  keywords: [
    "truck driver pay rates",
    "owner operator commission",
    "CDL driver salary",
    "trucking company pay",
    "91 percent trucking",
    "truck driver weekly pay",
    "OTR driver income",
    "flatbed driver pay",
    "reefer driver pay",
  ],
  openGraph: {
    title: `Truck Driver Pay Rates - 91% O/O | ${COMPANY_INFO.name}`,
    description: `Owner Operators: 91% gross. Company Drivers: ${PAY_RATES.companyDriver.regional.perMile}/mi. No hidden fees. Weekly pay. See exactly what you'll earn.`,
    url: "https://thindtransport.com/pay-rates",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Truck Driver Pay Rates | ${COMPANY_INFO.name}`,
    description: `91% commission for O/O • ${PAY_RATES.companyDriver.regional.perMile}/mi for company • Weekly pay • No hidden fees`,
  },
  alternates: {
    canonical: "https://thindtransport.com/pay-rates",
  },
}

export default function PayRatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Pay Rates" category="Drivers" />
      
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#001F3F] via-[#003366] to-[#001F3F] text-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/10 backdrop-blur-md text-white border-white/20 px-5 py-2.5 text-sm font-bold">
              <DollarSign className="h-4 w-4 mr-1.5 inline text-orange-400" />
              Industry-Leading Compensation
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Transparent <span className="text-orange-400">Pay Rates</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              No hidden fees. No surprises. Just straightforward, competitive pay that rewards your hard work.
            </p>
          </div>
        </div>
      </section>

      {/* Position Cards */}
      <section className="py-16 -mt-8">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#001F3F] text-white px-4 py-2 text-xs font-bold">
              Open Positions
            </Badge>
            <h2 className="text-4xl font-black text-[#001F3F] mb-4">
              Choose Your Driving Career Path
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto font-medium">
              Whether you prefer the stability of company driving or the independence of being an owner-operator, we have the perfect opportunity for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-blue-100 group hover:border-blue-200 hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 py-8 border-b-2 border-blue-100">
                <CardTitle className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#001F3F]/10 to-blue-600/10 flex items-center justify-center border border-blue-100">
                      <Shield className="h-6 w-6 text-[#001F3F]" />
                    </div>
                    <span className="text-xl font-black text-[#001F3F]">Company Driver</span>
                  </div>
                  <Badge className="bg-[#001F3F] text-white px-3 py-1 font-bold">Full-Time</Badge>
                </CardTitle>
                <CardDescription className="text-base text-gray-700 font-medium">
                  Competitive pay, excellent benefits, and flexible routes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-[#001F3F]" />
                      <span className="text-sm font-medium text-gray-700">Annual Salary</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.companyDriver.regional.annual}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-[#001F3F]" />
                      <span className="text-sm font-medium text-gray-700">Per Mile</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.companyDriver.regional.perMile}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-[#001F3F]" />
                      <span className="text-sm font-medium text-gray-700">Home Time</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">Flexible</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-[#001F3F]" />
                      <span className="text-sm font-medium text-gray-700">Start Date</span>
                    </div>
                    <span className="font-black text-xl text-green-600">Immediate</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">{PAY_RATES.companyDriver.signOnBonus}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">Weekly direct deposit - Every Friday</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">Full benefits package included</span>
                  </div>
                </div>

                <JobDetailsDialog jobType="company" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-orange-100 group hover:border-orange-200 hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 py-8 border-b-2 border-orange-100">
                <CardTitle className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 flex items-center justify-center border border-orange-100">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-xl font-black text-[#001F3F]">Owner Operator</span>
                  </div>
                  <Badge className="bg-[#001F3F] text-white px-3 py-1 font-bold">Independent</Badge>
                </CardTitle>
                <CardDescription className="text-base text-gray-700 font-medium">
                  Highest earning potential with 91% commission
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:from-orange-50 hover:to-amber-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Percent className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Commission</span>
                    </div>
                    <span className="font-black text-xl text-orange-700">{PAY_RATES.ownerOperator.commission}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:from-orange-50 hover:to-amber-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Annual Potential</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.ownerOperator.annualGross}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:from-orange-50 hover:to-amber-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Per Mile</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.ownerOperator.perMile}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:from-orange-50 hover:to-amber-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Fuel className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Fuel Surcharge</span>
                    </div>
                    <span className="font-black text-xl text-orange-700">{PAY_RATES.ownerOperator.fuelSurcharge}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">Sign-on bonus: {PAY_RATES.ownerOperator.signOnBonus}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">No forced dispatch - choose your loads</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-gray-800 font-medium">Weekly settlements - Every Friday</span>
                  </div>
                </div>

                <JobDetailsDialog jobType="owner" />
              </CardContent>
            </Card>
          </div>

          {/* Interactive Pay Calculator */}
          <section className="mt-16">
            <PayCalculator />
          </section>

          {/* Pay Rate Visualizations */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-[#001F3F] text-white px-4 py-2 text-xs font-bold">
                Visual Analytics
              </Badge>
              <h2 className="text-4xl font-black text-[#001F3F] mb-4">
                See Your Earning Potential
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto font-medium">
                Interactive charts and real-time calculations showing exactly what you can earn
              </p>
            </div>
            <PayRateVisualizations />
          </section>
        </div>
      </section>
    </div>
  )
}
