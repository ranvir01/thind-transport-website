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
import { PageHero } from "@/components/shared/PageHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: `Pay Rates - 90% O/O Split, ${PAY_RATES.companyDriver.regional.perMile}/mi Company | ${COMPANY_INFO.name}`,
  description: `Transparent trucking pay: Owner Operators keep 90% gross (${PAY_RATES.ownerOperator.annualGross}/year). Company Drivers ${PAY_RATES.companyDriver.regional.perMile}/mi (${PAY_RATES.companyDriver.regional.annual}/year). Weekly pay, no hidden fees.`,
  keywords: [
    "truck driver pay rates",
    "owner operator commission",
    "CDL driver salary",
    "trucking company pay",
    "90 percent trucking",
    "truck driver weekly pay",
    "OTR driver income",
    "flatbed driver pay",
    "reefer driver pay",
  ],
  openGraph: {
    title: `Truck Driver Pay Rates - 90% O/O | ${COMPANY_INFO.name}`,
    description: `Owner Operators: 90% gross. Company Drivers: ${PAY_RATES.companyDriver.regional.perMile}/mi. No hidden fees. Weekly pay. See exactly what you'll earn.`,
    url: "https://thindtransport.com/pay-rates",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Truck Driver Pay Rates | ${COMPANY_INFO.name}`,
    description: `90% commission for O/O • ${PAY_RATES.companyDriver.regional.perMile}/mi for company • Weekly pay • No hidden fees`,
  },
  alternates: {
    canonical: "https://thindtransport.com/pay-rates",
  },
}

export default function PayRatesPage() {
  return (
    <div className="brand-page-shell min-h-screen">
      <PageBreadcrumb pageName="Pay Rates" category="Drivers" />
      
      {/* Enhanced Hero Section */}
      <PageHero
        image="/images/generated/truck-night-highway.webp"
        imageAlt="Thind Transport truck running a night lane outside Seattle"
        eyebrow="What We Actually Pay"
        title={
          <>
            Transparent <span className="text-orange">Pay Rates</span>
          </>
        }
        description="No hidden fees. No surprises. Just straightforward, competitive pay — 90% split for owner-operators, $0.63/mile for company drivers."
        primaryLabel="See What You'd Earn"
        primaryHref="/#calculator"
      />

      {/* Position Cards */}
      <section className="py-16 -mt-8">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#17181B] text-white px-4 py-2 text-xs font-bold">
              Open Positions
            </Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Choose Your Driving Career Path
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto font-medium">
              Whether you prefer the stability of company driving or the independence of being an owner-operator, we have the perfect opportunity for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-blue-100 group hover:border-blue-200 hover:-translate-y-1" data-light>
              <CardHeader className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 py-8 border-b-2 border-blue-100">
                <CardTitle className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17181B]/10 to-blue-600/10 flex items-center justify-center border border-blue-100">
                      <Shield className="h-6 w-6 text-[#17181B]" />
                    </div>
                    <span className="text-xl font-black text-gray-900">Company Driver</span>
                  </div>
                  <Badge className="bg-[#17181B] text-white px-3 py-1 font-bold">Full-Time</Badge>
                </CardTitle>
                <CardDescription className="text-base text-gray-700 font-medium">
                  Competitive pay, excellent benefits, and flexible routes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-[#17181B]" />
                      <span className="text-sm font-medium text-gray-700">Annual Salary</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.companyDriver.regional.annual}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-[#17181B]" />
                      <span className="text-sm font-medium text-gray-700">Per Mile</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">{PAY_RATES.companyDriver.regional.perMile}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-[#17181B]" />
                      <span className="text-sm font-medium text-gray-700">Home Time</span>
                    </div>
                    <span className="font-black text-xl text-gray-900">Flexible</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-[#17181B]" />
                      <span className="text-sm font-medium text-gray-700">Start Date</span>
                    </div>
                    <span className="font-black text-xl text-orange-400">Immediate</span>
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

            <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-orange-100 group hover:border-orange-200 hover:-translate-y-1" data-light>
              <CardHeader className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 py-8 border-b-2 border-orange-100">
                <CardTitle className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 flex items-center justify-center border border-orange-100">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-xl font-black text-gray-900">Owner Operator</span>
                  </div>
                  <Badge className="bg-[#17181B] text-white px-3 py-1 font-bold">Independent</Badge>
                </CardTitle>
                <CardDescription className="text-base text-gray-700 font-medium">
                  Highest earning potential with 90% commission
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
              <Badge className="mb-4 bg-[#17181B] text-white px-4 py-2 text-xs font-bold">
                Visual Analytics
              </Badge>
              <h2 className="text-4xl font-black text-gray-900 mb-4">
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

      <RelatedLinks
        title="The rest of the money picture"
        intro="Where the money goes after the calculator, and the records behind it."
        links={driverLinks(["/pay-rates"])}
      />
    </div>
  )
}
